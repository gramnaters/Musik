'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { useAudioSettingsStore } from '@/stores/audioSettingsStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { useDownloadStore } from '@/stores/downloadStore';
import { seekbarWrapperClass } from '@/lib/seekbar-styles';
import { getQualityBadgeForTrack, getQualityTooltip } from '@/lib/audio-quality';
import { Slider } from '@/components/ui/slider';
import { PlaybackSeekSlider } from '@/components/player/PlaybackSeekSlider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStreamingStore } from '@/stores/streamingStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Loader2, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, Heart, ListMusic, Maximize2,
  Mic2, ChevronUp, Disc3, Download, X,
} from 'lucide-react';
export default function PlayerBar() {
  const {
    currentTrack, isPlaying, isLoadingPlayback, playbackError, currentTime, duration,
    volume, isMuted, isShuffle, repeatMode,
    togglePlayPause, nextTrack, previousTrack,
    setVolume, toggleMute, toggleShuffle, cycleRepeat,
    setShowNowPlaying,
    clearPlaybackError,
  } = usePlayerStore();
  const { isFavourite, toggleFavourite } = useLibraryStore();
  const { rightPanel, setRightPanel, playerTheme, setPlayerTheme } = useUIStore();
  const { openDownload } = useDownloadStore();
  const { glassEffect } = useStreamingStore();
  const seekbarStyle = useAudioSettingsStore((s) => s.seekbarStyle);

  const isFav = currentTrack ? isFavourite(currentTrack.id) : false;
  const qualityBadge = getQualityBadgeForTrack(currentTrack ?? undefined);
  const qualityTip = getQualityTooltip(currentTrack ?? undefined);
  const showBuffering = Boolean(currentTrack && isLoadingPlayback && !isPlaying);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {playbackError && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/95 text-red-100 text-xs border-b border-red-900/60 shrink-0">
            <span className="flex-1 min-w-0 truncate text-center">{playbackError}</span>
            <button
              type="button"
              onClick={() => clearPlaybackError()}
              className="shrink-0 p-1 rounded-md hover:bg-red-900/60 text-red-100"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <motion.div
        initial={playerTheme === 'tidal' ? { opacity: 0 } : { y: 100 }}
        animate={playerTheme === 'tidal' ? { opacity: 1 } : { y: 0 }}
        transition={{ duration: 0.3 }}
        data-glass={glassEffect}
        className={cn(
          'flex-shrink-0 flex flex-col transition-all duration-500',
          playerTheme === 'spotify' &&
            'bg-black/40 backdrop-blur-3xl border-t border-white/5 h-[90px] px-2 sm:px-4 items-center justify-center text-white',
          playerTheme === 'tidal' && 'tidal-glass-player text-white',
          playerTheme === 'apple' &&
            'h-[90px] w-full rounded-none m-0 px-2 sm:px-4 items-center justify-center bg-black/65 backdrop-blur-2xl text-white',
          'md:z-50'
        )}
      >
        {playerTheme === 'tidal' ? (
          <div className="w-full h-full relative flex flex-col">
            <div className="tidal-player-grid w-full h-full max-w-full min-w-0 relative z-10 box-border px-5 py-2.5">
              {/* Track info */}
              <div className="pb-track tidal-pb-track flex items-center min-w-0 h-full gap-3">
                {currentTrack ? (
                  <>
                    <div
                      className="pb-thumb tidal-pb-thumb shrink-0 h-[52px] w-[52px] rounded-[6px] shadow-lg cursor-pointer"
                      style={{ background: currentTrack.albumCover ? `url(${currentTrack.albumCover}) center/cover` : 'linear-gradient(135deg,#667eea,#764ba2)' }}
                      onClick={() => setShowNowPlaying(true)}
                    />
                    <div className="tidal-pb-meta flex min-w-0 flex-col justify-center">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div
                          className="tidal-pb-title pb-title min-w-0 cursor-pointer truncate font-bold text-[14px] leading-tight hover:underline text-white"
                          onClick={() => setShowNowPlaying(true)}
                          role="button"
                          tabIndex={0}
                        >
                          {currentTrack.title}
                        </div>
                        {currentTrack.explicit && (
                          <span className="shrink-0 text-[8px] font-bold px-1 rounded-[1px] h-3.5 flex items-center bg-white/20 text-white/70">E</span>
                        )}
                        {qualityBadge && (
                          <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-[2px] bg-white/10 text-white/80 border border-white/10">
                            {qualityBadge.label}
                          </span>
                        )}
                      </div>
                      <p className="tidal-pb-artist pb-artist truncate text-[12px] text-white/50 font-medium hover:underline mt-0.5">
                        {currentTrack.artist} {currentTrack.album && <span className="text-white/30 ml-1 font-normal">• {currentTrack.album}</span>}
                      </p>
                    </div>
                    {/* Heart and Options Buttons right next to meta */}
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button 
                        className={cn("p-1.5 rounded-full hover:bg-white/5 transition-colors", isFav ? "text-cyan-400" : "text-white/40 hover:text-white")}
                        onClick={() => toggleFavourite(currentTrack)}
                      >
                        <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                      </button>
                      <button 
                        className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                        onClick={() => currentTrack && openDownload(currentTrack)}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <circle cx="5" cy="12" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="19" cy="12" r="2" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 opacity-30">
                    <div className="h-12 w-12 rounded-[6px] bg-white/10" />
                    <div className="space-y-1">
                      <div className="h-3 w-24 bg-white/20 rounded-full" />
                      <div className="h-2 w-16 bg-white/10 rounded-full" />
                    </div>
                  </div>
                )}
              </div>

              {/* Transport & Seekbar */}
              <div className="pb-center flex flex-col items-center justify-center h-full gap-1.5">
                {/* Control Buttons */}
                <div className="flex items-center gap-7">
                  <button className="ctrl hover:text-white transition-colors animate-in fade-in" onClick={toggleShuffle} style={{ color: isShuffle ? '#00FFFF' : 'rgba(255,255,255,0.4)' }}>
                    <Shuffle size={18} />
                  </button>
                  <button className="ctrl hover:text-white transition-colors" onClick={previousTrack} style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <SkipBack size={22} fill="currentColor" />
                  </button>
                  <button className="tidal-play-btn" onClick={togglePlayPause}>
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : showBuffering ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button className="ctrl hover:text-white transition-colors" onClick={nextTrack} style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <SkipForward size={22} fill="currentColor" />
                  </button>
                  <button className="ctrl hover:text-white transition-colors" onClick={cycleRepeat} style={{ color: repeatMode !== 'off' ? '#00FFFF' : 'rgba(255,255,255,0.4)' }}>
                    {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                  </button>
                </div>
                
                {/* Progress bar */}
                <div className="flex items-center gap-3 w-full max-w-[850px] px-2">
                  <span className="text-[11px] w-10 text-right tabular-nums text-white/50">
                    {currentTrack ? formatDuration(currentTime) : ''}
                  </span>
                  <div className="flex-1 min-w-0">
                    <PlaybackSeekSlider sliderClassName="tidal-progress-slider w-full" />
                  </div>
                  <span className="text-[11px] w-10 tabular-nums text-white/50">
                    {currentTrack && duration ? formatDuration(duration) : ''}
                  </span>
                </div>
              </div>

              {/* Volume & Actions */}
              <div className="pb-right flex items-center justify-end h-full gap-3">
                {/* Download */}
                <button 
                  className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                  onClick={() => currentTrack && openDownload(currentTrack)}
                  title="Download"
                >
                  <Download size={18} />
                </button>

                {/* Lyrics / Now Playing */}
                <button 
                  className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                  onClick={() => setShowNowPlaying(true)}
                  title="Lyrics"
                >
                  <Mic2 size={18} />
                </button>

                {/* Queue / ListMusic */}
                <button 
                  className={cn("p-2 rounded-full hover:bg-white/5 transition-colors", rightPanel === 'queue' ? 'text-cyan-400' : 'text-white/60 hover:text-white')} 
                  onClick={() => setRightPanel(rightPanel === 'queue' ? 'none' : 'queue')}
                  title="Queue"
                >
                  <ListMusic size={18} />
                </button>

                {/* Cycle Style / Maximize2 */}
                <button 
                  className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                  onClick={() => {
                    const themes: ('spotify' | 'tidal' | 'apple')[] = ['spotify', 'tidal', 'apple'];
                    const next = themes[(themes.indexOf(playerTheme) + 1) % themes.length];
                    setPlayerTheme(next);
                  }}
                  title="Cycle Theme"
                >
                  <Maximize2 size={18} />
                </button>

                {/* Volume icon & slider */}
                <div className="flex items-center gap-2 group mr-1">
                  <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors">
                    <VolumeIcon size={18} />
                  </button>
                  <input 
                    type="range" 
                    className="vol-slider w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white" 
                    min="0" max="100" 
                    value={isMuted ? 0 : volume * 100} 
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    style={{ 
                      background: `linear-gradient(to right, #fff ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.1) ${isMuted ? 0 : volume * 100}%)` 
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full h-full relative">
            {/* Left column - Track info */}
            <div className="flex min-w-0 w-[30%] items-center gap-2 sm:gap-3">
<AnimatePresence mode="wait">
                {currentTrack ? (
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
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
                          <MusicIcon size={20} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0">
<div className="flex min-w-0 items-center gap-3">
                         <p className="min-w-0 truncate text-sm font-medium text-white hover:underline cursor-pointer pr-2">
                           {currentTrack.title}
                         </p>
                         {currentTrack.explicit && (
                           <span className="shrink-0 text-[8px] font-bold px-1 rounded-[1px] h-3.5 flex items-center bg-white/20 text-white/70">E</span>
                         )}
                         {qualityBadge && (
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <span
                                 className={cn(
                                   'shrink-0 text-[8px] font-black px-1 rounded-[1px] h-3.5 flex items-center cursor-default',
                                   qualityBadge.label === 'HD' && 'bg-[#E5D283] text-black shadow-[0_0_8px_rgba(229,210,131,0.4)]',
                                   qualityBadge.label === 'HIFI' && 'bg-[#45b7d1] text-black shadow-[0_0_8px_rgba(69,183,209,0.4)]',
                                   qualityBadge.label === 'HIGH' && 'bg-white/15 text-white/90 border border-white/25',
                                   qualityBadge.label === 'MP3' && 'bg-white/12 text-white/85 border border-white/20',
                                   qualityBadge.label === 'AAC' && 'bg-white/12 text-white/85 border border-white/20',
                                   qualityBadge.label === 'NORMAL' && 'bg-white/10 text-white/60',
                                   qualityBadge.label === 'LOW' && 'bg-white/5 text-white/35',
                                   qualityBadge.label === 'ATMOS' && 'bg-gradient-to-r from-blue-500 to-purple-500 text-white',
                                   (!qualityBadge.label || qualityBadge.label.length === 0) && 'hidden'
                                 )}
                               >
                                 {qualityBadge.label === 'ATMOS' ? (
                                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                                   </svg>
                                 ) : (
                                   qualityBadge.label
                                 )}
                               </span>
                             </TooltipTrigger>
                             <TooltipContent side="top" className="max-w-xs border border-white/15 bg-neutral-950 text-white text-xs px-2 py-1.5">
                               {qualityTip}
                             </TooltipContent>
                           </Tooltip>
                         )}
<Button
                           variant="ghost"
                           size="icon"
                           onClick={() => toggleFavourite(currentTrack)}
                           className={cn(
                             'h-6 w-6 shrink-0 p-0 ml-1',
                             playerTheme === 'spotify' &&
                               (isFav ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/55 hover:text-white'),
                             playerTheme === 'apple' &&
                               (isFav ? 'text-pink-400 hover:text-pink-400' : 'text-white/45 hover:text-white')
                           )}
                           aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                         >
                          <Heart size={14} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
                        </Button>
<Button
                           variant="ghost"
                           size="icon"
                           onClick={() => setShowNowPlaying(true)}
                           className={cn(
                             'h-6 w-6 shrink-0 p-0 rounded-md border border-white/22 bg-white/[0.07] text-white/75 hover:bg-white/12 hover:text-white hidden sm:inline-flex ml-1'
                           )}
                           aria-label="Open full player"
                         >
                          <ChevronUp className="size-3.5" strokeWidth={2} />
                        </Button>
                      </div>
                      <p className="min-h-[1.2em] truncate text-[11px] leading-snug text-white/55 hover:underline cursor-pointer">
                        {currentTrack.artist}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                      <MusicIcon size={20} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/45">No track playing</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Center column - Controls + Progress */}
            <div className="flex flex-col items-center gap-1 w-[40%] max-w-[722px]">
              {/* Controls */}
              <div className="flex items-center gap-5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleShuffle()}
                      className={cn(
                        'h-10 w-10 hidden sm:flex',
                        playerTheme === 'spotify' &&
                          (isShuffle ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/55 hover:text-white'),
                        playerTheme === 'apple' &&
                          (isShuffle ? 'text-white hover:text-white' : 'text-white/40 hover:text-white/90')
                      )}
                    >
                      <Shuffle size={20} />
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
                      className="h-10 w-10 text-white/70 hover:text-white"
                    >
                      <SkipBack size={24} fill="currentColor" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                    <p>Previous</p>
                  </TooltipContent>
                </Tooltip>

                {/* ===== PLAY BUTTON ===== */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    {playerTheme === 'spotify' ? (
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        disabled={!currentTrack}
                        aria-label={isPlaying ? 'Pause' : showBuffering ? 'Loading' : 'Play'}
                        className={cn(
                          'h-10 w-10 shrink-0 rounded-full flex items-center justify-center',
                          'bg-white text-black shadow-lg shadow-black/40',
                          'transition-transform duration-150 ease-out',
                          'hover:scale-[1.06] active:scale-[0.96] hover:bg-white',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DB954]/50'
                        )}
                      >
                        {isPlaying ? (
                          <Pause size={20} fill="black" strokeWidth={0} />
                        ) : showBuffering ? (
                          <Loader2 size={20} className="animate-spin text-black" aria-hidden />
                        ) : (
                          <Play size={20} fill="black" strokeWidth={0} className="translate-x-[1px]" />
                        )}
                      </button>
                    ) : playerTheme === 'apple' ? (
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        disabled={!currentTrack}
                        aria-label={isPlaying ? 'Pause' : showBuffering ? 'Loading' : 'Play'}
                        className={cn(
                          'h-12 w-12 shrink-0 flex items-center justify-center rounded-full',
                          'bg-transparent text-white border-0 shadow-none',
                          'transition-transform duration-200 ease-out',
                          'hover:scale-[1.05] active:scale-[0.96]',
                          'disabled:opacity-30 disabled:cursor-not-allowed',
                          'focus-visible:outline-none'
                        )}
                      >
                        <span className="w-8 h-8 flex items-center justify-center pointer-events-none">
                          {isPlaying ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <rect x="6" y="5" width="4.5" height="14" rx="1.2" />
                              <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" />
                            </svg>
                          ) : showBuffering ? (
                            <Loader2 size={28} className="animate-spin text-white" aria-hidden />
                          ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M8 5.5v13L19 12 8 5.5z" />
                            </svg>
                          )}
                        </span>
                      </button>
                    ) : (
                      /* Tidal fallback */
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={togglePlayPause}
                        disabled={!currentTrack}
                        className="h-11 w-11 shrink-0 rounded-full bg-white/95 text-black hover:bg-white hover:scale-105 disabled:opacity-50 transition-all"
                      >
                        {isPlaying ? (
                          <Pause size={20} fill="black" stroke="black" />
                        ) : showBuffering ? (
                          <Loader2 size={20} className="animate-spin text-black" aria-hidden />
                        ) : (
                          <Play size={20} fill="black" stroke="black" className="translate-x-[1px]" />
                        )}
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                    <p>{isPlaying ? 'Pause' : showBuffering ? 'Loading' : 'Play'}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextTrack}
                      className="h-10 w-10 text-white/70 hover:text-white"
                    >
                      <SkipForward size={24} fill="currentColor" />
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
                        'h-10 w-10 hidden sm:flex',
                        playerTheme === 'spotify' &&
                          (repeatMode !== 'off'
                            ? 'text-[#1DB954] hover:text-[#1DB954]'
                            : 'text-white/55 hover:text-white'),
                        playerTheme === 'apple' &&
                          (repeatMode !== 'off'
                            ? 'text-white hover:text-white'
                            : 'text-white/40 hover:text-white/90')
                      )}
                    >
                      {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
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
              <div className="flex items-center gap-3 w-full max-w-[600px]">
                <span className="text-[11px] w-10 text-right tabular-nums text-white/50">
                  {currentTrack ? formatDuration(currentTime) : ''}
                </span>
                <div
                  className={cn(
                    'flex-1 min-w-0',
                    seekbarWrapperClass(seekbarStyle),
                    playerTheme === 'spotify'
                      ? 'spotify-progress'
                      : playerTheme === 'apple'
                        ? cn('apple-progress', 'apple-playerbar-scrubber')
                        : 'enhanced-seekbar'
                  )}
                >
                  <PlaybackSeekSlider />
                </div>
                <span className="text-[11px] w-10 tabular-nums text-white/50">
                  {currentTrack && duration ? formatDuration(duration) : ''}
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
                      disabled={!currentTrack}
                      onClick={() => currentTrack && openDownload(currentTrack)}
                      className="h-8 w-8 text-white/50 hover:text-white hidden md:flex"
                      aria-label="Download track"
                      title="Download"
                    >
                      <Download size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                    <p>Download</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowNowPlaying(true)}
                      className="h-8 w-8 text-white/50 hover:text-white hidden lg:flex"
                    >
                      <Mic2 size={16} />
                    </Button>
                  </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                  <p>Now Playing View</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRightPanel(rightPanel === 'queue' ? 'none' : 'queue')}
                    className={cn(
                      'h-8 w-8 hidden md:flex',
                      playerTheme === 'spotify' &&
                        (rightPanel === 'queue' ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/50 hover:text-white'),
                      playerTheme === 'apple' &&
                        (rightPanel === 'queue' ? 'text-white hover:text-white' : 'text-white/45 hover:text-white')
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
                      onClick={() => {
                        const themes: ('spotify' | 'tidal' | 'apple')[] = ['spotify', 'tidal', 'apple'];
                        const next = themes[(themes.indexOf(playerTheme) + 1) % themes.length];
                        setPlayerTheme(next);
                      }}
                      className="h-8 w-8 text-white/50 hover:text-white mr-2"
                    >
                      <Maximize2 size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                    <p>Cycle player style</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="h-8 w-8 text-white/50 hover:text-white"
                    >
                      <VolumeIcon size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                    <p>{isMuted ? 'Unmute' : 'Mute'}</p>
                  </TooltipContent>
                </Tooltip>

                <div className={cn('w-24 hidden md:block', playerTheme === 'spotify' ? 'spotify-volume' : 'enhanced-seekbar')}>
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

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNowPlaying(true)}
                className="h-8 w-8 text-white/50 hover:text-white flex lg:hidden ml-1"
              >
                <ChevronUp size={20} />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
      </>
    </TooltipProvider>
  );
}

function MusicIcon({ size, className }: { size: number; className?: string }) {
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
