import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '@/types/music';
import { inferFormatFromUrl } from '@/lib/audio-quality';
import { useAddonStore } from '@/stores/addonStore';
import type { AddonTrack } from '@/types/addon';
import { Loader2 } from 'lucide-react';

type RepeatMode = 'off' | 'all' | 'one';

let playSession = 0;

function describeMediaError(audio: HTMLAudioElement): string {
  const code = audio.error?.code;
  if (code === MediaError.MEDIA_ERR_NETWORK) {
    return 'Network error while loading the stream. Try again or pick another source.';
  }
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return 'This stream is blocked, expired, or not supported in the browser.';
  }
  if (code === MediaError.MEDIA_ERR_DECODE) {
    return 'The audio could not be decoded.';
  }
  if (code === MediaError.MEDIA_ERR_ABORTED) {
    return 'Loading was interrupted.';
  }
  return 'Playback failed — try another track.';
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  /** True while stream is resolving / audio has not started yet (spinner on play control). */
  isLoadingPlayback: boolean;
  /** Last element error or resolver failure (cleared on successful play). */
  playbackError: string | null;
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
  clearPlaybackError: () => void;
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
      playbackError: null,
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
        const session = ++playSession;
        const stale = () => session !== playSession;

        const state = get();
        const audio = state.audio || new Audio();

        stopTimeSync();

        audio.pause();
        audio.removeAttribute('src');
        audio.load();

        let newQueue = queue || [track];
        let originalQueue = queue ? [...queue] : [track];
        let newIndex = index ?? 0;

        if (!queue) {
          if (state.queue.length > 0 && state.queueIndex >= 0) {
            newQueue = [...state.queue];
            const existingIdx = newQueue.findIndex((t) => t.id === track.id);
            if (existingIdx >= 0) {
              newIndex = existingIdx;
            } else {
              newQueue[state.queueIndex] = track;
              newIndex = state.queueIndex;
            }
            originalQueue = [...newQueue];
          }
        }

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

        audio.onplay = () => {
          if (stale()) return;
          set({ isPlaying: true, isLoadingPlayback: false, playbackError: null });
          startTimeSync(set, get);
        };

        audio.onpause = () => {
          if (stale()) return;
          stopTimeSync();
          const a = get().audio;
          if (a) set({ currentTime: a.currentTime });
        };

        audio.onerror = () => {
          if (stale()) return;
          stopTimeSync();
          set({
            isPlaying: false,
            isLoadingPlayback: false,
            playbackError: describeMediaError(audio),
          });
        };

        audio.onended = () => {
          if (stale()) return;
          const s = get();
          if (s.repeatMode === 'one') {
            audio.currentTime = 0;
            void audio.play().catch(() => {});
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
          if (stale()) return;
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
          playbackError: null,
          currentTime: 0,
          duration: 0,
          audio,
        });

        void (async () => {
          try {
            let finalStreamUrl = track.streamURL;

            if (!finalStreamUrl) {
              try {
                const proxied = await useAddonStore.getState().resolveStreamUrl({
                  id: track.addonTrackId || track.id,
                  title: track.title,
                  artist: track.artist,
                  addonId: track.addonId,
                  streamURL: track.streamURL,
                  source: track.source,
                } as any);
                
                const m = proxied.match(/^\/api\/stream\?url=(.+)$/);
                if (m) {
                  try {
                    finalStreamUrl = decodeURIComponent(m[1]);
                  } catch {
                    finalStreamUrl = m[1];
                  }
                } else {
                  // Might be a direct URL returned if not using proxy wrapper
                  finalStreamUrl = proxied;
                }
              } catch {
                /* addon resolution failed */
              }
            }

            if (stale()) return;

            if (!finalStreamUrl) {
              set({
                isLoadingPlayback: false,
                isPlaying: false,
                playbackError: 'No playable stream for this track.',
              });
              return;
            }

            const inferred = inferFormatFromUrl(finalStreamUrl);
            const trackToPlay = {
              ...track,
              streamURL: finalStreamUrl,
              url: finalStreamUrl,
              format: track.format || inferred,
            };

            set({ currentTrack: trackToPlay });

            audio.preload = 'auto';
            audio.volume = state.isMuted ? 0 : state.volume;
            audio.src = `/api/stream?url=${encodeURIComponent(finalStreamUrl)}`;
            audio.load();

            await audio.play().catch(() => {
              if (stale()) return;
              set({
                isLoadingPlayback: false,
                isPlaying: false,
                playbackError: 'Could not start playback (autoplay blocked or unsupported).',
              });
            });
          } catch {
            if (stale()) return;
            set({
              isLoadingPlayback: false,
              isPlaying: false,
              playbackError: 'Failed to resolve stream.',
            });
          }
        })();
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
          set({ isPlaying: true, playbackError: null });
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

      clearPlaybackError: () => set({ playbackError: null }),

      cleanup: () => {
        playSession += 1;
        const { audio } = get();
        stopTimeSync();
        audio?.pause();
        audio?.removeAttribute('src');
        set({ audio: null, isPlaying: false, isLoadingPlayback: false, playbackError: null });
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
