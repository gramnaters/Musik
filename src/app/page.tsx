'use client';

import { useEffect, useCallback, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { useMetadataStore } from '@/stores/metadataStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { useAddonStore } from '@/stores/addonStore';
import { useStreamingStore } from '@/stores/streamingStore';
import Sidebar from '@/components/layout/Sidebar';
import RightPanel from '@/components/layout/RightPanel';
import MobileNav from '@/components/layout/MobileNav';
import PlayerBar from '@/components/player/PlayerBar';
import NowPlaying from '@/components/player/NowPlaying';
import AppleNowPlaying from '@/components/player/AppleNowPlaying';
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
          {activeView === 'home' && <HomeView />}
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
  const [showSplash] = useState(false);

  // Migrate persisted catalog choice away from removed Apple catalog option
  useEffect(() => {
    const { catalogProvider, setCatalogProvider } = useMetadataStore.getState();
    if (catalogProvider === 'apple') setCatalogProvider('spotify');
  }, []);

  // Auto-install Jimmy addon and check updates on launch
  useEffect(() => {
    const timer = setTimeout(async () => {
      const store = useAddonStore.getState();
      // Install Jimmy if not already installed
      const hasJimmy = store.addons.some(a => a.manifest.id === 'jimmy' || (a.sourceId === 'jimmy-source'));
      if (!hasJimmy) {
        try {
          const res = await fetch('https://jimmy-iota.vercel.app/index.json');
          if (res.ok) {
            const data = await res.json();
            if (data.manifest) {
              store.addAddon(data.manifest, { sourceId: 'jimmy-source', installSourceUrl: 'https://jimmy-iota.vercel.app/index.json' });
              console.log('[Init] Installed Jimmy addon');
            }
          }
        } catch {}
      }
      store.checkForUpdates().catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
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
  const theme = useStreamingStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    const darkThemes = ['dark', 'ocean', 'purple', 'forest', 'mocha'];
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        root.classList.toggle('dark', e.matches);
      };
      root.classList.toggle('dark', mq.matches);
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    } else {
      root.classList.toggle('dark', darkThemes.includes(theme));
    }
  }, [theme]);

  return (
    <>
      {/* Splash screen removed */}

      <div className={cn(
        "h-screen w-screen flex flex-col overflow-hidden text-foreground relative transition-colors duration-500",
        playerTheme === 'tidal' ? "bg-[#060607]" : "bg-background"
      )}>
        {/* Main Layout */}
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
            'w-full z-[200] transition-all duration-500',
            playerTheme === 'tidal' 
              ? 'fixed inset-x-0 bottom-0 pointer-events-none' 
              : 'flex-shrink-0 max-md:fixed max-md:left-0 max-md:right-0 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:relative'
          )}
        >
          <div className="pointer-events-auto">
            <PlayerBar />
          </div>
        </div>

        <MobileNav />

        {/* Now Playing Overlay */}
        {playerTheme === 'apple' || playerTheme === 'spotify' ? <AppleNowPlaying /> : <NowPlaying />}

        <EqualizerOutlet />
      </div>
    </>
  );
}
