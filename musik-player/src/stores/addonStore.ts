import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  InstalledAddon,
  AddonManifest,
  AddonSearchResults,
  AddonTrack,
} from '@/types/addon';

interface AddonState {
  addons: InstalledAddon[];
  isSearching: boolean;
  searchResults: AddonSearchResults;
  error: string | null;
}

interface AddonActions {
  addAddon: (manifest: AddonManifest) => void;
  removeAddon: (id: string) => void;
  toggleAddon: (id: string) => void;
  updateLastUsed: (id: string) => void;
  fetchManifest: (url: string) => Promise<AddonManifest>;
  search: (query: string) => Promise<AddonSearchResults>;
  searchAddon: (addonId: string, query: string) => Promise<AddonSearchResults>;
  getStreamUrl: (track: AddonTrack) => string;
  getAlbumTracks: (addonId: string, albumId: string) => Promise<AddonTrack[]>;
  getArtistTracks: (addonId: string, artistId: string) => Promise<AddonTrack[]>;
  getPlaylistTracks: (addonId: string, playlistId: string) => Promise<AddonTrack[]>;
  clearError: () => void;
}

export const useAddonStore = create<AddonState & AddonActions>()(
  persist(
    (set, get) => ({
      addons: [],
      isSearching: false,
      searchResults: { tracks: [], albums: [], artists: [], playlists: [] },
      error: null,

      addAddon: (manifest: AddonManifest) => {
        const { addons } = get();
        const exists = addons.find((a) => a.manifest.id === manifest.id);
        if (exists) return;
        set({
          addons: [
            ...addons,
            {
              manifest,
              enabled: true,
              installedAt: Date.now(),
            },
          ],
        });
      },

      removeAddon: (id: string) => {
        set((state) => ({
          addons: state.addons.filter((a) => a.manifest.id !== id),
        }));
      },

      toggleAddon: (id: string) => {
        set((state) => ({
          addons: state.addons.map((a) =>
            a.manifest.id === id ? { ...a, enabled: !a.enabled } : a
          ),
        }));
      },

      updateLastUsed: (id: string) => {
        set((state) => ({
          addons: state.addons.map((a) =>
            a.manifest.id === id ? { ...a, lastUsed: Date.now() } : a
          ),
        }));
      },

      fetchManifest: async (url: string): Promise<AddonManifest> => {
        try {
          const baseUrl = url.replace(/\/manifest\.json\/?$/, '').replace(/\/+$/, '');
          const manifestUrl = `${baseUrl}/manifest.json`;
          const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(manifestUrl)}`);
          if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
          const manifest: AddonManifest = await res.json();
          if (!manifest.baseURL) {
            manifest.baseURL = baseUrl;
          }
          if (!manifest.id) {
            manifest.id = `addon_${Date.now()}`;
          }
          return manifest;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to fetch manifest';
          set({ error: message });
          throw err;
        }
      },

      search: async (query: string): Promise<AddonSearchResults> => {
        const { addons } = get();
        const enabledAddons = addons.filter((a) => a.enabled);
        if (enabledAddons.length === 0 || !query.trim()) {
          set({ searchResults: { tracks: [], albums: [], artists: [], playlists: [] } });
          return { tracks: [], albums: [], artists: [], playlists: [] };
        }

        set({ isSearching: true, error: null });

        const allTracks: AddonTrack[] = [];
        const allAlbums: AddonSearchResults['albums'] = [];
        const allArtists: AddonSearchResults['artists'] = [];

        const searchPromises = enabledAddons.map(async (addon) => {
          try {
            const results = await get().searchAddon(addon.manifest.id, query);
            if (results.tracks) {
              results.tracks.forEach((t) => {
                t.addonId = addon.manifest.id;
                t.addonName = addon.manifest.name;
                if (t.streamURL && !t.streamURL.startsWith('http')) {
                  t.streamURL = `${addon.manifest.baseURL}${t.streamURL}`;
                }
              });
              allTracks.push(...results.tracks);
            }
            if (results.albums) {
              results.albums.forEach((a) => {
                a.addonId = addon.manifest.id;
              });
              allAlbums.push(...results.albums);
            }
            if (results.artists) {
              allArtists.push(...results.artists);
            }
            get().updateLastUsed(addon.manifest.id);
          } catch {
            // Skip failed addons
          }
        });

        await Promise.allSettled(searchPromises);

        const results = {
          tracks: allTracks,
          albums: allAlbums || [],
          artists: allArtists || [],
          playlists: [],
        };

        set({ searchResults: results, isSearching: false });
        return results;
      },

      searchAddon: async (
        addonId: string,
        query: string
      ): Promise<AddonSearchResults> => {
        const { addons } = get();
        const addon = addons.find((a) => a.manifest.id === addonId);
        if (!addon) throw new Error('Addon not found');

        const baseURL = addon.manifest.baseURL || '';
        const searchUrl = `${baseURL}/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(searchUrl)}`);
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        return res.json();
      },

      getStreamUrl: (track: AddonTrack): string => {
        if (!track.streamURL) return '';
        if (track.streamURL.startsWith('http')) {
          return `/api/stream?url=${encodeURIComponent(track.streamURL)}`;
        }
        const { addons } = get();
        const addon = addons.find((a) => a.manifest.id === track.addonId);
        const baseURL = addon?.manifest.baseURL || '';
        return `/api/stream?url=${encodeURIComponent(baseURL + track.streamURL)}`;
      },

      getAlbumTracks: async (addonId: string, albumId: string): Promise<AddonTrack[]> => {
        const { addons } = get();
        const addon = addons.find((a) => a.manifest.id === addonId);
        if (!addon) return [];
        const baseURL = addon.manifest.baseURL || '';
        const res = await fetch(
          `/api/addons/proxy?url=${encodeURIComponent(`${baseURL}/album/${albumId}`)}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        const tracks = data.tracks || [];
        tracks.forEach((t: AddonTrack) => {
          t.addonId = addonId;
          t.addonName = addon.manifest.name;
          if (t.streamURL && !t.streamURL.startsWith('http')) {
            t.streamURL = `${baseURL}${t.streamURL}`;
          }
        });
        return tracks;
      },

      getArtistTracks: async (addonId: string, artistId: string): Promise<AddonTrack[]> => {
        const { addons } = get();
        const addon = addons.find((a) => a.manifest.id === addonId);
        if (!addon) return [];
        const baseURL = addon.manifest.baseURL || '';
        const res = await fetch(
          `/api/addons/proxy?url=${encodeURIComponent(`${baseURL}/artist/${artistId}`)}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        const tracks = data.tracks || [];
        tracks.forEach((t: AddonTrack) => {
          t.addonId = addonId;
          t.addonName = addon.manifest.name;
          if (t.streamURL && !t.streamURL.startsWith('http')) {
            t.streamURL = `${baseURL}${t.streamURL}`;
          }
        });
        return tracks;
      },

      getPlaylistTracks: async (
        addonId: string,
        playlistId: string
      ): Promise<AddonTrack[]> => {
        const { addons } = get();
        const addon = addons.find((a) => a.manifest.id === addonId);
        if (!addon) return [];
        const baseURL = addon.manifest.baseURL || '';
        const res = await fetch(
          `/api/addons/proxy?url=${encodeURIComponent(`${baseURL}/playlist/${playlistId}`)}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        const tracks = data.tracks || [];
        tracks.forEach((t: AddonTrack) => {
          t.addonId = addonId;
          t.addonName = addon.manifest.name;
          if (t.streamURL && !t.streamURL.startsWith('http')) {
            t.streamURL = `${baseURL}${t.streamURL}`;
          }
        });
        return tracks;
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'musik-addons',
    }
  )
);
