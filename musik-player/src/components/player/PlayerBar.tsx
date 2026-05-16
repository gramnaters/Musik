'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, Heart, ListMusic, Maximize2,
  Mic2, ChevronUp,
} from 'lucide-react';

export default function PlayerBar() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    volume, isMuted, isShuffle, repeatMode,
    togglePlayPause, nextTrack, previousTrack,
    seekTo, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    setShowNowPlaying,
  } = usePlayerStore();
  const { isFavourite, toggleFavourite } = useLibraryStore();
  const { rightPanel, setRightPanel } = useUIStore();

  const isFav = currentTrack ? isFavourite(currentTrack.id) : false;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className={cn(
          'h-[90px] flex-shrink-0 flex items-center px-4',
          'bg-card border-t border-border/30',
          'z-50'
        )}
      >
        <div className="flex items-center justify-between w-full gap-4">
          {/* Left column - Track info */}
          <div className="flex items-center gap-3 w-[30%] min-w-0">
            <AnimatePresence mode="wait">
              {currentTrack ? (
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-accent shadow-lg">
                    {currentTrack.albumCover ? (
                      <img
                        src={currentTrack.albumCover}
                        alt={currentTrack.album}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-accent flex items-center justify-center">
                        <Music size={20} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate hover:underline cursor-pointer">
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate hover:underline cursor-pointer hover:text-foreground">
                      {currentTrack.artist}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavourite(currentTrack)}
                    className={cn(
                      'h-8 w-8 flex-shrink-0 hidden sm:flex',
                      isFav ? 'text-spotify-green hover:text-spotify-green' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                  </Button>
                </motion.div>
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                    <Music size={20} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">No track playing</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Center column - Controls + Progress */}
          <div className="flex flex-col items-center gap-1 w-[40%] max-w-[722px]">
            {/* Controls */}
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleShuffle}
                    className={cn(
                      'h-8 w-8 hidden sm:flex',
                      isShuffle ? 'text-spotify-green hover:text-spotify-green' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Shuffle size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                  <p>{isShuffle ? 'Disable shuffle' : 'Enable shuffle'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={previousTrack}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <SkipBack size={16} fill="currentColor" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                  <p>Previous</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={togglePlayPause}
                    disabled={!currentTrack}
                    className={cn(
                      'w-9 h-9 rounded-full bg-spotify-green flex items-center justify-center',
                      'hover:bg-spotify-green-hover hover:scale-105 active:scale-95 transition-all',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'shadow-lg shadow-black/20'
                    )}
                  >
                    {isPlaying ? (
                      <Pause size={18} fill="white" className="text-white" />
                    ) : (
                      <Play size={18} fill="white" className="text-white ml-0.5" />
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                  <p>{isPlaying ? 'Pause' : 'Play'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextTrack}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <SkipForward size={16} fill="currentColor" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                  <p>Next</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cycleRepeat}
                    className={cn(
                      'h-8 w-8 hidden sm:flex',
                      repeatMode !== 'off'
                        ? 'text-spotify-green hover:text-spotify-green'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                    {repeatMode !== 'off' && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-spotify-green" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                  <p>
                    {repeatMode === 'off' ? 'Enable repeat' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 w-full max-w-[600px]">
              <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                {currentTrack ? formatDuration(currentTime) : '-:--'}
              </span>
              <div className="spotify-progress flex-1">
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={(value) => seekTo(value[0])}
                  disabled={!currentTrack}
                  className="w-full cursor-pointer"
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 tabular-nums">
                {currentTrack && duration ? formatDuration(duration) : '-:--'}
              </span>
            </div>
          </div>

          {/* Right column - Volume + Extras */}
          <div className="flex items-center justify-end gap-1 w-[30%] min-w-[120px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNowPlaying(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hidden lg:flex"
                >
                  <ChevronUp size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                <p>Now Playing</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRightPanel(rightPanel === 'queue' ? 'none' : 'queue')}
                  className={cn(
                    'h-8 w-8 hidden lg:flex',
                    rightPanel === 'queue' ? 'text-spotify-green' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ListMusic size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                <p>Queue</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-1 ml-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <VolumeIcon size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                  <p>{isMuted ? 'Unmute' : 'Mute'}</p>
                </TooltipContent>
              </Tooltip>

              <div className="spotify-volume w-24 hidden md:block">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setVolume(value[0] / 100)}
                  className="w-full cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}

function Music({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
