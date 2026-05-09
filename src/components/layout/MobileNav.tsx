'use client';

import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { Home, Search, Library, Puzzle } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { icon: Home, label: 'Home', view: 'home' as const },
  { icon: Search, label: 'Search', view: 'search' as const },
  { icon: Library, label: 'Library', view: 'library' as const },
  { icon: Puzzle, label: 'Addons', view: 'addons' as const },
];

export default function MobileNav() {
  const { activeView, navigateTo, setSelectedPlaylistId, playerTheme } = useUIStore();

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed left-0 right-0 z-30',
        'md:hidden flex items-center justify-around',
        'px-2 sm:px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]',
        'bottom-0',
        playerTheme === 'tidal' &&
          'bg-white/[0.07] backdrop-blur-2xl backdrop-saturate-200 border-t border-white/15 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]',
        playerTheme === 'spotify' &&
          'bg-card/95 backdrop-blur-md border-t border-border/30',
        playerTheme === 'apple' &&
          'bg-card/95 backdrop-blur-md border-t border-border/30'
      )}
    >
      {navItems.map((item) => {
        const isActive = activeView === item.view;
        return (
          <button
            key={item.view}
            onClick={() => {
              navigateTo(item.view);
              setSelectedPlaylistId(null);
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground',
              playerTheme === 'tidal' && (isActive ? 'text-white' : 'text-white/45')
            )}
          >
            <item.icon size={22} className={cn(
              isActive && playerTheme === 'spotify' && 'text-spotify-green',
              isActive && playerTheme === 'tidal' && 'text-cyan-400',
              isActive && playerTheme === 'apple' && 'text-apple-red'
            )} />
            <span className={cn(
              'text-[10px] font-medium',
              isActive && playerTheme === 'spotify' && 'text-spotify-green',
              isActive && playerTheme === 'tidal' && 'text-cyan-400',
              isActive && playerTheme === 'apple' && 'text-apple-red'
            )}>
              {item.label}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}
