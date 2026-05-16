import { create } from 'zustand';
import { useStreamingStore } from './streamingStore';

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

interface LyricsState {
  lyrics: string | null;
  syncedLyrics: LyricLine[] | null;
  isLoading: boolean;
  error: string | null;
  currentTrackId: string | null;
}

interface LyricsActions {
  fetchLyrics: (trackId: string, title: string, artist: string) => Promise<void>;
  clearLyrics: () => void;
}

export const useLyricsStore = create<LyricsState & LyricsActions>((set, get) => ({
  lyrics: null,
  syncedLyrics: null,
  isLoading: false,
  error: null,
  currentTrackId: null,

  fetchLyrics: async (trackId, title, artist) => {
    if (get().currentTrackId === trackId) return;

    set({ isLoading: true, error: null, currentTrackId: trackId, lyrics: null, syncedLyrics: null });

    const streamingUrl = useStreamingStore.getState().selectedStreamingUrl;
    if (!streamingUrl) {
      set({ isLoading: false, error: 'No streaming instance selected' });
      return;
    }

    try {
      // 1. Try instance lyrics endpoint: /lyrics/{id}
      const lyricsUrl = `${streamingUrl.replace(/\/$/, '')}/lyrics/${trackId}`;
      const res = await fetch(`/api/addons/proxy?url=${encodeURIComponent(lyricsUrl)}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.lyrics || data.syncedLyrics) {
          set({
            lyrics: data.lyrics || null,
            syncedLyrics: data.syncedLyrics || null,
            isLoading: false,
          });
          return;
        }
      }

      // 2. Fallback to a search-based lyrics API if needed (optional)
      // For now, we'll just say not available
      set({ isLoading: false, error: 'Lyrics not found' });
    } catch (err) {
      set({ isLoading: false, error: 'Failed to fetch lyrics' });
    }
  },

  clearLyrics: () => set({ lyrics: null, syncedLyrics: null, currentTrackId: null, error: null }),
}));
