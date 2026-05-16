'use client';

import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/playerStore';

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
  const { currentTrack, isPlaying, togglePlayPause } = usePlayerStore();
  const isThisTrack = currentTrack?.id === trackId;
  const showPause = showPauseState && isThisTrack && isPlaying;

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
      ) : (
        <Play size={iconSizes[size]} fill="white" className="ml-0.5" />
      )}
    </motion.button>
  );
}
