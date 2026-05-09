'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, Heart, X, ListMusic, ChevronDown,
} from 'lucide-react';

export default function NowPlaying() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    volume, isMuted, isShuffle, repeatMode,
    togglePlayPause, nextTrack, previousTrack,
    seekTo, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    showNowPlaying, setShowNowPlaying,
  } = usePlayerStore();
  const { setRightPanel, playerTheme } = useUIStore();
  const { isFavourite, toggleFavourite } = useLibraryStore();

  const isFav = currentTrack ? isFavourite(currentTrack.id) : false;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      {showNowPlaying && currentTrack && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[100] flex flex-col"
        >
          {/* Background gradient */}
          {playerTheme === 'spotify' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-[#503750] via-spotify-black to-spotify-black" />
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: currentTrack.albumCover ? `url(${currentTrack.albumCover})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(60px) saturate(2)',
                }}
              />
            </>
          )}
          {playerTheme === 'tidal' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" />
          )}
          {playerTheme === 'apple' && (
            <div className="absolute inset-0 bg-[#1c1c1e]">
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage: currentTrack.albumCover ? `url(${currentTrack.albumCover})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(80px) saturate(1.8)',
                }}
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl" />
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNowPlaying(false)}
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <ChevronDown size={24} />
              </Button>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wider text-white/70">Now Playing</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNowPlaying(false);
                  setRightPanel('queue');
                }}
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <ListMusic size={20} />
              </Button>
            </div>

            {/* Album Art + Info */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
              <motion.div
                key={currentTrack.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-[min(80vw,400px)] aspect-square rounded-lg overflow-hidden shadow-2xl shadow-black/60"
              >
                {currentTrack.albumCover ? (
                  <img
                    src={currentTrack.albumCover}
                    alt={currentTrack.album}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-accent/30 flex items-center justify-center">
                    <svg className="w-24 h-24 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                )}
              </motion.div>

              <div className="w-full max-w-[min(80vw,400px)] text-center">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-bold text-white truncate">{currentTrack.title}</h2>
                  <button
                    onClick={() => toggleFavourite(currentTrack)}
                    className={cn(
                      'flex-shrink-0 transition-colors',
                      isFav ? 'text-spotify-green' : 'text-white/50 hover:text-white'
                    )}
                  >
                    <Heart size={20} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="text-base text-white/70 mt-1 truncate">{currentTrack.artist}</p>
                {currentTrack.quality && currentTrack.quality !== 'Normal' && (
                  <div className="flex justify-center mt-2">
                    <span className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded-[2px] tracking-wider",
                      currentTrack.quality === 'Master' || currentTrack.quality === 'MQA' ? "bg-cyan-400 text-black" : "border border-white/30 text-white"
                    )}>
                      {currentTrack.quality}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls + Progress */}
            <div className="p-6 md:p-8 pb-12 md:pb-16 space-y-4">
              {/* Progress */}
              <div className="w-full max-w-[min(90vw,600px)] mx-auto">
                <div className={cn('w-full cursor-pointer', playerTheme === 'spotify' ? 'spotify-progress' : 'enhanced-seekbar')}>
                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={(value) => seekTo(value[0])}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-white/50 tabular-nums">
                    {formatDuration(currentTime)}
                  </span>
                  <span className="text-xs text-white/50 tabular-nums">
                    {formatDuration(duration)}
                  </span>
                </div>
              </div>

              {/* Main controls */}
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleShuffle}
                  className={cn(
                    'h-10 w-10 text-white hover:bg-white/10',
                    isShuffle ? 'text-spotify-green' : 'text-white/70'
                  )}
                >
                  <Shuffle size={20} />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previousTrack}
                  className="h-10 w-10 text-white hover:bg-white/10"
                >
                  <SkipBack size={24} fill="currentColor" />
                </Button>

                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={togglePlayPause}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                    playerTheme === 'spotify' && "bg-white text-black",
                    playerTheme === 'tidal' && "bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]",
                    playerTheme === 'apple' && "bg-white text-black"
                  )}
                >
                  {isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                  )}
                </motion.button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextTrack}
                  className="h-10 w-10 text-white hover:bg-white/10"
                >
                  <SkipForward size={24} fill="currentColor" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleRepeat}
                  className={cn(
                    'h-10 w-10 text-white hover:bg-white/10',
                    repeatMode !== 'off' ? 'text-spotify-green' : 'text-white/70'
                  )}
                >
                  {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                </Button>
              </div>

              {/* Volume */}
              <div className="flex items-center justify-center gap-3 w-full max-w-[min(90vw,400px)] mx-auto">
                <Volume2 size={16} className="text-white/50" />
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setVolume(value[0] / 100)}
                  className="flex-1 cursor-pointer"
                />
                <VolumeIcon size={16} className="text-white/50" onClick={toggleMute} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
