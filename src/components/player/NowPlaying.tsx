'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAudioSettingsStore } from '@/stores/audioSettingsStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { getQualityBadge } from '@/lib/audio-quality';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, Heart, ListMusic, ChevronDown, Download, Disc3,
} from 'lucide-react';
import { downloadCurrentTrack } from '@/lib/download-track';
import { seekbarWrapperClass } from '@/lib/seekbar-styles';

export default function NowPlaying() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    volume, isMuted, isShuffle, repeatMode,
    togglePlayPause, nextTrack, previousTrack,
    seekTo, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    showNowPlaying, setShowNowPlaying,
  } = usePlayerStore();
  const { setRightPanel, playerTheme } = useUIStore();
  const seekbarStyle = useAudioSettingsStore((s) => s.seekbarStyle);
  const { isFavourite, toggleFavourite } = useLibraryStore();

  const isFav = currentTrack ? isFavourite(currentTrack.id) : false;
  const qualityBadge = getQualityBadge(currentTrack?.quality);
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
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

              <div className="w-full max-w-[min(80vw,400px)] text-left">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white truncate min-w-0 flex-1">
                    {currentTrack.title}
                  </h2>
                  {qualityBadge && (
                    <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-[2px] tracking-wider bg-black/80 text-white border border-white/15">
                      {qualityBadge.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleFavourite(currentTrack)}
                    className={cn(
                      'shrink-0 rounded-full p-1.5 transition-colors',
                      isFav ? 'text-pink-500' : 'text-white/50 hover:text-white'
                    )}
                    aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                  >
                    <Heart size={22} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="text-[15px] text-white/70 truncate mt-2">{currentTrack.artist}</p>
                <div className="flex items-center gap-1.5 min-h-[22px] text-sm text-white/55 mt-1">
                  {currentTrack.album?.trim() ? (
                    <>
                      <Disc3 className="size-4 shrink-0 opacity-80" aria-hidden />
                      <span className="truncate">{currentTrack.album}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Controls + Progress */}
            <div className="p-6 md:p-8 pb-12 md:pb-16 space-y-4">
              {/* Progress */}
              <div className="w-full max-w-[min(90vw,600px)] mx-auto">
                <div
                  className={cn(
                    'w-full cursor-pointer min-w-0',
                    seekbarWrapperClass(seekbarStyle),
                    playerTheme === 'spotify' ? 'spotify-progress' : 'enhanced-seekbar'
                  )}
                >
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

                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={togglePlayPause}
                  className={cn(
                    'w-14 h-14 rounded-full shrink-0 p-0 transition-[opacity,box-shadow,filter] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                    playerTheme === 'spotify' && 'bg-white text-black hover:opacity-[0.93]',
                    playerTheme === 'tidal' &&
                      'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:opacity-[0.93]',
                    playerTheme === 'apple' && 'bg-white text-black hover:opacity-[0.93]'
                  )}
                >
                  {isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                  )}
                </Button>

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

              {/* Volume + download */}
              <div className="flex items-center justify-center gap-3 w-full max-w-[min(90vw,400px)] mx-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Download track"
                  className="text-white/50 hover:bg-white/10 hover:text-white h-10 w-10 shrink-0"
                  onClick={() => void downloadCurrentTrack(currentTrack)}
                >
                  <Download size={18} />
                </Button>
                <Volume2 size={16} className="text-white/50 shrink-0" />
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => setVolume(value[0] / 100)}
                  className="flex-1 min-w-0 cursor-pointer"
                />
                <VolumeIcon size={16} className="text-white/50 shrink-0 cursor-pointer" onClick={toggleMute} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
