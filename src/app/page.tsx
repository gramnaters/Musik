'use client';

import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import Sidebar from '@/components/layout/Sidebar';
import RightPanel from '@/components/layout/RightPanel';
import MobileNav from '@/components/layout/MobileNav';
import PlayerBar from '@/components/player/PlayerBar';
import NowPlaying from '@/components/player/NowPlaying';
import HomeView from '@/components/views/HomeView';
import SearchView from '@/components/views/SearchView';
import LibraryView from '@/components/views/LibraryView';
import AddonsView from '@/components/views/AddonsView';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function MainContent() {
  const { activeView, selectedPlaylistId } = useUIStore();

  return (
    <div className="flex-1 h-full overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeView}-${selectedPlaylistId || ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          {activeView === 'home' && <HomeView />}
          {activeView === 'search' && <SearchView />}
          {(activeView === 'library' || activeView === 'playlist') && <LibraryView />}
          {activeView === 'addons' && <AddonsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function AppPage() {
  const { initializeDefaults } = useLibraryStore();
  const { cleanup } = usePlayerStore();

  // Initialize default playlists on first load
  useEffect(() => {
    initializeDefaults();
  }, [initializeDefaults]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const { togglePlayPause, nextTrack, previousTrack, setVolume } =
        usePlayerStore.getState();

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            nextTrack();
          }
          break;
        case 'ArrowLeft':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            previousTrack();
          }
          break;
        case 'ArrowUp':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            const current = usePlayerStore.getState().volume;
            setVolume(Math.min(1, current + 0.05));
          }
          break;
        case 'ArrowDown':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            const current = usePlayerStore.getState().volume;
            setVolume(Math.max(0, current - 0.05));
          }
          break;
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* Top section: sidebar + main + right panel */}
      <div className="flex-1 flex flex-row overflow-hidden">
        <Sidebar />
        <MainContent />
        <RightPanel />
      </div>

      {/* Bottom Player Bar */}
      <PlayerBar />

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Now Playing Overlay */}
      <NowPlaying />
    </div>
  );
}
