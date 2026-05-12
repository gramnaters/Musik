import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '@/types/music';
import { inferFormatFromUrl } from '@/lib/audio-quality';
import { useAddonStore } from '@/stores/addonStore';
import type { AddonTrack } from '@/types/addon';

type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  /** True while stream is resolving / audio has not started yet (spinner on play control). */
  isLoadingPlayback: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  prevVolume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isMuted: boolean;
  showNowPlaying: boolean;
  audio: HTMLAudioElement | null;
}

interface PlayerActions {
  play: (track: Track, queue?: Track[], index?: number) => void; // async internally
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  setQueue: (tracks: Track[], index: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (time: number) => void;
  setShowNowPlaying: (show: boolean) => void;
  cleanup: () => void;
}

let timeRaf: number | null = null;

function stopTimeSync() {
  if (timeRaf != null) {
    cancelAnimationFrame(timeRaf);
    timeRaf = null;
  }
}

function startTimeSync(
  set: (partial: Partial<PlayerState & PlayerActions>) => void,
  get: () => PlayerState & PlayerActions
) {
  stopTimeSync();
  const tick = () => {
    const a = get().audio;
    if (a && !a.paused && get().isPlaying) {
      set({ currentTime: a.currentTime });
      timeRaf = requestAnimationFrame(tick);
    } else {
      timeRaf = null;
    }
  };
  timeRaf = requestAnimationFrame(tick);
}

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      originalQueue: [],
      queueIndex: -1,
      isPlaying: false,
      isLoadingPlayback: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      prevVolume: 0.7,
      isShuffle: false,
      repeatMode: 'off',
      isMuted: false,
      showNowPlaying: false,
      audio: null,

      play: (track, queue, index) => {
        const state = get();
        const audio = state.audio || new Audio();

        stopTimeSync();

        let newQueue = queue || [track];
        let originalQueue = queue ? [...queue] : [track];
        let newIndex = index ?? 0;

        if (!queue) {
          // Single track play
          if (state.queue.length > 0 && state.queueIndex >= 0) {
            newQueue = [...state.queue];
            const existingIdx = newQueue.findIndex(t => t.id === track.id);
            if (existingIdx >= 0) {
              newIndex = existingIdx;
            } else {
              // Replace current track in queue
              newQueue[state.queueIndex] = track;
              newIndex = state.queueIndex;
            }
            originalQueue = [...newQueue];
          }
        }

        // Apply shuffle if enabled
        if (state.isShuffle && queue) {
          const shuffled = [...newQueue];
          const [current] = shuffled.splice(newIndex, 1);
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          shuffled.unshift(current);
          newQueue = shuffled;
          newIndex = 0;
        }

        // Resolve stream URL — direct URL or via addon /stream/{id} endpoint
        const resolveAndPlay = async () => {
          try {
            let finalStreamUrl = track.streamURL;

            // If no direct URL, resolve via addon store (Eclipse HTTP or in-browser 8SPINE module)
            if (!finalStreamUrl && track.addonId && track.addonTrackId) {
              try {
                const proxied = await useAddonStore.getState().resolveStreamUrl({
                  id: track.addonTrackId,
                  title: track.title,
                  artist: track.artist,
                  addonId: track.addonId,
                  streamURL: track.streamURL,
                } as AddonTrack);
                const m = proxied.match(/^\/api\/stream\?url=(.+)$/);
                if (m) {
                  try {
                    finalStreamUrl = decodeURIComponent(m[1]);
                  } catch {
                    finalStreamUrl = m[1];
                  }
                }
              } catch {
                // Stream resolution failed — try direct URL
              }
            }

            if (finalStreamUrl) {
              const inferred = inferFormatFromUrl(finalStreamUrl);
              const trackToPlay = {
                ...track,
                streamURL: finalStreamUrl,
                url: finalStreamUrl,
                format: track.format || inferred,
              };
              const markReady = () => set({ isLoadingPlayback: false });
              audio.addEventListener('playing', markReady, { once: true });
              audio.addEventListener('error', markReady, { once: true });
              audio.addEventListener('abort', markReady, { once: true });

              set({ currentTrack: trackToPlay, isPlaying: true });

              audio.preload = 'auto';
              audio.src = `/api/stream?url=${encodeURIComponent(finalStreamUrl)}`;
              audio.load();
              audio.volume = state.isMuted ? 0 : state.volume;
              void audio.play().catch(() => {
                markReady();
              });
            } else {
              set({ isLoadingPlayback: false });
            }
          } catch {
            set({ isLoadingPlayback: false });
          }
        };

        resolveAndPlay();

        audio.onplay = () => {
          startTimeSync(set, get);
        };

        audio.onpause = () => {
          stopTimeSync();
          const a = get().audio;
          if (a) set({ currentTime: a.currentTime });
        };

        // Handle track end
        audio.onended = () => {
          const s = get();
          if (s.repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play().catch(() => {});
          } else if (s.queueIndex < s.queue.length - 1) {
            s.nextTrack();
          } else if (s.repeatMode === 'all' && s.queue.length > 0) {
            s.play(s.originalQueue[0], s.originalQueue, 0);
          } else {
            stopTimeSync();
            set({ isPlaying: false, isLoadingPlayback: false });
          }
        };

        audio.ondurationchange = () => {
          if (audio.duration && isFinite(audio.duration)) {
            set({ duration: audio.duration });
          }
        };

        set({
          currentTrack: track,
          queue: newQueue,
          originalQueue,
          queueIndex: newIndex,
          isPlaying: true,
          isLoadingPlayback: true,
          currentTime: 0,
          duration: audio.duration && isFinite(audio.duration) ? audio.duration : 0,
          audio,
        });
      },

      pause: () => {
        const { audio } = get();
        audio?.pause();
        stopTimeSync();
        if (audio) set({ isPlaying: false, isLoadingPlayback: false, currentTime: audio.currentTime });
        else set({ isPlaying: false, isLoadingPlayback: false });
      },

      resume: () => {
        const { audio, currentTrack } = get();
        if (audio && currentTrack) {
          audio.play().catch(() => {});
          set({ isPlaying: true });
          startTimeSync(set, get);
        }
      },

      togglePlayPause: () => {
        const { isPlaying, currentTrack } = get();
        if (!currentTrack) return;
        if (isPlaying) {
          get().pause();
        } else {
          get().resume();
        }
      },

      nextTrack: () => {
        const { queue, queueIndex, originalQueue, isShuffle } = get();
        if (queue.length === 0) return;

        if (isShuffle) {
          const randomIndex = Math.floor(Math.random() * queue.length);
          const track = queue[randomIndex];
          get().play(track, queue, randomIndex);
        } else {
          const nextIndex = queueIndex + 1;
          if (nextIndex < queue.length) {
            const track = queue[nextIndex];
            get().play(track, queue, nextIndex);
          }
        }
      },

      previousTrack: () => {
        const { queue, queueIndex, currentTime, audio } = get();
        if (queue.length === 0) return;

        // If more than 3 seconds in, restart current track
        if (currentTime > 3) {
          if (audio) {
            audio.currentTime = 0;
            set({ currentTime: 0 });
          }
          return;
        }

        const prevIndex = queueIndex - 1;
        if (prevIndex >= 0) {
          const track = queue[prevIndex];
          get().play(track, queue, prevIndex);
        }
      },

      seekTo: (time: number) => {
        const { audio, duration } = get();
        if (!audio) return;
        const cap =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : duration > 0
              ? duration
              : Number.POSITIVE_INFINITY;
        const t = Math.max(0, Math.min(time, cap));
        audio.currentTime = t;
        set({ currentTime: t });
      },

      setVolume: (vol: number) => {
        const { audio } = get();
        const volume = Math.max(0, Math.min(1, vol));
        if (audio) {
          audio.volume = volume;
        }
        set({ volume, isMuted: volume === 0, prevVolume: volume > 0 ? volume : get().prevVolume });
      },

      toggleMute: () => {
        const { audio, isMuted, prevVolume, volume } = get();
        if (isMuted) {
          const restoreVol = prevVolume > 0 ? prevVolume : 0.7;
          if (audio) audio.volume = restoreVol;
          set({ isMuted: false, volume: restoreVol });
        } else {
          if (audio) audio.volume = 0;
          set({ isMuted: true, prevVolume: volume });
        }
      },

      toggleShuffle: () => {
        const { isShuffle, queue, queueIndex, currentTrack } = get();
        if (isShuffle) {
          // Restore original order
          const original = get().originalQueue;
          const currentId = currentTrack?.id;
          const newIdx = currentId ? original.findIndex(t => t.id === currentId) : 0;
          set({ isShuffle: false, queue: [...original], queueIndex: newIdx >= 0 ? newIdx : 0 });
        } else {
          // Shuffle (keep current track at current position)
          const shuffled = [...queue];
          const [current] = shuffled.splice(queueIndex, 1);
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          shuffled.unshift(current);
          set({ isShuffle: true, queue: shuffled, queueIndex: 0 });
        }
      },

      cycleRepeat: () => {
        const { repeatMode } = get();
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const idx = modes.indexOf(repeatMode);
        set({ repeatMode: modes[(idx + 1) % modes.length] });
      },

      addToQueue: (track: Track) => {
        const { queue } = get();
        set({ queue: [...queue, track] });
      },

      removeFromQueue: (index: number) => {
        const { queue, queueIndex, currentTrack } = get();
        if (index === queueIndex) return; // Can't remove currently playing
        const newQueue = queue.filter((_, i) => i !== index);
        let newIndex = queueIndex;
        if (index < queueIndex) newIndex--;
        set({ queue: newQueue, queueIndex: newIndex });
      },

      reorderQueue: (from: number, to: number) => {
        const { queue, queueIndex, currentTrack } = get();
        if (from === to) return;
        if (from === queueIndex || to === queueIndex) return;
        const newQueue = [...queue];
        const [moved] = newQueue.splice(from, 1);
        newQueue.splice(to, 0, moved);
        // Recalculate queue index
        let newIndex = newQueue.findIndex(t => t.id === currentTrack?.id);
        set({ queue: newQueue, queueIndex: newIndex });
      },

      setQueue: (tracks: Track[], index: number) => {
        set({ queue: [...tracks], originalQueue: [...tracks], queueIndex: index });
      },

      setCurrentTime: (time: number) => set({ currentTime: time }),
      setDuration: (time: number) => set({ duration: time }),

      setShowNowPlaying: (show: boolean) => set({ showNowPlaying: show }),

      cleanup: () => {
        const { audio } = get();
        stopTimeSync();
        audio?.pause();
        audio?.removeAttribute('src');
        set({ audio: null, isPlaying: false, isLoadingPlayback: false });
      },
    }),
    {
      name: 'musik-player',
      version: 2,
      partialize: (state) => ({
        volume: state.volume,
        prevVolume: state.prevVolume,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        isMuted: state.isMuted,
      }),
      migrate: (persisted: any, version: number) => {
        if (!persisted || typeof persisted !== 'object') {
          return { volume: 0.7, prevVolume: 0.7, isShuffle: false, repeatMode: 'off', isMuted: false };
        }
        return persisted;
      },
    }
  )
);
