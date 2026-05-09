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
        'fixed bottom-[90px] left-0 right-0 z-40',
        'md:hidden flex items-center justify-around',
        'bg-card/95 backdrop-blur-md border-t border-border/30',
        'h-14 px-4'
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
              isActive ? 'text-foreground' : 'text-muted-foreground'
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
