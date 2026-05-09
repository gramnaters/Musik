'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { useAudioSettingsStore } from '@/stores/audioSettingsStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { downloadCurrentTrack } from '@/lib/download-track';
import { seekbarWrapperClass } from '@/lib/seekbar-styles';
import { getQualityBadge } from '@/lib/audio-quality';
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
  Mic2, ChevronUp, Disc3, Download,
} from 'lucide-react';
import { AppleMusicPlayIcon } from '@/components/icons/AppleMusicPlayIcon';

export default function PlayerBar() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    volume, isMuted, isShuffle, repeatMode,
    togglePlayPause, nextTrack, previousTrack,
    seekTo, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    setShowNowPlaying,
  } = usePlayerStore();
  const { isFavourite, toggleFavourite } = useLibraryStore();
  const { rightPanel, setRightPanel, playerTheme, setPlayerTheme } = useUIStore();
  const seekbarStyle = useAudioSettingsStore((s) => s.seekbarStyle);

  const isFav = currentTrack ? isFavourite(currentTrack.id) : false;
  const qualityBadge = getQualityBadge(currentTrack?.quality);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className={cn(
          'flex-shrink-0 flex flex-col transition-all duration-500',
          playerTheme === 'spotify' &&
            'h-[90px] bg-[#121212] border-t border-[#282828] px-2 sm:px-4 items-center justify-center text-white',
          playerTheme === 'tidal' &&
            'min-h-[100px] h-auto py-2.5 md:py-0 md:h-[100px] tidal-player-bar w-full relative justify-center max-md:rounded-t-2xl max-md:mx-2 max-md:border max-md:border-white/15 max-md:border-b-0 max-md:shadow-[0_-16px_48px_rgba(0,0,0,0.45)]',
          playerTheme === 'apple' &&
            'h-[90px] w-full rounded-none m-0 px-2 sm:px-4 items-center justify-center border-t border-white/[0.08] bg-black/65 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/45 text-white',
          'z-10 md:z-50'
        )}
      >
        {playerTheme === 'tidal' ? (
          <div className="tidal-player-grid w-full max-w-full min-w-0 relative z-10 box-border px-1.5 sm:px-0">
            {/* Track info */}
            <div className="pb-track tidal-pb-track min-w-0 items-center">
              {currentTrack ? (
                <>
                  <div
                    className="pb-thumb tidal-pb-thumb shrink-0 md:h-[52px] md:w-[52px] md:rounded-[10px]"
                    style={{ background: currentTrack.albumCover ? `url(${currentTrack.albumCover}) center/cover` : 'linear-gradient(135deg,#667eea,#764ba2)' }}
                  />
                  <div className="tidal-pb-meta flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
                    <div className="flex min-w-0 items-center gap-0.5">
                      <div
                        className={cn(
                          'tidal-pb-title pb-title min-w-0 flex-1 cursor-pointer truncate font-medium hover:underline text-[12px] leading-snug md:text-[13px] md:font-semibold md:leading-tight md:tracking-tight'
                        )}
                        onClick={() => setShowNowPlaying(true)}
                        onKeyDown={(e) => e.key === 'Enter' && setShowNowPlaying(true)}
                        role="button"
                        tabIndex={0}
                      >
                        {currentTrack.title}
                      </div>
                      {qualityBadge && (
                        <span className="shrink-0 text-[8px] font-bold tracking-tight sm:text-[9px] px-1 py-0.5 rounded-[2px] leading-none bg-black/75 text-white border border-white/15">
                          {qualityBadge.label}
                        </span>
                      )}
                      <button
                        type="button"
                        className={cn('pb-like tidal-pb-like !p-1 shrink-0', isFav && 'on')}
                        onClick={() => toggleFavourite(currentTrack)}
                        aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        {isFav ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path fill="#ec4899" stroke="#ec4899" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        )}
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md',
                          'border border-white/[0.22] bg-white/[0.07] text-white/75 transition-colors hover:bg-white/12 hover:text-white'
                        )}
                        onClick={() => setShowNowPlaying(true)}
                        aria-label="Open full player"
                      >
                        <ChevronUp className="size-4" strokeWidth={2} />
                      </button>
                    </div>
                    <p className="tidal-pb-artist pb-artist min-h-[1.25em] truncate text-[11px] leading-snug text-white/[0.52] hover:underline md:text-[11.5px]">
                      {currentTrack.artist}
                    </p>
                    <div className="tidal-pb-album flex min-h-[1.25em] min-w-0 items-center gap-1 text-[11px] leading-snug text-white/[0.48] md:text-[11.5px]">
                      {currentTrack.album?.trim() ? (
                        <>
                          <Disc3 className="size-[13px] shrink-0 self-center opacity-90" aria-hidden />
                          <span className="min-w-0 truncate">{currentTrack.album}</span>
                        </>
                      ) : (
                        <span className="sr-only">Album</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="pb-thumb tidal-pb-thumb flex items-center justify-center bg-white/5 border-none shadow-none shrink-0">
                    <Music size={18} className="text-white/30" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="pb-title text-white/50 max-md:text-[12px]">No track playing</div>
                  </div>
                </>
              )}
            </div>

            {/* Transport + timeline */}
            <div className="pb-center w-full max-w-none">
              <div className="pb-buttons gap-2 sm:gap-4 md:gap-8">
                <button className="ctrl" onClick={toggleShuffle} style={{ color: isShuffle ? '#fff' : '', opacity: isShuffle ? 1 : 0.7 }}>
                  <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                </button>
                <button className="ctrl" onClick={previousTrack} style={{ opacity: 0.8 }}>
                  <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>
                <button className="play-btn-main" onClick={togglePlayPause}>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <button className="ctrl" onClick={nextTrack} style={{ opacity: 0.8 }}>
                  <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M16 6h2v12h-2zm-11 0l8.5 6L5 18z"/></svg>
                </button>
                <button className="ctrl" onClick={cycleRepeat} style={{ color: repeatMode !== 'off' ? '#fff' : '', opacity: repeatMode !== 'off' ? 1 : 0.7 }}>
                  <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
                </button>
              </div>
              <div className="pb-progress w-full max-w-none md:max-w-[440px] tidal-pb-progress mx-auto">
                <span className="time-label">{currentTrack ? formatDuration(currentTime) : '0:00'}</span>
                <div className={cn('min-w-0 flex-1', seekbarWrapperClass(seekbarStyle))}>
                  <Slider
                    value={[Math.min(currentTime, duration || 0)]}
                    min={0}
                    max={duration > 0 ? duration : 100}
                    step={0.05}
                    onValueChange={(value) => seekTo(value[0])}
                    disabled={!currentTrack || !duration}
                    className="tidal-progress-slider w-full cursor-pointer touch-pan-y"
                  />
                </div>
                <span className="time-label right">{currentTrack && duration ? formatDuration(duration) : '0:00'}</span>
              </div>
            </div>

            {/* Queue, theme, volume */}
            <div className="pb-right tidal-pb-icons-row justify-end items-center min-w-0 gap-1 sm:gap-2 md:gap-3 shrink-0">
              <button className="icon-btn" title="Download" aria-label="Download track" type="button" onClick={() => void downloadCurrentTrack(currentTrack)}>
                <Download width={18} height={18} />
              </button>
              <button className="icon-btn" onClick={() => setRightPanel(rightPanel === 'queue' ? 'none' : 'queue')} title="Queue">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
              </button>
              <button className="icon-btn" onClick={() => {
                const themes: ('spotify' | 'tidal' | 'apple')[] = ['spotify', 'tidal', 'apple'];
                setPlayerTheme(themes[(themes.indexOf(playerTheme) + 1) % themes.length]);
              }} title="Cycle player style" aria-label="Cycle player style">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/></svg>
              </button>
              <div className="icon-btn" onClick={toggleMute} style={{ border: 'none', background: 'none' }}>
                {isMuted || volume === 0 ? (
                  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4-.9 7-4.6 7-9.03s-3-8.13-7-9.03z"/></svg>
                )}
              </div>
              <input type="range" className="vol-slider hidden md:block" min="0" max="100" value={isMuted ? 0 : volume * 100} onChange={(e) => setVolume(Number(e.target.value) / 100)} style={{ background: `linear-gradient(to right, #fff ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.15) ${isMuted ? 0 : volume * 100}%)` }} aria-label="Volume" />
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
                    className="flex min-w-0 flex-1 items-center gap-3"
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
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                      <div className="flex min-w-0 items-center gap-0.5">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white hover:underline cursor-pointer">
                          {currentTrack.title}
                        </p>
                        {currentTrack.quality && currentTrack.quality !== 'Normal' && (
                          <span
                            className={cn(
                              'shrink-0 text-[8px] font-black px-1 rounded-[1px] h-3 flex items-center border border-white/25 text-white/90',
                              (currentTrack.quality === 'Master' || currentTrack.quality === 'MQA') &&
                                'bg-cyan-500 text-black border-none'
                            )}
                          >
                            {currentTrack.quality}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavourite(currentTrack)}
                          className={cn(
                            'h-7 w-7 shrink-0 p-0 hidden sm:flex',
                            playerTheme === 'spotify' &&
                              (isFav ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/55 hover:text-white'),
                            playerTheme === 'apple' &&
                              (isFav ? 'text-pink-400 hover:text-pink-400' : 'text-white/45 hover:text-white')
                          )}
                          aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                        >
                          <Heart size={16} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowNowPlaying(true)}
                          className={cn(
                            'h-7 w-7 shrink-0 p-0 hidden sm:inline-flex rounded-md border border-white/22 bg-white/[0.07] text-white/75 hover:bg-white/12 hover:text-white'
                          )}
                          aria-label="Open full player"
                        >
                          <ChevronUp className="size-4" strokeWidth={2} />
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
                      <Music size={20} className="text-muted-foreground" />
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
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleShuffle()}
                      className={cn(
                        'h-8 w-8 hidden sm:flex',
                        playerTheme === 'spotify' &&
                          (isShuffle ? 'text-[#1DB954] hover:text-[#1DB954]' : 'text-white/55 hover:text-white'),
                        playerTheme === 'apple' &&
                          (isShuffle ? 'text-white hover:text-white' : 'text-white/40 hover:text-white/90')
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
                      className="h-8 w-8 text-white/70 hover:text-white"
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
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={togglePlayPause}
                      disabled={!currentTrack}
                      className={cn(
                        'h-11 w-11 shrink-0 p-0 rounded-full transition-[opacity,box-shadow,filter] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
                        playerTheme === 'spotify' &&
                          'bg-spotify-green hover:bg-spotify-green-hover hover:opacity-95 shadow-lg shadow-black/20',
                        playerTheme === 'apple' &&
                          'bg-transparent hover:bg-white/10 text-white shadow-none border-0',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isPlaying ? (
                        <Pause
                          size={22}
                          fill={playerTheme === 'spotify' ? 'white' : 'currentColor'}
                          className={playerTheme === 'spotify' ? 'text-white' : 'text-white'}
                        />
                      ) : playerTheme === 'apple' ? (
                        <AppleMusicPlayIcon size={22} className="text-white translate-x-[1px]" />
                      ) : (
                        <Play size={20} fill="white" className="text-white ml-1" />
                      )}
                    </Button>
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
                      className="h-8 w-8 text-white/70 hover:text-white"
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
                      {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
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
                  {currentTrack ? formatDuration(currentTime) : '0:00'}
                </span>
                <div
                  className={cn(
                    'flex-1 min-w-0',
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
                    disabled={!currentTrack}
                    className="w-full cursor-pointer"
                  />
                </div>
                <span className="text-[11px] w-10 tabular-nums text-white/50">
                  {currentTrack && duration ? formatDuration(duration) : '0:00'}
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
                      onClick={() => void downloadCurrentTrack(currentTrack)}
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
