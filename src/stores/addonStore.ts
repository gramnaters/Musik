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
  manifestUrlCandidates,
  baseUrlFromSuccessfulManifestUrl,
  isEightspinePackageUrl,
} from '@/lib/manifest-url';
import { resolveAssetUrl } from '@/lib/resolve-asset-url';

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
    id: '8spine-vercel',
    name: '8SPINE Module Library (Vercel)',
    registryUrl: 'https://8spine-modules.vercel.app/index.json',
    builtIn: true,
  },
  {
    id: '8spine-github-jawsh',
    name: '8SPINE Modules (GitHub — Jawsh)',
    registryUrl:
      'https://raw.githubusercontent.com/Jawsh777/8spine-modules/refs/heads/main/dist/module-source.json',
    builtIn: true,
  },
  {
    id: '8spine-jsdelivr',
    name: '8SPINE Modules (jsDelivr mirror)',
    registryUrl:
      'https://cdn.jsdelivr.net/gh/Jawsh777/8spine-modules@main/dist/module-source.json',
    builtIn: true,
  },
];

interface AddonState {
  addons: InstalledAddon[];
  sources: AddonSource[];
  activeAddonId: string | null;
  isSearching: boolean;
  searchResults: AddonSearchResults;
  error: string | null;
}

interface AddonActions {
  addAddon: (
    manifest: AddonManifest,
    opts?: { sourceId?: string; eightspineInnerCode?: string; eightspineKind?: 'wrapped' | 'bare' }
  ) => void;
  addSource: (name: string, registryUrl: string) => void;
  removeSource: (id: string) => void;
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
  clearError: () => void;
  clearAddonSearchCache: () => void;
}

export const useAddonStore = create<AddonState & AddonActions>()(
  persist(
    (set, get) => ({
      addons: [],
      sources: DEFAULT_SOURCES,
      activeAddonId: null,
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
        });
      },

      addAddon: (
        manifest: AddonManifest,
        opts?: { sourceId?: string; eightspineInnerCode?: string; eightspineKind?: 'wrapped' | 'bare' }
      ) => {
        const sourceId = opts?.sourceId ?? 'custom';
        const inner = opts?.eightspineInnerCode;
        const kindOpt = opts?.eightspineKind;
        const { addons, activeAddonId } = get();
        const exists = addons.find((a) => a.manifest.id === manifest.id);
        if (exists) {
          eightspineApiCache.delete(manifest.id);
          // Already installed — just ensure it's enabled
          set({
            addons: addons.map((a) => {
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
                eightspineInnerCode: nextEight,
                eightspineKind: nextKind,
              };
            }),
          });
          return;
        }
        const newAddon: InstalledAddon = {
          manifest,
          enabled: true,
          installedAt: Date.now(),
          sourceId,
          ...(inner !== undefined ? { eightspineInnerCode: inner || undefined } : {}),
          ...(kindOpt ? { eightspineKind: kindOpt } : {}),
        };
        const newAddons = [...addons, newAddon];
        // Auto-select first addon if none active
        const newActiveId = activeAddonId || manifest.id;
        set({
          addons: newAddons,
          activeAddonId: newActiveId,
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

      resolveStreamUrl: async (track: AddonTrack): Promise<string> => {
        // If track already has a direct stream URL, proxy it
        if (track.streamURL) {
          return `/api/stream?url=${encodeURIComponent(track.streamURL)}`;
        }

        // Otherwise call the addon's /stream/{id} endpoint
        const { addons } = get();
        const addon = addons.find((a) => a.manifest.id === track.addonId);
        if (!addon) throw new Error('Addon not found for track');

        if (addon.eightspineInnerCode) {
          const api = await getEightspineApi(addon);
          const getTrackStreamUrl = (api.getTrackStreamUrl ??
            api.getStreamUrl ??
            api.getTrackUrl ??
            api.streamUrl) as Function | undefined;
          if (typeof getTrackStreamUrl !== 'function') {
            throw new Error('8SPINE module has no getTrackStreamUrl()');
          }
          const ctx = { settings: {} };
          const out =
            getTrackStreamUrl.length >= 3
              ? await getTrackStreamUrl(track.id, undefined, ctx)
              : getTrackStreamUrl.length >= 2
                ? await getTrackStreamUrl(track.id, undefined)
                : await getTrackStreamUrl(track.id);
          const resolvedUrl = pickStreamUrlFromEightspineResult(out);
          if (!resolvedUrl) throw new Error('No stream URL in 8SPINE response');
          return `/api/stream?url=${encodeURIComponent(resolvedUrl)}`;
        }

        const baseURL = addon.manifest.baseURL || '';
        const streamApiUrl = `${baseURL}/stream/${track.id}`;
        
        const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(streamApiUrl)}`);
        if (!res.ok) throw new Error(`Stream resolution failed: ${res.status}`);
        
        const data: Record<string, unknown> = await res.json();
        const resolvedUrl = pickStreamUrlFromEightspineResult(data);
        if (!resolvedUrl) throw new Error('No stream URL in response');

        return `/api/stream?url=${encodeURIComponent(resolvedUrl)}`;
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
      version: 4,
      partialize: (state) => ({
        addons: state.addons,
        activeAddonId: state.activeAddonId,
        sources: state.sources,
      }),
      migrate: (persisted: any) => {
        const state = persisted as any;
        if (!state || !Array.isArray(state.addons)) {
          return { addons: [], activeAddonId: null, sources: DEFAULT_SOURCES };
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
