'use client';

import { Play, Pause, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { AppleMusicPlayIcon } from '@/components/icons/AppleMusicPlayIcon';

interface PlayButtonProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e: React.MouseEvent) => void;
  trackId?: string;
  className?: string;
  showPauseState?: boolean;
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const iconSizes = {
  sm: 14,
  md: 20,
  lg: 28,
};

export default function PlayButton({
  size = 'md',
  onClick,
  trackId,
  className,
  showPauseState = true,
}: PlayButtonProps) {
  const { currentTrack, isPlaying, isLoadingPlayback, togglePlayPause } = usePlayerStore();
  const { playerTheme } = useUIStore();
  const isThisTrack = currentTrack?.id === trackId;
  const showPause = showPauseState && isThisTrack && isPlaying;
  const showBuffering = isThisTrack && isLoadingPlayback && !isPlaying;

  return (
    <motion.button
      className={cn(
        'rounded-full bg-spotify-green text-white flex items-center justify-center',
        'shadow-lg shadow-black/30 hover:bg-spotify-green-hover hover:scale-105',
        'active:scale-95 transition-all duration-150',
        sizes[size],
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        if (isThisTrack) {
          togglePlayPause();
        } else {
          onClick?.(e);
        }
      }}
    >
      {showPause ? (
        <Pause size={iconSizes[size]} fill="white" />
      ) : showBuffering ? (
        <Loader2 size={iconSizes[size]} className="animate-spin text-white" aria-hidden />
      ) : playerTheme === 'apple' ? (
        <AppleMusicPlayIcon size={iconSizes[size]} className="text-white translate-x-px" />
      ) : (
        <Play size={iconSizes[size]} fill="white" className="ml-0.5" />
      )}
    </motion.button>
  );
}
