'use client';

import { create } from 'zustand';
import type { Track } from '@/types/music';

export type DownloadStatus = 'idle' | 'resolving' | 'fetching' | 'tagging' | 'done' | 'error';

export interface DownloadTask {
  id: string;
  track: Track;
  progress: number;
  status: DownloadStatus;
  error?: string;
  filename?: string;
}

interface DownloadStore {
  tasks: Record<string, DownloadTask>;
  
  /** Starts a one-click download for a track */
  startDownload: (track: Track) => void;
  
  /** Internal: update task progress/status */
  updateTask: (id: string, update: Partial<DownloadTask>) => void;
  
  /** Internal: remove task after completion or error */
  removeTask: (id: string) => void;
  
  /** Compatibility: for old code that might still call this */
  openDownload: (track: Track) => void;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  tasks: {},
  
  startDownload: async (track) => {
    const id = track.id;
    if (get().tasks[id]) return; // Already downloading

    set((state) => ({
      tasks: {
        ...state.tasks,
        [id]: {
          id,
          track,
          progress: 0,
          status: 'resolving',
        }
      }
    }));

    // Trigger the actual download logic
    const { downloadSingleTrack } = await import('@/lib/download-track');
    void downloadSingleTrack(track);
  },

  updateTask: (id, update) => set((state) => ({
    tasks: {
      ...state.tasks,
      [id]: state.tasks[id] ? { ...state.tasks[id], ...update } : undefined as any
    }
  })),

  removeTask: (id) => set((state) => {
    const newTasks = { ...state.tasks };
    delete newTasks[id];
    return { tasks: newTasks };
  }),

  // For now, redirect openDownload to startDownload for one-click experience
  openDownload: (track) => {
    get().startDownload(track);
  },
}));
