import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  InstalledAddon,
  AddonManifest,
  AddonSearchResults,
  AddonTrack,
  normalizeAddonTrack,
} from '@/types/addon';

interface AddonState {
  addons: InstalledAddon[];
  activeAddonId: string | null;
  isSearching: boolean;
  searchResults: AddonSearchResults;
  error: string | null;
}

interface AddonActions {
  addAddon: (manifest: AddonManifest) => void;
  removeAddon: (id: string) => void;
  toggleAddon: (id: string) => void;
  setActiveAddon: (id: string) => void;
  fetchManifest: (url: string) => Promise<AddonManifest>;
  search: (query: string) => Promise<AddonSearchResults>;
  resolveStreamUrl: (track: AddonTrack) => Promise<string>;
  getAlbumTracks: (albumId: string) => Promise<AddonTrack[]>;
  getArtistDetail: (artistId: string) => Promise<{ artist: any; tracks: AddonTrack[] } | null>;
  getPlaylistTracks: (playlistId: string) => Promise<AddonTrack[]>;
  clearError: () => void;
}

export const useAddonStore = create<AddonState & AddonActions>()(
  persist(
    (set, get) => ({
      addons: [],
      activeAddonId: null,
      isSearching: false,
      searchResults: { tracks: [], albums: [], artists: [], playlists: [] },
      error: null,

      addAddon: (manifest: AddonManifest) => {
        const { addons, activeAddonId } = get();
        const exists = addons.find((a) => a.manifest.id === manifest.id);
        if (exists) {
          // Already installed — just ensure it's enabled
          set({
            addons: addons.map((a) =>
              a.manifest.id === manifest.id ? { ...a, enabled: true, manifest } : a
            ),
          });
          return;
        }
        const newAddon: InstalledAddon = {
          manifest,
          enabled: true,
          installedAt: Date.now(),
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
        const { addons, activeAddonId } = get();
        const newAddons = addons.filter((a) => a.manifest.id !== id);
        let newActiveId = activeAddonId;
        if (activeAddonId === id) {
          const searchCapable = newAddons.find((a) => a.enabled && a.manifest.resources?.includes('search'));
          newActiveId = searchCapable?.manifest.id || (newAddons.length > 0 ? newAddons[0].manifest.id : null);
        }
        set({ addons: newAddons, activeAddonId: newActiveId });
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

      fetchManifest: async (url: string): Promise<AddonManifest> => {
        try {
          let baseUrl = url.trim();
          // Normalize URL — strip /manifest.json and trailing slash
          if (baseUrl.endsWith('/manifest.json')) {
            baseUrl = baseUrl.slice(0, -'/manifest.json'.length);
          }
          if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
          }

          const manifestUrl = `${baseUrl}/manifest.json`;
          const proxyUrl = `/api/addons/proxy?url=${encodeURIComponent(manifestUrl)}`;
          
          const res = await fetch(proxyUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch manifest (HTTP ${res.status})`);
          }
          
          const raw: Record<string, unknown> = await res.json();
          if (!raw || typeof raw !== 'object') {
            throw new Error('Invalid manifest response');
          }

          // Validate required fields
          const id = String(raw.id ?? '');
          const name = String(raw.name ?? '');
          const version = String(raw.version ?? '');
          const resources = raw.resources;

          if (!id) throw new Error('Manifest missing required field: id');
          if (!name) throw new Error('Manifest missing required field: name');
          if (!version) throw new Error('Manifest missing required field: version');
          if (!resources || !Array.isArray(resources)) {
            throw new Error('Manifest missing required field: resources');
          }

          const manifest: AddonManifest = {
            id,
            name,
            version,
            description: raw.description ? String(raw.description) : undefined,
            author: raw.author ? String(raw.author) : undefined,
            icon: raw.icon ? String(raw.icon) : undefined,
            contentType: raw.contentType ? String(raw.contentType) : undefined,
            types: Array.isArray(raw.types) ? raw.types.map(String) : undefined,
            resources: Array.isArray(resources) ? resources.map(String) : undefined,
            baseURL: baseUrl,
          };

          return manifest;
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

      resolveStreamUrl: async (track: AddonTrack): Promise<string> => {
        // If track already has a direct stream URL, proxy it
        if (track.streamURL) {
          return `/api/stream?url=${encodeURIComponent(track.streamURL)}`;
        }

        // Otherwise call the addon's /stream/{id} endpoint
        const { addons } = get();
        const addon = addons.find((a) => a.manifest.id === track.addonId);
        if (!addon) throw new Error('Addon not found for track');

        const baseURL = addon.manifest.baseURL || '';
        const streamApiUrl = `${baseURL}/stream/${track.id}`;
        
        const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(streamApiUrl)}`);
        if (!res.ok) throw new Error(`Stream resolution failed: ${res.status}`);
        
        const data: Record<string, unknown> = await res.json();
        const resolvedUrl = String(data.url ?? '');
        if (!resolvedUrl) throw new Error('No stream URL in response');

        return `/api/stream?url=${encodeURIComponent(resolvedUrl)}`;
      },

      getAlbumTracks: async (albumId: string): Promise<AddonTrack[]> => {
        const { addons, activeAddonId } = get();
        const addon = addons.find((a) => a.manifest.id === activeAddonId);
        if (!addon) return [];

        const baseURL = addon.manifest.baseURL || '';
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
    }),
    {
      name: 'musik-addons',
      version: 2,
      partialize: (state) => ({
        addons: state.addons,
        activeAddonId: state.activeAddonId,
      }),
      migrate: (persisted: any, version: number) => {
        const state = persisted as any;
        // Reset if corrupt or from old version
        if (!state || !Array.isArray(state.addons)) {
          return { addons: [], activeAddonId: null };
        }
        // Ensure all addons have valid manifests
        state.addons = (state.addons || []).filter((a: any) => a?.manifest?.id);
        if (!state.activeAddonId || !state.addons.some((a: any) => a.manifest?.id === state.activeAddonId)) {
          const first = state.addons.find((a: any) => a.enabled && a.manifest?.resources?.includes('search'));
          state.activeAddonId = first?.manifest?.id || (state.addons.length > 0 ? state.addons[0].manifest.id : null);
        }
        return state;
      },
    }
  )
);
