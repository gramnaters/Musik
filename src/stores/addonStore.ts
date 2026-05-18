import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  InstalledAddon,
  AddonManifest,
  AddonSearchResults,
  AddonTrack,
  normalizeAddonTrack,
  type AddonSource,
} from '@/types/addon';
import {
  runBareEightspineModule,
  runEightspineModule,
  pickStreamUrlFromEightspineResult,
} from '@/lib/eightspine-runtime';
import {
  baseUrlFromSuccessfulManifestUrl,
  isEightspinePackageUrl,
  manifestUrlCandidates,
} from '@/lib/manifest-url';
import { resolveAssetUrl } from '@/lib/resolve-asset-url';
import { useStreamingStore } from '@/stores/streamingStore';

export const BUILTIN_ECLIPSE_SOURCE_ID = 'eclipse';

export type FetchManifestResult = {
  manifest: AddonManifest;
  eightspineInnerCode?: string;
  eightspineKind?: 'wrapped' | 'bare';
};

const eightspineApiCache = new Map<string, Record<string, unknown>>();

async function getEightspineApi(installed: InstalledAddon): Promise<Record<string, unknown>> {
  const key = installed.manifest.id;
  const hit = eightspineApiCache.get(key);
  if (hit) return hit;
  if (!installed.eightspineInnerCode) {
    throw new Error('Missing 8SPINE module body');
  }
  const kind = installed.eightspineKind ?? 'wrapped';
  const src = installed.eightspineInnerCode;
  const api =
    kind === 'bare'
      ? await runBareEightspineModule(src)
      : await runEightspineModule(src);
  eightspineApiCache.set(key, api);
  return api;
}

const DEFAULT_SOURCES: AddonSource[] = [
  {
    id: BUILTIN_ECLIPSE_SOURCE_ID,
    name: 'Eclipse Music Store',
    registryUrl: '',
    builtIn: true,
  },
  {
    id: 'monochrome-instances',
    name: 'Monochrome Instances',
    registryUrl: '', // Static custom catalog handling
    builtIn: true,
  },
  {
    id: 'monochrome-modules',
    name: 'Monochrome Modules',
    registryUrl: 'https://raw.githubusercontent.com/monochrometf/monochrome/main/modules/index.json',
    builtIn: true,
  },
  {
    id: 'ricky-source',
    name: 'Ricky Cyrus (AIO)',
    registryUrl: 'https://all-in-one.cyrusna29.workers.dev/8spine-source.json',
    builtIn: true,
  },
  {
    id: 'doc-source',
    name: 'Doc\'s Modules',
    registryUrl: 'https://raw.githubusercontent.com/DocSavage-8spine/modules/main/index.json',
    builtIn: true,
  },
  {
    id: '8spine-official',
    name: '8SPINE Official',
    registryUrl: 'https://8spine.club/index.json',
    builtIn: true,
  }
];


interface AddonState {
  addons: InstalledAddon[];
  sources: AddonSource[];
  /** Built-in or custom catalog rows the user hid from the list (still restorable). */
  hiddenModuleSourceIds: string[];
  activeAddonId: string | null;
  /** Try order for stream fallback + optional home feed (search-capable modules only). */
  playbackPriorityIds: string[];
  isSearching: boolean;
  searchResults: AddonSearchResults;
  error: string | null;
}

interface AddonActions {
  addAddon: (
    manifest: AddonManifest,
    opts?: {
      sourceId?: string;
      installSourceUrl?: string;
      eightspineInnerCode?: string;
      eightspineKind?: 'wrapped' | 'bare';
    }
  ) => void;
  addSource: (name: string, registryUrl: string) => void;
  removeSource: (id: string) => void;
  /** Hide a catalog source from the UI and from bulk fetch (built-in or custom). */
  dismissModuleSource: (id: string) => void;
  restoreAllModuleSources: () => void;
  removeAddon: (id: string) => void;
  toggleAddon: (id: string) => void;
  setActiveAddon: (id: string) => void;
  fetchManifest: (url: string) => Promise<FetchManifestResult>;
  search: (query: string) => Promise<AddonSearchResults>;
  /** Temporarily targets an addon for one search, then restores the previous active addon id. */
  searchWithAddon: (addonId: string, query: string) => Promise<AddonSearchResults>;
  resolveStreamUrl: (track: AddonTrack) => Promise<string>;
  getAlbumTracks: (albumId: string) => Promise<AddonTrack[]>;
  getArtistDetail: (artistId: string) => Promise<{ artist: any; tracks: AddonTrack[] } | null>;
  getPlaylistTracks: (playlistId: string) => Promise<AddonTrack[]>;
  getAlbumTracksForAddon: (addonId: string, albumId: string) => Promise<AddonTrack[]>;
  getPlaylistTracksForAddon: (addonId: string, playlistId: string) => Promise<AddonTrack[]>;
  getArtistTracksForAddon: (addonId: string, artistId: string) => Promise<AddonTrack[]>;
  getHome: () => Promise<AddonSearchResults | null>;
  clearError: () => void;
  clearAddonSearchCache: () => void;
  /** Enabled search modules: custom order first, then any not listed. */
  getPlaybackOrderedSearchAddonIds: () => string[];
  movePlaybackPriority: (addonId: string, delta: -1 | 1) => void;
  cleanupBrokenAddons: () => void;
}


export const useAddonStore = create<AddonState & AddonActions>()(
  persist(
    (set, get) => ({
      addons: [],
      sources: DEFAULT_SOURCES,
      hiddenModuleSourceIds: [],
      activeAddonId: null,
      playbackPriorityIds: [],
      isSearching: false,
      searchResults: { tracks: [], albums: [], artists: [], playlists: [] },
      error: null,

      addSource: (name: string, registryUrl: string) => {
        const trimmed = registryUrl.trim();
        if (!name.trim() || !trimmed) return;
        const id = `src-${Date.now().toString(36)}`;
        set({ sources: [...get().sources, { id, name: name.trim(), registryUrl: trimmed }] });
      },

      removeSource: (id: string) => {
        const { sources, addons } = get();
        const target = sources.find((s) => s.id === id);
        if (!target || target.builtIn) return;
        set({
          sources: sources.filter((s) => s.id !== id),
          addons: addons.map((a) => (a.sourceId === id ? { ...a, sourceId: 'custom' } : a)),
          hiddenModuleSourceIds: get().hiddenModuleSourceIds.filter((x) => x !== id),
        });
      },

      dismissModuleSource: (id: string) => {
        const { hiddenModuleSourceIds } = get();
        if (hiddenModuleSourceIds.includes(id)) return;
        set({ hiddenModuleSourceIds: [...hiddenModuleSourceIds, id] });
      },

      restoreAllModuleSources: () => set({ hiddenModuleSourceIds: [] }),

      addAddon: (
        manifest: AddonManifest,
        opts?: {
          sourceId?: string;
          installSourceUrl?: string;
          eightspineInnerCode?: string;
          eightspineKind?: 'wrapped' | 'bare';
        }
      ) => {
        const sourceId = opts?.sourceId ?? 'custom';
        const inner = opts?.eightspineInnerCode;
        const kindOpt = opts?.eightspineKind;
        const installSrc = opts?.installSourceUrl?.trim();
        
        eightspineApiCache.delete(manifest.id);

        set((state) => {
          const exists = state.addons.find((a) => a.manifest.id === manifest.id);
          
          if (exists) {
            return {
              addons: state.addons.map((a) => {
                if (a.manifest.id !== manifest.id) return a;
                let nextEight = a.eightspineInnerCode;
                let nextKind = a.eightspineKind;
                if (inner !== undefined) {
                  nextEight = inner || undefined;
                  nextKind = kindOpt ?? a.eightspineKind;
                } else if (manifest.baseURL) {
                  nextEight = undefined;
                  nextKind = undefined;
                }
                return {
                  ...a,
                  enabled: true,
                  manifest,
                  sourceId: opts?.sourceId ?? a.sourceId,
                  ...(installSrc ? { installSourceUrl: installSrc } : {}),
                  eightspineInnerCode: nextEight,
                  eightspineKind: nextKind,
                };
              }),
              playbackPriorityIds:
                manifest.resources?.includes('search') && !state.playbackPriorityIds.includes(manifest.id)
                  ? [...state.playbackPriorityIds, manifest.id]
                  : state.playbackPriorityIds,
            };
          }

          const newAddon: InstalledAddon = {
            manifest,
            enabled: true,
            installedAt: Date.now(),
            sourceId,
            ...(installSrc ? { installSourceUrl: installSrc } : {}),
            ...(inner !== undefined ? { eightspineInnerCode: inner || undefined } : {}),
            ...(kindOpt ? { eightspineKind: kindOpt } : {}),
          };

          return {
            addons: [...state.addons, newAddon],
            activeAddonId: state.activeAddonId || manifest.id,
            playbackPriorityIds:
              manifest.resources?.includes('search') && !state.playbackPriorityIds.includes(manifest.id)
                ? [...state.playbackPriorityIds, manifest.id]
                : state.playbackPriorityIds,
          };
        });
      },

      removeAddon: (id: string) => {
        eightspineApiCache.delete(id);
        const { addons, activeAddonId } = get();
        const newAddons = addons.filter((a) => a.manifest.id !== id);
        let newActiveId = activeAddonId;
        if (activeAddonId === id) {
          const searchCapable = newAddons.find((a) => a.enabled && a.manifest.resources?.includes('search'));
          newActiveId = searchCapable?.manifest.id || (newAddons.length > 0 ? newAddons[0].manifest.id : null);
        }
        set({
          addons: newAddons,
          activeAddonId: newActiveId,
          playbackPriorityIds: get().playbackPriorityIds.filter((x) => x !== id),
          searchResults: { tracks: [], albums: [], artists: [], playlists: [] },
          isSearching: false,
          error: null,
        });
      },

      toggleAddon: (id: string) => {
        const { addons, activeAddonId } = get();
        const newAddons = addons.map((a) =>
          a.manifest.id === id ? { ...a, enabled: !a.enabled } : a
        );
        let newActiveId = activeAddonId;
        if (id === activeAddonId) {
          const toggled = newAddons.find((a) => a.manifest.id === id);
          if (toggled && !toggled.enabled) {
            const searchCapable = newAddons.find((a) => a.enabled && a.manifest.resources?.includes('search'));
            newActiveId = searchCapable?.manifest.id || null;
          }
        }
        set({ addons: newAddons, activeAddonId: newActiveId });
      },

      cleanupBrokenAddons: () => {
        const { addons, activeAddonId } = get();
        const initialCount = addons.length;
        const validAddons = addons.filter(
          (a) => a.manifest && a.manifest.id && a.manifest.name && a.manifest.id.trim() !== ''
        );
        
        if (validAddons.length !== initialCount) {
          console.log(`[AddonStore] Cleaned up ${initialCount - validAddons.length} broken addons`);
          let nextActiveId = activeAddonId;
          if (activeAddonId && !validAddons.find(a => a.manifest.id === activeAddonId)) {
            nextActiveId = validAddons[0]?.manifest.id || null;
          }
          set({ 
            addons: validAddons,
            activeAddonId: nextActiveId,
            playbackPriorityIds: get().playbackPriorityIds.filter(id => validAddons.find(a => a.manifest.id === id))
          });
        }
      },


      setActiveAddon: (id: string) => {
        const { addons } = get();
        if (addons.find((a) => a.manifest.id === id && a.enabled)) {
          set({ activeAddonId: id });
        }
      },

      fetchManifest: async (url: string): Promise<FetchManifestResult> => {
        try {
          const trimmed = url.trim();
          if (!trimmed) throw new Error('Empty URL');

          if (isEightspinePackageUrl(trimmed)) {
            const res = await fetch('/api/addons/eightspine-install', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: trimmed }),
            });
            const json = (await res.json().catch(() => null)) as {
              manifest?: AddonManifest;
              eightspineInnerCode?: string;
              eightspineKind?: 'wrapped' | 'bare';
              error?: string;
            } | null;
            if (!res.ok || !json?.manifest?.id || !json.eightspineInnerCode || !json.eightspineKind) {
              throw new Error(json?.error || `8SPINE install failed (HTTP ${res.status})`);
            }
            return {
              manifest: json.manifest,
              eightspineInnerCode: json.eightspineInnerCode,
              eightspineKind: json.eightspineKind,
            };
          }

          const candidates = manifestUrlCandidates(trimmed);
          let lastStatus = 0;
          for (const manifestUrl of candidates) {
            const proxyUrl = `/api/addons/proxy?url=${encodeURIComponent(manifestUrl)}`;
            const res = await fetch(proxyUrl);
            lastStatus = res.status;
            if (!res.ok) continue;

            const raw: Record<string, unknown> | null = await res.json().catch(() => null);
            if (!raw || typeof raw !== 'object') continue;

            const id = String(raw.id ?? '');
            const name = String(raw.name ?? '');
            const version = String(raw.version ?? '');
            const resources = raw.resources;
            if (!id || !name || !version || !Array.isArray(resources)) continue;

            const baseURL = baseUrlFromSuccessfulManifestUrl(manifestUrl);
            const rawIcon = raw.icon ? String(raw.icon) : undefined;
            const manifest: AddonManifest = {
              id,
              name,
              version,
              description: raw.description ? String(raw.description) : undefined,
              author: raw.author ? String(raw.author) : undefined,
              icon: resolveAssetUrl(rawIcon, baseURL) ?? rawIcon,
              contentType: raw.contentType ? String(raw.contentType) : undefined,
              types: Array.isArray(raw.types) ? raw.types.map(String) : undefined,
              resources: resources.map(String),
              baseURL,
            };
            return { manifest };
          }

          const setupRes = await fetch(
            `/api/addons/eclipse-setup?url=${encodeURIComponent(trimmed)}`
          );
          const setupJson = (await setupRes.json().catch(() => null)) as {
            manifest?: AddonManifest;
            error?: string;
          } | null;
          if (
            setupRes.ok &&
            setupJson?.manifest?.id &&
            typeof setupJson.manifest.baseURL === 'string'
          ) {
            return { manifest: setupJson.manifest };
          }
          const setupDetail = setupJson?.error || '';

          throw new Error(
            lastStatus
              ? `Failed to fetch manifest (HTTP ${lastStatus})${setupDetail ? ` — ${setupDetail}` : ''}`
              : `Could not load manifest${setupDetail ? ` — ${setupDetail}` : ' — tried direct URLs and POST /generate'}`
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to fetch manifest';
          set({ error: message });
          throw err;
        }
      },

      search: async (query: string): Promise<AddonSearchResults> => {
        const { addons, activeAddonId } = get();
        
        if (!activeAddonId || !query.trim()) {
          set({ searchResults: { tracks: [], albums: [], artists: [], playlists: [] } });
          return { tracks: [], albums: [], artists: [], playlists: [] };
        }

        const addon = addons.find((a) => a.manifest.id === activeAddonId && a.enabled);
        if (!addon) {
          set({ searchResults: { tracks: [], albums: [], artists: [], playlists: [] } });
          return { tracks: [], albums: [], artists: [], playlists: [] };
        }

        set({ isSearching: true, error: null });

        try {
          const baseURL = addon.manifest.baseURL || '';

          if (addon.eightspineInnerCode) {
            const api = await getEightspineApi(addon);
            const searchTracks = api.searchTracks as Function | undefined;
            if (typeof searchTracks !== 'function') {
              throw new Error('8SPINE module has no searchTracks()');
            }
            const ctx = { settings: {} };
            const rawOut =
              searchTracks.length >= 3
                ? await searchTracks(query.trim(), 40, ctx)
                : await searchTracks(query.trim(), 40);
            const payload: Record<string, unknown> = Array.isArray(rawOut)
              ? { tracks: rawOut }
              : ((rawOut ?? {}) as Record<string, unknown>);

            const rawTracks = payload.tracks;
            const tracks: AddonTrack[] = Array.isArray(rawTracks)
              ? rawTracks.map((t: Record<string, unknown>) =>
                  normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, baseURL)
                )
              : [];

            const rawAlbums = payload.albums;
            const albums = Array.isArray(rawAlbums)
              ? rawAlbums.map((a: Record<string, unknown>) => ({
                  id: String(a.id ?? ''),
                  name: a.name ? String(a.name) : a.title ? String(a.title) : undefined,
                  title: a.title ? String(a.title) : a.name ? String(a.name) : undefined,
                  artist: a.artist ? String(a.artist) : a.artistName ? String(a.artistName) : undefined,
                  artworkURL: a.artworkURL
                    ? String(a.artworkURL)
                    : a.cover
                      ? String(a.cover)
                      : a.image
                        ? String(a.image)
                        : undefined,
                  cover: a.artworkURL
                    ? String(a.artworkURL)
                    : a.cover
                      ? String(a.cover)
                      : a.image
                        ? String(a.image)
                        : undefined,
                  trackCount:
                    typeof a.trackCount === 'number'
                      ? a.trackCount
                      : a.numberOfTracks
                        ? parseInt(String(a.numberOfTracks), 10) || undefined
                        : undefined,
                  year: a.year ? String(a.year) : undefined,
                  addonId: addon.manifest.id,
                }))
              : [];

            const rawArtists = payload.artists;
            const artists = Array.isArray(rawArtists)
              ? rawArtists.map((a: Record<string, unknown>) => ({
                  id: String(a.id ?? ''),
                  name: String(a.name ?? 'Unknown Artist'),
                  image: a.artworkURL ? String(a.artworkURL) : a.image ? String(a.image) : undefined,
                  artworkURL: a.artworkURL ? String(a.artworkURL) : a.image ? String(a.image) : undefined,
                  genres: Array.isArray(a.genres) ? a.genres.map(String) : undefined,
                }))
              : [];

            const results: AddonSearchResults = { tracks, albums, artists, playlists: [] };

            set((state) => ({
              addons: state.addons.map((a) =>
                a.manifest.id === activeAddonId ? { ...a, lastUsed: Date.now() } : a
              ),
              searchResults: results,
              isSearching: false,
            }));

            return results;
          }

          const searchUrl = `${baseURL}/search?q=${encodeURIComponent(query)}`;
          const proxyUrl = `/api/addons/proxy?url=${encodeURIComponent(searchUrl)}`;

          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`Search failed: ${res.status}`);

          const raw: Record<string, unknown> = await res.json();

          // Parse tracks with field normalization
          const tracks: AddonTrack[] = Array.isArray(raw.tracks)
            ? raw.tracks.map((t: Record<string, unknown>) =>
                normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, baseURL)
              )
            : [];

          // Parse albums
          const albums = Array.isArray(raw.albums)
            ? raw.albums.map((a: Record<string, unknown>) => ({
                id: String(a.id ?? ''),
                name: a.name ? String(a.name) : a.title ? String(a.title) : undefined,
                title: a.title ? String(a.title) : a.name ? String(a.name) : undefined,
                artist: a.artist ? String(a.artist) : a.artistName ? String(a.artistName) : undefined,
                artworkURL: a.artworkURL ? String(a.artworkURL) : a.cover ? String(a.cover) : a.image ? String(a.image) : undefined,
                cover: a.artworkURL ? String(a.artworkURL) : a.cover ? String(a.cover) : a.image ? String(a.image) : undefined,
                trackCount: typeof a.trackCount === 'number' ? a.trackCount : a.numberOfTracks ? parseInt(String(a.numberOfTracks), 10) || undefined : undefined,
                year: a.year ? String(a.year) : undefined,
                addonId: addon.manifest.id,
              }))
            : [];

          // Parse artists
          const artists = Array.isArray(raw.artists)
            ? raw.artists.map((a: Record<string, unknown>) => ({
                id: String(a.id ?? ''),
                name: String(a.name ?? 'Unknown Artist'),
                image: a.artworkURL ? String(a.artworkURL) : a.image ? String(a.image) : undefined,
                artworkURL: a.artworkURL ? String(a.artworkURL) : a.image ? String(a.image) : undefined,
                genres: Array.isArray(a.genres) ? a.genres.map(String) : undefined,
              }))
            : [];

          const results: AddonSearchResults = { tracks, albums, artists, playlists: [] };
          
          // Update lastUsed
          set((state) => ({
            addons: state.addons.map((a) =>
              a.manifest.id === activeAddonId ? { ...a, lastUsed: Date.now() } : a
            ),
            searchResults: results,
            isSearching: false,
          }));

          return results;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Search failed';
          set({ isSearching: false, error: message });
          return { tracks: [], albums: [], artists: [], playlists: [] };
        }
      },

      searchWithAddon: async (addonId: string, query: string) => {
        const prev = get().activeAddonId;
        set({ activeAddonId: addonId });
        try {
          return await get().search(query);
        } finally {
          set({ activeAddonId: prev });
        }
      },

      resolveStreamUrl: async (track: AddonTrack & { source?: string }): Promise<string> => {
        const { addons, getPlaybackOrderedSearchAddonIds } = get();
        let url: string | undefined;
        
        // 1. Try the track's native addon resolution first (if it came from an addon)
        if (track.addonId) {
          const addon = addons.find((a) => a.manifest.id === track.addonId && a.enabled);
          if (addon) {
            try {
              const targetId = (track as any).addonTrackId || track.id;
              if (addon.eightspineInnerCode) {
                const api = await getEightspineApi(addon);
                const getTrackStreamUrl = (api.getTrackStreamUrl ?? api.getStreamUrl ?? api.getTrackUrl ?? api.streamUrl) as Function | undefined;
                if (typeof getTrackStreamUrl === 'function') {
                  const out = getTrackStreamUrl.length >= 3 ? await getTrackStreamUrl(targetId, undefined, { settings: {} })
                           : getTrackStreamUrl.length >= 2 ? await getTrackStreamUrl(targetId, undefined)
                           : await getTrackStreamUrl(targetId);
                  url = pickStreamUrlFromEightspineResult(out);
                }
              }
              if (!url) {
                const baseURL = addon.manifest.baseURL || '';
                const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(`${baseURL}/stream/${targetId}`)}`);
                if (res.ok) {
                  const data = await res.json();
                  url = pickStreamUrlFromEightspineResult(data);
                }
              }
              if (url) return `/api/stream?url=${encodeURIComponent(url)}`;
            } catch (e) {
              console.warn(`[AddonStore] Primary resolution failed for ${addon.manifest.id}:`, e);
            }
          }
        }

        // 2. FALLBACK CHAIN: Try all enabled search-capable addons in priority order
        if (!(track as any).isFallback) {
          const fallbackAddonIds = getPlaybackOrderedSearchAddonIds();
          const query = `${track.title} ${track.artist}`.trim();

          for (const addonId of fallbackAddonIds) {
            if (addonId === track.addonId) continue; // Skip what we already tried
            
            const addon = addons.find((a) => a.manifest.id === addonId);
            if (!addon) continue;

            try {
              const results = await get().searchWithAddon(addonId, query);
              const match = results.tracks?.[0];
              
              if (match) {
                // Recursive call with isFallback=true to prevent infinite loop
                const url = await get().resolveStreamUrl({ ...match, isFallback: true } as any);
                if (url) return url;
              }
            } catch (e) {
              console.warn(`[AddonStore] Fallback resolution failed for ${addon.manifest.id}:`, e);
            }
          }
        }

        // 3. Last resort: If track already has a direct stream URL from the instance, use it (and it is not an Apple/iTunes preview track)
        if (track.streamURL && !(track.streamURL.includes('itunes.apple.com') || track.streamURL.includes('mzstatic.com') || track.streamURL.includes('apple-assets'))) {
          return `/api/stream?url=${encodeURIComponent(track.streamURL)}`;
        }

        throw new Error(`Could not resolve stream for "${track.title}" by ${track.artist}`);
      },

      getAlbumTracks: async (albumId: string): Promise<AddonTrack[]> => {
        const { addons, activeAddonId } = get();
        const addon = addons.find((a) => a.manifest.id === activeAddonId);
        if (!addon) return [];

        const baseURL = addon.manifest.baseURL || '';

        if (addon.eightspineInnerCode) {
          try {
            const api = await getEightspineApi(addon);
            const getAlbum = api.getAlbum as undefined | ((id: string) => Promise<unknown>);
            if (typeof getAlbum !== 'function') return [];
            const out = await getAlbum(albumId);
            const raw = (out && typeof out === 'object' ? out : {}) as Record<string, unknown>;
            const albumData = (raw.album ?? raw.data ?? raw) as Record<string, unknown>;
            const tracksRaw = albumData.tracks ?? albumData.songs ?? albumData.songList ?? raw.tracks;
            if (!Array.isArray(tracksRaw)) return [];
            return tracksRaw.map((t: Record<string, unknown>) =>
              normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, baseURL)
            );
          } catch {
            return [];
          }
        }

        const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(`${baseURL}/album/${albumId}`)}`);
        if (!res.ok) return [];
        
        const raw: Record<string, unknown> = await res.json();
        // Album response might be wrapped in "album" or "data" key
        const albumData = (raw.album ?? raw.data ?? raw) as Record<string, unknown>;
        const tracksRaw = albumData.tracks ?? albumData.songs ?? albumData.songList ?? raw.tracks;
        
        if (!Array.isArray(tracksRaw)) return [];
        return tracksRaw.map((t: Record<string, unknown>) =>
          normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, baseURL)
        );
      },

      getArtistDetail: async (artistId: string): Promise<{ artist: any; tracks: AddonTrack[] } | null> => {
        const { addons, activeAddonId } = get();
        const addon = addons.find((a) => a.manifest.id === activeAddonId);
        if (!addon) return null;

        const baseURL = addon.manifest.baseURL || '';

        if (addon.eightspineInnerCode) {
          try {
            const api = await getEightspineApi(addon);
            const getArtist = api.getArtist as undefined | ((id: string) => Promise<unknown>);
            if (typeof getArtist !== 'function') return null;
            const out = await getArtist(artistId);
            const raw = (out && typeof out === 'object' ? out : {}) as Record<string, unknown>;
            const artistData = (raw.artist ?? raw.data ?? raw) as Record<string, unknown>;
            const artist = {
              id: String(artistData.id ?? artistId),
              name: String(artistData.name ?? 'Unknown Artist'),
              image: artistData.artworkURL
                ? String(artistData.artworkURL)
                : artistData.image
                  ? String(artistData.image)
                  : undefined,
              genres: Array.isArray(artistData.genres) ? artistData.genres.map(String) : undefined,
            };
            const tracksRaw = artistData.topTracks ?? artistData.tracks ?? artistData.songList ?? raw.tracks;
            const tracks = Array.isArray(tracksRaw)
              ? tracksRaw.map((t: Record<string, unknown>) =>
                  normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, baseURL)
                )
              : [];
            return { artist, tracks };
          } catch {
            return null;
          }
        }

        const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(`${baseURL}/artist/${artistId}`)}`);
        if (!res.ok) return null;
        
        const raw: Record<string, unknown> = await res.json();
        const artistData = (raw.artist ?? raw.data ?? raw) as Record<string, unknown>;
        
        const artist = {
          id: String(artistData.id ?? artistId),
          name: String(artistData.name ?? 'Unknown Artist'),
          image: artistData.artworkURL ? String(artistData.artworkURL) : artistData.image ? String(artistData.image) : undefined,
          genres: Array.isArray(artistData.genres) ? artistData.genres.map(String) : undefined,
        };

        const tracksRaw = artistData.topTracks ?? artistData.tracks ?? artistData.songList ?? raw.tracks;
        const tracks = Array.isArray(tracksRaw)
          ? tracksRaw.map((t: Record<string, unknown>) =>
              normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, baseURL)
            )
          : [];

        return { artist, tracks };
      },

      getPlaylistTracks: async (playlistId: string): Promise<AddonTrack[]> => {
        const { addons, activeAddonId } = get();
        const addon = addons.find((a) => a.manifest.id === activeAddonId);
        if (!addon) return [];

        const baseURL = addon.manifest.baseURL || '';

        if (addon.eightspineInnerCode) {
          try {
            const api = await getEightspineApi(addon);
            const getPlaylist = api.getPlaylist as undefined | ((id: string) => Promise<unknown>);
            if (typeof getPlaylist !== 'function') return [];
            const out = await getPlaylist(playlistId);
            const raw = (out && typeof out === 'object' ? out : {}) as Record<string, unknown>;
            const playlistData = (raw.playlist ?? raw.data ?? raw) as Record<string, unknown>;
            const tracksRaw = playlistData.tracks ?? raw.tracks;
            if (!Array.isArray(tracksRaw)) return [];
            return tracksRaw.map((t: Record<string, unknown>) =>
              normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, baseURL)
            );
          } catch {
            return [];
          }
        }

        const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(`${baseURL}/playlist/${playlistId}`)}`);
        if (!res.ok) return [];
        
        const raw: Record<string, unknown> = await res.json();
        const playlistData = (raw.playlist ?? raw.data ?? raw) as Record<string, unknown>;
        const tracksRaw = playlistData.tracks ?? raw.tracks;
        
        if (!Array.isArray(tracksRaw)) return [];
        return tracksRaw.map((t: Record<string, unknown>) =>
          normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, baseURL)
        );
      },

      getAlbumTracksForAddon: async (addonId: string, albumId: string): Promise<AddonTrack[]> => {
        const prev = get().activeAddonId;
        set({ activeAddonId: addonId });
        try {
          return await get().getAlbumTracks(albumId);
        } finally {
          set({ activeAddonId: prev });
        }
      },

      getPlaylistTracksForAddon: async (addonId: string, playlistId: string): Promise<AddonTrack[]> => {
        const prev = get().activeAddonId;
        set({ activeAddonId: addonId });
        try {
          return await get().getPlaylistTracks(playlistId);
        } finally {
          set({ activeAddonId: prev });
        }
      },

      getArtistTracksForAddon: async (addonId: string, artistId: string): Promise<AddonTrack[]> => {
        const prev = get().activeAddonId;
        set({ activeAddonId: addonId });
        try {
          const detail = await get().getArtistDetail(artistId);
          return detail?.tracks ?? [];
        } finally {
          set({ activeAddonId: prev });
        }
      },

      getHome: async (): Promise<AddonSearchResults | null> => {
        const priorityIds = get().getPlaybackOrderedSearchAddonIds();
        if (!priorityIds.length) return null;

        const aggregated: AddonSearchResults = {
          tracks: [],
          albums: [],
          artists: [],
          playlists: []
        };

        let hasData = false;

        for (const addonId of priorityIds) {
          const addon = get().addons.find((a) => a.manifest.id === addonId && a.enabled);
          if (!addon) continue;

          try {
            let data: AddonSearchResults | null = null;
            if (addon.eightspineInnerCode) {
              const api = await getEightspineApi(addon);
              const getHomeFn = (api.getHome ?? api.getCatalog ?? api.getExplore ?? api.getFeatured) as Function | undefined;
              if (typeof getHomeFn === 'function') {
                data = await getHomeFn();
              }
            }
            
            if (!data) {
              const baseURL = addon.manifest.baseURL || '';
              if (baseURL) {
                const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(`${baseURL}/home`)}`);
                if (res.ok) {
                  data = await res.json();
                }
              }
            }

            if (data && (data.tracks || data.albums || data.artists || data.playlists)) {
              hasData = true;
              if (data.tracks) {
                const normalizedTracks = data.tracks.map((t: any) => 
                  normalizeAddonTrack(t, addon.manifest.id, addon.manifest.name, addon.manifest.baseURL || '')
                );
                aggregated.tracks!.push(...normalizedTracks);
              }
              if (data.albums) {
                const normalizedAlbums = data.albums.map((a: any) => ({
                  id: String(a.id ?? ''),
                  name: a.name ? String(a.name) : a.title ? String(a.title) : undefined,
                  title: a.title ? String(a.title) : a.name ? String(a.name) : undefined,
                  artist: a.artist ? String(a.artist) : a.artistName ? String(a.artistName) : undefined,
                  artworkURL: a.artworkURL ?? a.cover ?? a.image,
                  cover: a.artworkURL ?? a.cover ?? a.image,
                  trackCount: a.trackCount ?? a.numberOfTracks,
                  year: a.year,
                  addonId: addon.manifest.id,
                }));
                aggregated.albums!.push(...normalizedAlbums);
              }
              if (data.artists) {
                const normalizedArtists = data.artists.map((art: any) => ({
                  id: String(art.id ?? ''),
                  name: String(art.name ?? 'Unknown Artist'),
                  image: art.artworkURL ?? art.image ?? art.picture,
                  artworkURL: art.artworkURL ?? art.image ?? art.picture,
                  addonId: addon.manifest.id,
                }));
                aggregated.artists!.push(...normalizedArtists);
              }
              if (data.playlists) {
                const normalizedPlaylists = data.playlists.map((pl: any) => ({
                  id: String(pl.id ?? ''),
                  name: pl.name ?? pl.title ?? 'Playlist',
                  cover: pl.artworkURL ?? pl.cover ?? pl.image,
                  artworkURL: pl.artworkURL ?? pl.cover ?? pl.image,
                  description: pl.description,
                  trackCount: pl.trackCount,
                  addonId: addon.manifest.id,
                }));
                aggregated.playlists!.push(...normalizedPlaylists);
              }
            }
          } catch (e) {
            console.warn(`[AddonStore] Failed to fetch home from ${addonId}:`, e);
          }
        }
        
        return hasData ? aggregated : null;
      },

      getPlaybackOrderedSearchAddonIds: () => {
        const { addons, playbackPriorityIds } = get();
        const searchable = addons.filter((a) => a.enabled && a.manifest.resources?.includes('search'));
        const ids = searchable.map((a) => a.manifest.id);
        const pri = (playbackPriorityIds ?? []).filter((id) => ids.includes(id));
        const rest = ids.filter((id) => !pri.includes(id));
        return [...pri, ...rest];
      },

      movePlaybackPriority: (addonId, delta) => {
        const ids = get().getPlaybackOrderedSearchAddonIds();
        const idx = ids.indexOf(addonId);
        if (idx < 0) return;
        const j = idx + delta;
        if (j < 0 || j >= ids.length) return;
        const next = [...ids];
        [next[idx], next[j]] = [next[j], next[idx]];
        set({ playbackPriorityIds: next });
      },

      clearError: () => set({ error: null }),

      clearAddonSearchCache: () =>
        set({
          searchResults: { tracks: [], albums: [], artists: [], playlists: [] },
          isSearching: false,
          error: null,
        }),
    }),
    {
      name: 'musik-addons',
      version: 6,
      partialize: (state) => ({
        addons: state.addons,
        activeAddonId: state.activeAddonId,
        sources: state.sources,
        playbackPriorityIds: state.playbackPriorityIds,
        hiddenModuleSourceIds: state.hiddenModuleSourceIds,
      }),
      migrate: (persisted: any) => {
        const state = persisted as any;
        if (!state || !Array.isArray(state.addons)) {
          return {
            addons: [],
            activeAddonId: null,
            sources: DEFAULT_SOURCES,
            playbackPriorityIds: [],
            hiddenModuleSourceIds: [],
          };
        }
        if (!Array.isArray(state.hiddenModuleSourceIds)) {
          state.hiddenModuleSourceIds = [];
        }
        if (!Array.isArray(state.playbackPriorityIds)) {
          state.playbackPriorityIds = [];
        }
        state.addons = (state.addons || [])
          .filter((a: any) => a?.manifest?.id)
          .map((a: any) => ({
            ...a,
            sourceId: typeof a.sourceId === 'string' ? a.sourceId : BUILTIN_ECLIPSE_SOURCE_ID,
          }));
        const prev = Array.isArray(state.sources) ? state.sources : [];
        const merged: AddonSource[] = DEFAULT_SOURCES.map((s) => ({ ...s }));
        for (const s of prev) {
          const dup = merged.some(
            (m) => m.id === s.id || (s.registryUrl && m.registryUrl === s.registryUrl)
          );
          if (!dup) merged.push({ ...s });
        }
        state.sources = merged;
        if (!state.activeAddonId || !state.addons.some((a: any) => a.manifest?.id === state.activeAddonId)) {
          const first = state.addons.find(
            (a: any) => a.enabled && a.manifest?.resources?.includes('search')
          );
          state.activeAddonId =
            first?.manifest?.id || (state.addons.length > 0 ? state.addons[0].manifest.id : null);
        }
        return state;
      },
    }
  )
);
