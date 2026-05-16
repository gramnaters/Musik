import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track, Playlist } from '@/types/music';
import { demoPlaylists } from '@/lib/demo-data';

interface LibraryState {
  playlists: Playlist[];
  favourites: string[]; // track IDs
  recentlyPlayed: Track[];
}

interface LibraryActions {
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackIndex: number) => void;
  toggleFavourite: (track: Track) => boolean;
  isFavourite: (trackId: string) => boolean;
  addRecentlyPlayed: (track: Track) => void;
  renamePlaylist: (id: string, name: string) => void;
  initializeDefaults: () => void;
}

export const useLibraryStore = create<LibraryState & LibraryActions>()(
  persist(
    (set, get) => ({
      playlists: [],
      favourites: [],
      recentlyPlayed: [],

      initializeDefaults: () => {
        const { playlists } = get();
        if (playlists.length === 0) {
          set({
            playlists: demoPlaylists.map(p => ({
              ...p,
              tracks: p.tracks?.map(t => ({ ...t })) || [],
            })),
          });
        }
      },

      createPlaylist: (name: string, description?: string) => {
        const playlist: Playlist = {
          id: `pl_${Date.now()}`,
          name,
          description,
          cover: `https://picsum.photos/seed/${Date.now()}/300/300`,
          tracks: [],
          trackCount: 0,
          createdAt: Date.now(),
        };
        set((state) => ({
          playlists: [...state.playlists, playlist],
        }));
        return playlist;
      },

      deletePlaylist: (id: string) => {
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== id),
        }));
      },

      addToPlaylist: (playlistId: string, track: Track) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, tracks: [...(p.tracks || []), { ...track }], trackCount: (p.tracks?.length || 0) + 1 }
              : p
          ),
        }));
      },

      removeFromPlaylist: (playlistId: string, trackIndex: number) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  tracks: (p.tracks || []).filter((_, i) => i !== trackIndex),
                  trackCount: Math.max(0, (p.tracks?.length || 0) - 1),
                }
              : p
          ),
        }));
      },

      toggleFavourite: (track: Track) => {
        const { favourites } = get();
        const isFav = favourites.includes(track.id);
        if (isFav) {
          set({ favourites: favourites.filter((id) => id !== track.id) });
        } else {
          set({ favourites: [...favourites, track.id] });
        }
        return !isFav;
      },

      isFavourite: (trackId: string) => {
        return get().favourites.includes(trackId);
      },

      addRecentlyPlayed: (track: Track) => {
        const { recentlyPlayed } = get();
        const filtered = recentlyPlayed.filter((t) => t.id !== track.id);
        set({
          recentlyPlayed: [{ ...track }, ...filtered].slice(0, 30),
        });
      },

      renamePlaylist: (id: string, name: string) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === id ? { ...p, name } : p
          ),
        }));
      },
    }),
    {
      name: 'musik-library',
    }
  )
);
