'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
import { useStreamQuality, formatLiveBadge, formatLiveTooltip } from '@/hooks/useStreamQuality';
import {
  Play, Pause, Loader2, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, Heart, ListMusic, Maximize2,
  Mic2, ChevronUp, ChevronsLeft, ChevronsRight, Disc3, Download, X,
} from 'lucide-react';
export default function PlayerBar() {
  const {
    currentTrack, isPlaying, isLoadingPlayback, playbackError, currentTime, duration,
    volume, isMuted, isShuffle, repeatMode,
    togglePlayPause, nextTrack, previousTrack,
    setVolume, toggleMute, toggleShuffle, cycleRepeat,
    showNowPlaying, setShowNowPlaying,
    openNowPlayingWithLyrics,
    clearPlaybackError,
  } = usePlayerStore();
  const { isFavourite, toggleFavourite } = useLibraryStore();
  const { rightPanel, setRightPanel, playerTheme, setPlayerTheme } = useUIStore();
  const { openDownload } = useDownloadStore();
  const { glassEffect, showQualityBadges } = useStreamingStore();
  const seekbarStyle = useAudioSettingsStore((s) => s.seekbarStyle);

  const isFav = currentTrack ? isFavourite(currentTrack.id) : false;
  const qualityBadge = getQualityBadgeForTrack(currentTrack ?? undefined);
  const liveQuality = useStreamQuality(currentTrack?.streamURL, currentTrack ? duration : undefined);
  const liveBadgeText = formatLiveBadge(liveQuality);
  const liveBadgeTitle = formatLiveTooltip(liveQuality, currentTrack?.quality);
  const qualityTip = getQualityTooltip(currentTrack ?? undefined);
  const showBuffering = Boolean(currentTrack && isLoadingPlayback && !isPlaying);

const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Auto-dismiss playback error after 4s
  useEffect(() => {
    if (playbackError) {
      const t = setTimeout(() => clearPlaybackError(), 4000);
      return () => clearTimeout(t);
    }
  }, [playbackError, clearPlaybackError]);

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {playbackError && (
          <div className="fixed bottom-24 right-4 z-[250] flex items-center gap-2 px-4 py-2.5 bg-black/90 backdrop-blur-md text-red-300 text-xs rounded-xl border border-red-900/40 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300 max-w-sm cursor-pointer"
            onClick={() => clearPlaybackError()}
          >
            <span className="flex-1 min-w-0">{playbackError}</span>
            <X size={12} className="shrink-0 text-red-400" />
          </div>
        )}

        {playerTheme === 'apple' ? (
          !showNowPlaying && <ApplePlayerBar visible={Boolean(currentTrack)} />
        ) : playerTheme === 'tidal' ? (
          <motion.div
            animate={{ y: currentTrack ? 0 : 300 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 1 }}
            data-glass={glassEffect}
            onClick={() => setShowNowPlaying(!showNowPlaying)}
            className="flex-shrink-0 flex flex-col fixed bottom-3 left-3 right-3 h-[88px] bg-[rgba(20,20,20,0.55)] backdrop-blur-[24px] backdrop-saturate-[180%] border-t border-white/[0.06] rounded-xl text-white z-[200] cursor-pointer"
            style={{ isolation: 'isolate' }}
          >
            <div className="w-full h-full relative flex flex-col">
              <div className="tidal-player-grid w-full h-full max-w-full min-w-0 relative z-10 box-border px-5 py-2.5">
                {/* Track info */}
                <div className="pb-track tidal-pb-track flex items-center min-w-0 h-full gap-3">
                  {currentTrack ? (
                    <>
                      <div
                        className="pb-thumb tidal-pb-thumb shrink-0 h-[52px] w-[52px] rounded-[4px] cursor-pointer"
                        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
                        style={{ background: currentTrack.albumCover ? `url(${currentTrack.albumCover}) center/cover` : 'linear-gradient(135deg,#667eea,#764ba2)' }}
                        onClick={() => setShowNowPlaying(!showNowPlaying)}
                      />
                      <div className="tidal-pb-meta flex min-w-0 flex-col justify-center">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <div
                            className="tidal-pb-title pb-title min-w-0 cursor-pointer truncate font-bold text-[14px] leading-tight hover:underline text-white"
                            onClick={() => setShowNowPlaying(!showNowPlaying)}
                            role="button"
                            tabIndex={0}
                          >
                            {currentTrack.title}
                          </div>
                          {currentTrack.explicit && (
                            <span className="shrink-0 text-[8px] font-bold px-1 rounded-[1px] h-3.5 flex items-center bg-white/20 text-white/70">E</span>
                          )}
                          {showQualityBadges && qualityBadge && !liveBadgeText && (
                            <span title={qualityBadge.tooltip} className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-[2px] bg-white/10 text-white/80 border border-white/10">
                              {qualityBadge.label}
                            </span>
                          )}
                          {showQualityBadges && liveBadgeText && (
                            <span title={liveBadgeTitle} className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-[2px] bg-white/10 text-white/80 border border-white/10">
                              {liveBadgeText}
                            </span>
                          )}
                        </div>
                        <p className="tidal-pb-artist pb-artist truncate text-[12px] text-white/45 font-medium hover:underline mt-0.5">
                          {currentTrack.artist} {currentTrack.album && <span className="text-white/30 ml-1 font-normal">&bull; {currentTrack.album}</span>}
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
                          onClick={(e) => { e.stopPropagation(); currentTrack && openDownload(currentTrack); }}
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

                {/* Transport */}
                <div className="pb-center flex flex-col items-center justify-center h-full gap-0">
                  {/* Control Buttons */}
                  <div className="flex items-center gap-4">
                    <button className="ctrl hover:text-white transition-colors animate-in fade-in" onClick={(e) => { e.stopPropagation(); toggleShuffle(); }} style={{ color: isShuffle ? '#00FFFF' : 'rgba(255,255,255,0.4)' }}>
                      <Shuffle size={16} />
                    </button>
                    <button className="ctrl hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); previousTrack(); }} style={{ color: '#ffffff' }}>
                      <SkipBack size={20} fill="currentColor" />
                    </button>
                    <button className="tidal-play-btn" onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}>
                      {isPlaying ? <Pause size={31} fill="currentColor" /> : showBuffering ? <Loader2 size={31} className="animate-spin" /> : <Play size={31} fill="currentColor" />}
                    </button>
                    <button className="ctrl hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); nextTrack(); }} style={{ color: '#ffffff' }}>
                      <SkipForward size={20} fill="currentColor" />
                    </button>
                    <button className="ctrl hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); cycleRepeat(); }} style={{ color: repeatMode !== 'off' ? '#00FFFF' : 'rgba(255,255,255,0.4)' }}>
                      {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                    </button>
                  </div>
                  {/* Apple Music-style progress bar with flanking timestamps */}
                  <div className="seek-container flex items-center gap-2 px-2 w-full justify-center -mt-[6px]" onClick={(e) => e.stopPropagation()}>
                    <span className="seek-timestamp text-[11px] tabular-nums text-white/45 w-8 text-right shrink-0">
                      {currentTrack ? formatDuration(currentTime) : '0:00'}
                    </span>
                    <div className="tidal-top-slider-wrapper max-w-[650px] flex-1">
                      <PlaybackSeekSlider />
                    </div>
                    <span className="seek-timestamp text-[11px] tabular-nums text-white/45 w-8 text-left shrink-0">
                      {currentTrack && duration ? formatDuration(duration) : '0:00'}
                    </span>
                  </div>
                </div>

                {/* Volume & Actions */}
                <div className="pb-right flex items-center justify-end h-full gap-3">
                  {/* Download */}
                  <button 
                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/75 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); currentTrack && openDownload(currentTrack); }}
                    title="Download"
                  >
                    <Download size={18} />
                  </button>

                  {/* Lyrics / Now Playing */}
                  <button 
                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/75 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); openNowPlayingWithLyrics(); }}
                    title="Lyrics"
                  >
                    <Mic2 size={18} />
                  </button>

                  {/* Queue / ListMusic */}
                  <button 
                    className={cn("p-2 rounded-full hover:bg-white/5 transition-colors", rightPanel === 'queue' ? 'text-cyan-400' : 'text-white/75 hover:text-white')} 
                    onClick={(e) => { e.stopPropagation(); setRightPanel(rightPanel === 'queue' ? 'none' : 'queue'); }}
                    title="Queue"
                  >
                    <ListMusic size={18} />
                  </button>

                  {/* Cycle Style / Maximize2 */}
                  <button 
                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/75 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
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
                    <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white/75 hover:text-white transition-colors">
                      <VolumeIcon size={18} />
                    </button>
                    <input 
                      type="range" 
                      className="vol-slider w-20 h-1 bg-white/[0.15] rounded-full appearance-none cursor-pointer accent-white" 
                      min="0" max="100" 
                      value={isMuted ? 0 : volume * 100} 
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); setVolume(Number(e.target.value) / 100); }}
                      style={{ 
                        background: `linear-gradient(to right, rgba(255,255,255,0.85) ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.15) ${isMuted ? 0 : volume * 100}%)` 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3 }}
            data-glass={glassEffect}
            className={cn(
              'flex-shrink-0 flex flex-col transition-all duration-500',
              'bg-black/40 backdrop-blur-3xl border-t border-white/5 h-[90px] px-2 sm:px-4 items-center justify-center text-white',
              'md:z-50'
            )}
          >
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
                          {showQualityBadges && qualityBadge && (
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
                        onClick={(e) => { e.stopPropagation(); toggleFavourite(currentTrack); }}
                            className={cn(
                              'h-6 w-6 shrink-0 p-0 ml-1',
                              isFav ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/55 hover:text-white'
                            )}
                            aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                          >
                            <Heart size={14} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowNowPlaying(!showNowPlaying)}
                            className="h-6 w-6 shrink-0 p-0 rounded-md border border-white/22 bg-white/[0.07] text-white/75 hover:bg-white/12 hover:text-white hidden sm:inline-flex ml-1"
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
                          isShuffle ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/55 hover:text-white'
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
                          repeatMode !== 'off' ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/55 hover:text-white'
                        )}
                      >
                        {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-popover text-popover-foreground border-border">
                      <p>{repeatMode === 'off' ? 'Enable repeat' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}</p>
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
                      'spotify-progress'
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
                      onClick={() => setShowNowPlaying(!showNowPlaying)}
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
                        rightPanel === 'queue' ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/50 hover:text-white'
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

                  <div className="w-24 hidden md:block spotify-volume">
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
                  onClick={() => setShowNowPlaying(!showNowPlaying)}
                  className="h-8 w-8 text-white/50 hover:text-white flex lg:hidden ml-1"
                >
                  <ChevronUp size={20} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
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

function ApplePlayerBar({ visible }: { visible: boolean }) {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, isMuted,
    togglePlayPause, nextTrack, previousTrack,
    setVolume, toggleMute, toggleShuffle, cycleRepeat,
    showNowPlaying, setShowNowPlaying,
  } = usePlayerStore();
  const { isFavourite, toggleFavourite } = useLibraryStore();
  const { setRightPanel } = useUIStore();

  const [shuffleActive, setShuffleActive] = useState(false);
  const [repeatMode, setRepeatMode] = useState<0 | 1 | 2>(0);
  const [hoveredSeek, setHoveredSeek] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  useEffect(() => { setLocalVolume(volume); }, [volume]);
  const [showVolume, setShowVolume] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const volWrapRef = useRef<HTMLDivElement>(null);

  const song = currentTrack
    ? {
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album ?? 'Unknown',
        albumArt: currentTrack.albumCover ?? undefined,
        duration: currentTrack.duration ?? undefined,
        isExplicit: currentTrack.explicit ?? undefined,
      }
    : undefined;

  const dur = song?.duration ?? 247;
  const progress = Math.min((currentTime / dur) * 100, 100);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const playerStore = usePlayerStore.getState();
      playerStore.seekTo(pct * (song?.duration ?? 247));
    },
    [song?.duration]
  );

  const cycleLocalRepeat = () => setRepeatMode((m) => ((m + 1) % 3) as 0 | 1 | 2);

  useEffect(() => {
    if (!showVolume || !volWrapRef.current) return;
    const el = volWrapRef.current;
    const onLeave = () => setShowVolume(false);
    el.addEventListener("mouseleave", onLeave);
    return () => el.removeEventListener("mouseleave", onLeave);
  }, [showVolume]);

  return (
    <motion.div
      animate={{ y: visible ? 0 : 300 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 1 }}
    >
      <style>{`
        @keyframes scroll-title {
          0%, 15% { transform: translateX(0); }
          85%, 100% { transform: translateX(-100%); }
        }
        .am-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          padding: 0 10px 6px;
          background: transparent;
          pointer-events: none;
        }
        .am-pill {
          pointer-events: all;
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
          height: 52px;
          border-radius: 26px;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0 8px 0 10px;
          gap: 0;
          position: relative;
          background: rgba(28, 28, 30, 0.82);
          backdrop-filter: blur(40px) saturate(1.8);
          -webkit-backdrop-filter: blur(40px) saturate(1.8);
          border: 0.5px solid rgba(255,255,255,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.45);
        }
        .am-track {
          flex: 1;
          height: 10px;
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        .am-track-inner {
          width: 100%;
          height: 2px;
          background: rgba(255,255,255,0.15);
          border-radius: 1px;
          overflow: hidden;
          transition: height 0.15s ease;
        }
        .am-track.hovering .am-track-inner {
          height: 4px;
          background: rgba(255,255,255,0.25);
        }
        .am-fill {
          height: 100%;
          background: rgba(255,255,255,0.85);
          border-radius: 1px;
          transition: width 0.1s linear;
        }
        .am-track.hovering .am-fill {
          background: #fff;
        }
        .am-left-top.blurred {
          filter: blur(6px);
          opacity: 0.5;
          transition: filter 0.2s ease, opacity 0.2s ease;
        }
        .am-left-area {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          min-width: 0;
          gap: 2px;
          padding: 4px 0;
        }
        .am-left-top {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          margin-top: 4px;
        }
        .am-art {
          width: 38px;
          height: 38px;
          border-radius: 5px;
          background: linear-gradient(135deg, #3a3a3c 0%, #2c2c2e 100%);
          flex-shrink: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
        }
        .am-art img { width: 100%; height: 100%; object-fit: cover; }
        .am-art-placeholder { color: rgba(255,255,255,0.2); font-size: 18px; }
        .am-art .am-art-expand {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.45);
          opacity: 0;
          transition: opacity 0.15s ease;
          border-radius: 5px;
        }
        .am-art:hover .am-art-expand { opacity: 1; }
        .am-meta { min-width: 0; display: flex; flex-direction: column; gap: 0; overflow: hidden; }
        .am-title-row {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow: hidden;
          white-space: nowrap;
        }
        .am-title-wrap {
          overflow: hidden;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }
        .am-title {
          display: inline-block;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
          letter-spacing: -0.01em;
          white-space: nowrap;
          padding-right: 20px;
        }
        .am-title-wrap:hover .am-title {
          animation: scroll-title 8s linear infinite;
        }
        .am-explicit {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          font-size: 8px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 2px;
          padding: 0 3px;
          flex-shrink: 0;
          line-height: 1.2;
        }
        .am-artist {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }
        .am-album {
          color: rgba(255,255,255,0.3);
        }
        .am-progress-row { display: flex; align-items: center; gap: 0; }
        .am-controls {
          display: flex;
          align-items: center;
          gap: 0;
          flex-shrink: 0;
          margin-right: 6px;
        }
        .am-btn-transport {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.85);
          transition: color 0.12s ease, transform 0.1s ease;
          border-radius: 50%;
          width: 40px;
          height: 40px;
        }
        .am-btn-transport:hover { color: #fff; transform: scale(1.05); }
        .am-btn-transport:active { transform: scale(0.92); }
        .am-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.75);
          transition: color 0.12s ease, transform 0.1s ease;
          border-radius: 50%;
          width: 26px;
          height: 26px;
        }
        .am-btn:hover { color: #fff; transform: scale(1.08); }
        .am-btn:active { transform: scale(0.94); }
        .am-btn.active { color: #fff; }
        .am-btn.dim { color: rgba(255,255,255,0.35); }
        .am-play-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.95);
          transition: color 0.12s ease, transform 0.1s ease;
          width: 42px;
          height: 42px;
        }
        .am-play-btn:hover { color: #fff; transform: scale(1.05); }
        .am-play-btn:active { transform: scale(0.92); }
        .am-right {
          display: flex;
          align-items: center;
          gap: 1px;
          flex-shrink: 0;
          margin-left: 4px;
          padding-right: 5px;
        }
        .am-volume-wrap {
          position: relative;
          display: inline-flex;
          overflow: visible;
        }
        .am-volume-slider-area {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%) scaleY(0);
          opacity: 0;
          width: 36px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 0;
          border: 0;
          transform-origin: bottom center;
          pointer-events: none;
        }
        .am-volume-slider-area.open {
          opacity: 1;
          transform: translateX(-50%) scaleY(1);
          height: 140px;
          padding-bottom: 40px;
          background: rgba(30, 30, 35, 0.95);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          pointer-events: auto;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .am-volume-track {
          position: relative;
          width: 6px;
          height: 80px;
          background: rgba(255,255,255,0.15);
          cursor: pointer;
          border-radius: 3px;
        }
        .am-volume-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: #fff;
          transition: height 0.05s linear;
        }
        .am-btn-vol {
          background: none;
          border: none;
          padding: 0 0 0 1px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.8);
          transition: color 0.12s ease;
          line-height: 0;
          position: relative;
          z-index: 1;
        }
        .am-btn-vol:hover { color: #fff; }
        .am-btn-vol svg { display: block; }
        @keyframes am-pop-in {
          from { opacity: 0; transform: scale(0.97) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="am-bar">
        <div className="am-pill">
          <div className="am-controls">
            <button
              className={`am-btn ${shuffleActive ? "active" : "dim"}`}
              onClick={() => { setShuffleActive(v => !v); toggleShuffle(); }}
              title="Shuffle"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"/>
                <line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/>
                <line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
            </button>
            <button className="am-btn-transport" onClick={previousTrack} title="Previous">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 17.5 11.5 12 18 6.5V17.5z"/>
                <path d="M12 17.5 5.5 12 12 6.5V17.5z"/>
              </svg>
            </button>
            <button className="am-play-btn" onClick={togglePlayPause} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            <button className="am-btn-transport" onClick={nextTrack} title="Next">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6.5 12.5 12 6 17.5V6.5z"/>
                <path d="M12 6.5 18.5 12 12 17.5V6.5z"/>
              </svg>
            </button>
            <button
              className={`am-btn ${repeatMode > 0 ? "active" : "dim"}`}
              onClick={cycleLocalRepeat}
              title={repeatMode === 0 ? "Repeat off" : repeatMode === 1 ? "Repeat all" : "Repeat one"}
            >
              {repeatMode === 2 ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <polyline points="7 23 3 19 7 15"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  <text x="10" y="14" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">1</text>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <polyline points="7 23 3 19 7 15"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
              )}
            </button>
          </div>

          <div className="am-left-area">
            <div className={`am-left-top ${hoveredSeek ? "blurred" : ""}`}>
              <div className="am-art" onClick={() => setShowNowPlaying(true)}>
                {song?.albumArt ? (
                  <img src={song.albumArt} alt={song?.album ?? ""} />
                ) : (
                  <span className="am-art-placeholder">♪</span>
                )}
                <div className="am-art-expand">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6"/>
                    <path d="m21 3-7 7"/>
                    <path d="M9 21H3v-6"/>
                    <path d="m3 21 7-7"/>
                  </svg>
                </div>
              </div>
              <div className="am-meta">
                <div className="am-title-row">
                  <div className="am-title-wrap">
                    <span className="am-title">{song?.title ?? "No track"}</span>
                  </div>
                  {song?.isExplicit && <span className="am-explicit">E</span>}
                </div>
                <span className="am-artist">
                  {song?.artist ?? ""}
                  {song?.album && (
                    <span className="am-album">
                      {" \u2014 "}{song.album}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="am-progress-row">
              <div
                className={`am-track ${hoveredSeek ? "hovering" : ""}`}
                ref={progressRef}
                onClick={handleProgressClick}
                onMouseEnter={() => setHoveredSeek(true)}
                onMouseLeave={() => setHoveredSeek(false)}
              >
                <div className="am-track-inner">
                  <div className="am-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="am-right">
            <button className="am-btn" title="Download">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button className="am-btn" onClick={() => setRightPanel('queue')} title="Queue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </button>
            <div className="am-volume-wrap" ref={volWrapRef}>
              <div className={`am-volume-slider-area ${showVolume ? "open" : ""}`}>
                <div
                  className="am-volume-track"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                    setLocalVolume(pct);
                    setVolume(pct);
                  }}
                >
                  <div className="am-volume-fill" style={{ height: `${isMuted ? 0 : localVolume * 100}%` }} />
                </div>
              </div>
              <button className="am-btn-vol" onClick={toggleMute} onMouseEnter={() => setShowVolume(true)} title="Volume">
                {isMuted ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 9v6h4l3 5V4L7 9H3z" fill="currentColor" stroke="none"/>
                    <path d="M15 9l6 6M21 9l-6 6"/>
                  </svg>
                ) : localVolume < 0.35 ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 9v6h4l3 5V4L7 9H3z" fill="currentColor" stroke="none"/>
                    <path d="M14.5 10.5a3 3 0 0 1 0 3"/>
                  </svg>
                ) : localVolume < 0.7 ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 9v6h4l3 5V4L7 9H3z" fill="currentColor" stroke="none"/>
                    <path d="M14.5 10.5a3 3 0 0 1 0 3"/>
                    <path d="M17.5 8.5a6 6 0 0 1 0 7"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M3 9v6h4l3 5V4L7 9H3z" fill="currentColor" stroke="none"/>
                    <path d="M14.5 10.5a3 3 0 0 1 0 3"/>
                    <path d="M17.5 8.5a6 6 0 0 1 0 7"/>
                    <path d="M20.5 6.5a9 9 0 0 1 0 11"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
