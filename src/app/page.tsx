'use client';

import { useEffect, useCallback, Suspense } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { useMetadataStore } from '@/stores/metadataStore';
import Sidebar from '@/components/layout/Sidebar';
import RightPanel from '@/components/layout/RightPanel';
import MobileNav from '@/components/layout/MobileNav';
import PlayerBar from '@/components/player/PlayerBar';
import NowPlaying from '@/components/player/NowPlaying';
import { EqualizerOutlet } from '@/components/audio/EqualizerOutlet';
import HomeView from '@/components/views/HomeView';
import SearchView from '@/components/views/SearchView';
import LibraryView from '@/components/views/LibraryView';
import AddonsView from '@/components/views/AddonsView';
import SettingsView from '@/components/views/SettingsView';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function MainContent() {
  const { activeView, selectedPlaylistId, playerTheme } = useUIStore();

  return (
    <div className={cn(
      "flex-1 h-full min-h-0 overflow-hidden flex flex-col transition-colors",
      playerTheme === 'tidal' ? "bg-transparent" : "bg-background"
    )}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeView}-${selectedPlaylistId || ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="h-full min-h-0 flex flex-col overflow-hidden"
        >
          {activeView === 'home' && (
            <Suspense fallback={null}>
              <HomeView />
            </Suspense>
          )}
          {activeView === 'search' && <SearchView />}
          {(activeView === 'library' || activeView === 'playlist') && <LibraryView />}
          {activeView === 'connections' && <AddonsView />}
          {activeView === 'settings' && <SettingsView />}
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

  // Migrate persisted catalog choice away from removed Apple catalog option
  useEffect(() => {
    const { catalogProvider, setCatalogProvider } = useMetadataStore.getState();
    if (catalogProvider === 'apple') setCatalogProvider('spotify');
  }, []);

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

  const { playerTheme } = useUIStore();

  return (
    <div className={cn(
      "h-screen w-screen flex flex-col overflow-hidden text-foreground relative transition-colors duration-500",
      playerTheme === 'tidal' ? "bg-black" : "bg-background"
    )}>
      {/* Global Liquify Background */}
      {playerTheme === 'tidal' && (
        <div className="liquify-bg-container fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="liquify-blob b1" style={{ 
            width: '520px', height: '520px', 
            background: 'radial-gradient(circle, #3b82f6, #6366f1)',
            top: '-120px', left: '-60px',
            animationDuration: '18s'
          }} />
          <div className="liquify-blob b2" style={{ 
            width: '400px', height: '400px', 
            background: 'radial-gradient(circle, #ec4899, #8b5cf6)',
            top: '60px', right: '-100px',
            animationDuration: '22s', animationDelay: '-8s'
          }} />
          <div className="liquify-blob b3" style={{ 
            width: '340px', height: '340px', 
            background: 'radial-gradient(circle, #06b6d4, #3b82f6)',
            bottom: '40px', left: '30%',
            animationDuration: '26s', animationDelay: '-14s'
          }} />
          <div className="liquify-blob b4" style={{ 
            width: '260px', height: '260px', 
            background: 'radial-gradient(circle, #f59e0b, #ec4899)',
            bottom: '-60px', right: '20%',
            animationDuration: '30s', animationDelay: '-20s'
          }} />
          <div className="absolute inset-0 bg-black/15 backdrop-blur-[80px]" />
        </div>
      )}

      {/* Top section: sidebar + main + right panel — extra bottom padding on mobile for fixed player + tab bar */}
      <div
        className={cn(
          'flex-1 flex flex-row overflow-hidden relative z-10',
          'max-md:pb-[calc(12rem+env(safe-area-inset-bottom,0px))] md:pb-0'
        )}
      >
        <Sidebar />
        <MainContent />
        <RightPanel />
      </div>

      {/* Player sits above mobile tab bar; tab bar is pinned to the bottom (see MobileNav) */}
      <div
        className={cn(
          'flex-shrink-0 w-full z-20',
          'max-md:fixed max-md:left-0 max-md:right-0',
          /* Pinned above bottom tab bar (nav row ~4.5rem + same safe-area inset) */
          'max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]',
          'md:relative'
        )}
      >
        <PlayerBar />
      </div>

      <MobileNav />

      {/* Now Playing Overlay */}
      <NowPlaying />

      <EqualizerOutlet />
    </div>
  );
}
