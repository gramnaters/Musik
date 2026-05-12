'use client';

import { useState, useRef, MouseEvent } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAudioSettingsStore } from '@/stores/audioSettingsStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { getQualityBadgeForTrack, getQualityTooltip } from '@/lib/audio-quality';
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
  Heart, ListMusic, ChevronDown, Download,
  MoreHorizontal, Star, Sparkles,
} from 'lucide-react';
import { downloadCurrentTrack } from '@/lib/download-track';
import { seekbarWrapperClass } from '@/lib/seekbar-styles';
import { PlaybackSeekSlider } from '@/components/player/PlaybackSeekSlider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

export default function NowPlaying() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovering, setIsHovering] = useState(false);
  /** Subtle CSS motion on cover — not Spotify Canvas (that URL isn’t in Web API). */
  const [spotifyLivingArt, setSpotifyLivingArt] = useState(true);
  const tidalAlbumRef = useRef<HTMLDivElement>(null);

  const handleTidalAlbumMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!tidalAlbumRef.current) return;
    const rect = tidalAlbumRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -14, y: dx * 14 });
    const sx = ((e.clientX - rect.left) / rect.width) * 100;
    const sy = ((e.clientY - rect.top) / rect.height) * 100;
    setShine({ x: sx, y: sy, opacity: 0.42 });
  };

  const handleTidalAlbumLeave = () => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    setShine((s) => ({ ...s, opacity: 0 }));
  };

  const handleTidalAlbumEnter = () => {
    setIsHovering(true);
  };

  const {
    currentTrack, isPlaying, currentTime, duration,
    isShuffle, repeatMode,
    togglePlayPause, nextTrack, previousTrack,
    toggleShuffle, cycleRepeat,
    showNowPlaying, setShowNowPlaying,
  } = usePlayerStore();
  const { setRightPanel, playerTheme } = useUIStore();
  const seekbarStyle = useAudioSettingsStore((s) => s.seekbarStyle);
  const { isFavourite, toggleFavourite } = useLibraryStore();

  const shareOrCopyNowPlaying = async () => {
    if (!currentTrack) return;
    const text = `${currentTrack.title} — ${currentTrack.artist}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: currentTrack.title, text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Copied', description: 'Track info copied to clipboard.' });
      }
    } catch {
      /* user cancelled share or clipboard blocked */
    }
  };

  const isFav = currentTrack ? isFavourite(currentTrack.id) : false;
  const qualityBadge = getQualityBadgeForTrack(currentTrack ?? undefined);
  const qualityTip = getQualityTooltip(currentTrack ?? undefined);
  const remainingTime = duration > 0 ? Math.max(0, duration - currentTime) : 0;

  return (
    <AnimatePresence>
      {showNowPlaying && currentTrack && (
        <TooltipProvider delayDuration={200}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
        >

          {/* ═══════════════════════════════════════════════════════════
              APPLE MUSIC — exact match to apple.com/apple-music web player
              Background: blurred album art, dark vignette overlay
              Layout: centred column, album square, slim controls below
          ═══════════════════════════════════════════════════════════ */}
           {playerTheme === 'apple' && (
             <div className="absolute inset-0 flex flex-col h-full">
               {/* Blurred album bg */}
               <div className="absolute inset-0 overflow-hidden">
                 {currentTrack.albumCover && (
                   <img
                     src={currentTrack.albumCover}
                     alt=""
                     aria-hidden
                     className="absolute inset-0 w-full h-full object-cover scale-110"
                     style={{ filter: 'blur(48px) saturate(1.6) brightness(0.45)' }}
                   />
                 )}
                 {/* Apple-style deep dark vignette */}
                  <div className="absolute inset-0 bg-black/50" />
                 <div className="absolute inset-x-0 bottom-0 h-2/3"
                   style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.94) 100%)' }} />
               </div>
               {/* Soft mesh (Apple Music web–like haze over blurred art) */}
                <div className="apple-bg-gradient absolute inset-0">
                  <div className="apple-blob apple-blob-1" />
                  <div className="apple-blob apple-blob-2" />
                  <div className="apple-blob apple-blob-3" />
                  <div className="apple-blob apple-blob-4" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55" />
                  <div className="absolute inset-0 bg-black/35 backdrop-blur-[56px]" />
                </div>

               {/* Content */}
              <div className="relative z-10 flex flex-col h-full max-w-[540px] mx-auto w-full px-6 pb-10 pt-4">
                {/* Top bar */}
                <div className="flex items-center justify-between py-3">
                  <button
                    onClick={() => setShowNowPlaying(false)}
                    className="h-8 w-8 flex items-center justify-center text-white/70 hover:text-white rounded-full transition-colors"
                    aria-label="Close"
                  >
                    <ChevronDown size={22} strokeWidth={2.5} />
                  </button>
                  {/* "Now Playing" label — Apple Music uses this exactly */}
                  <div className="text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55 leading-none">
                      Now Playing
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowNowPlaying(false); setRightPanel('queue'); }}
                    className="h-8 w-8 flex items-center justify-center text-white/70 hover:text-white rounded-full transition-colors"
                    aria-label="Queue"
                  >
                    <ListMusic size={18} strokeWidth={2} />
                  </button>
                </div>

                 {/* Album Art — Apple Music web: flat hero art (3D reserved for Tidal) */}
                 <div className="flex-1 flex items-center justify-center py-4">
                   <motion.div
                     key={currentTrack.id}
                     initial={{ opacity: 0, scale: 0.98 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                     className="relative w-full max-w-[min(80vw,400px)] aspect-square rounded-[10px] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
                   >
                     {currentTrack.albumCover ? (
                       <img
                         src={currentTrack.albumCover}
                         alt={currentTrack.album}
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       <div className="w-full h-full bg-white/5 flex items-center justify-center">
                         <svg className="w-24 h-24 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                           <path d="M9 18V5l12-2v13" />
                           <circle cx="6" cy="18" r="3" />
                           <circle cx="18" cy="16" r="3" />
                         </svg>
                       </div>
                     )}
                   </motion.div>
                 </div>

                {/* Track info — Apple Music web: title row + star / more; subtitle line */}
                <div className="mb-3 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <h2 className="text-[22px] font-semibold text-white tracking-[-0.02em] truncate leading-tight">
                        {currentTrack.title}
                      </h2>
                      {currentTrack.explicit && (
                        <span className="shrink-0 text-[10px] font-bold px-1 py-px rounded border border-white/35 text-white/90 leading-none">
                          E
                        </span>
                      )}
                      {qualityBadge && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="shrink-0 text-[9px] font-black px-1 py-0.5 rounded-[2px] tracking-wide bg-black/80 text-white border border-white/20 leading-none cursor-default">
                              {qualityBadge.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs border border-white/20 bg-neutral-950 text-white text-xs px-2 py-1.5">
                            {qualityTip}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleFavourite(currentTrack)}
                        className={cn(
                          'h-9 w-9 flex items-center justify-center rounded-full text-white/55 hover:text-white transition-colors duration-200',
                          isFav && 'text-white'
                        )}
                        aria-label="Favorite"
                      >
                        <Star size={20} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="h-9 w-9 flex items-center justify-center rounded-full text-white/55 hover:text-white transition-colors duration-200 outline-none"
                            aria-label="More options"
                          >
                            <MoreHorizontal size={20} strokeWidth={1.75} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 border border-white/15 bg-neutral-950 text-white">
                          <DropdownMenuItem
                            className="focus:bg-white/10"
                            onClick={() => void downloadCurrentTrack(currentTrack)}
                          >
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="focus:bg-white/10"
                            onClick={() => {
                              setShowNowPlaying(false);
                              setRightPanel('queue');
                            }}
                          >
                            View queue
                          </DropdownMenuItem>
                          <DropdownMenuItem className="focus:bg-white/10" onClick={() => void shareOrCopyNowPlaying()}>
                            Share or copy
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem className="focus:bg-white/10" onClick={() => setShowNowPlaying(false)}>
                            Close
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-[13px] text-white/50 font-medium truncate pr-2">
                    {currentTrack.album?.trim()
                      ? `${currentTrack.title} — ${currentTrack.album} · ${currentTrack.artist}`
                      : `${currentTrack.title} — Single · ${currentTrack.artist}`}
                  </p>
                </div>

                {/* Seekbar — Apple Music web */}
                <div className="mb-1">
                  <div className={cn('w-full apple-progress apple-nowplaying-scrubber', seekbarWrapperClass(seekbarStyle))}>
                    <PlaybackSeekSlider />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[11px] font-medium tabular-nums text-white/45">{formatDuration(currentTime)}</span>
                    <span className="text-[11px] font-medium tabular-nums text-white/45">
                      -{formatDuration(remainingTime)}
                    </span>
                  </div>
                </div>

                {/* Main controls — Apple Music: rewind | back | play | fwd | repeat, icon-only, NO circles */}
                <div className="flex items-center justify-between px-2 mb-5">
                  <button
                    onClick={toggleShuffle}
                    className={cn('h-10 w-10 flex items-center justify-center rounded-full transition-opacity',
                      isShuffle ? 'text-white opacity-100' : 'text-white opacity-35 hover:opacity-60')}
                    aria-label="Shuffle"
                  >
                    <Shuffle size={20} strokeWidth={2} />
                  </button>

                  {/* Apple Music: uses double-chevron "rewind" icon, not skip */}
                  <button onClick={previousTrack} className="h-10 w-10 flex items-center justify-center text-white hover:opacity-75 transition-opacity" aria-label="Previous">
                    {/* Apple-style backward chevrons */}
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
                    </svg>
                  </button>

                  {/* Apple Music web: fixed slot — same box for play and pause */}
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="w-14 h-14 shrink-0 flex items-center justify-center text-white rounded-full border-0 bg-transparent shadow-none outline-none transition-transform duration-200 ease-out hover:scale-[1.04] active:scale-[0.96]"
                  >
                    <span className="w-8 h-8 flex items-center justify-center pointer-events-none">
                      {isPlaying ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <rect x="6" y="5" width="4.5" height="14" rx="1.2" />
                          <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" />
                        </svg>
                      ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M8 5.5v13L19 12 8 5.5z" />
                        </svg>
                      )}
                    </span>
                  </button>

                  <button onClick={nextTrack} className="h-10 w-10 flex items-center justify-center text-white hover:opacity-75 transition-opacity" aria-label="Next">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M6 18l8.5-6L6 6v12zm2.5-6 5-3.5v7L8.5 12zM16 6h2v12h-2z"/>
                    </svg>
                  </button>

                  <button
                    onClick={cycleRepeat}
                    className={cn('h-10 w-10 flex items-center justify-center rounded-full transition-opacity',
                      repeatMode !== 'off' ? 'text-white opacity-100' : 'text-white opacity-35 hover:opacity-60')}
                    aria-label="Repeat"
                  >
                    {repeatMode === 'one' ? <Repeat1 size={20} strokeWidth={2} /> : <Repeat size={20} strokeWidth={2} />}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-10 px-1">
                  <button
                    type="button"
                    onClick={() => void downloadCurrentTrack(currentTrack)}
                    className="h-9 w-9 flex items-center justify-center text-white/45 hover:text-white/85 transition-colors duration-200"
                    aria-label="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNowPlaying(false);
                      setRightPanel('queue');
                    }}
                    className="h-9 w-9 flex items-center justify-center text-white/45 hover:text-white/85 transition-colors duration-200"
                    aria-label="Queue"
                  >
                    <ListMusic size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SPOTIFY — exact match to open.spotify.com web player
              Background: album-tinted gradient fading to near-black
              Layout: large art, left-aligned text, white play circle
          ═══════════════════════════════════════════════════════════ */}
          {playerTheme === 'spotify' && (
            <div className="absolute inset-0 flex flex-col h-full">
              {/* Spotify: blurred album colour washes from top */}
              <div className="absolute inset-0">
                {currentTrack.albumCover && (
                  <img
                    src={currentTrack.albumCover}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-110"
                    style={{ filter: 'blur(60px) saturate(2.2) brightness(0.38)' }}
                  />
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.72) 55%, #121212 100%)' }} />
              </div>

              <div className="relative z-10 flex flex-col h-full max-w-[540px] mx-auto w-full px-6 pb-8 pt-2">
                {/* Top bar — Spotify: down chevron centre-ish, three dots right */}
                <div className="flex items-center justify-between py-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNowPlaying(false)}
                    className="h-8 w-8 shrink-0 flex items-center justify-center text-white hover:text-white/70 transition-colors"
                    aria-label="Close"
                  >
                    <ChevronDown size={24} strokeWidth={2.5} />
                  </button>
                  <div className="text-center min-w-0 flex-1 px-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70 truncate">
                      {currentTrack.album || 'Now Playing'}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setSpotifyLivingArt((v) => !v)}
                          className={cn(
                            'h-8 w-8 flex items-center justify-center rounded-lg transition-colors',
                            spotifyLivingArt ? 'text-[#1DB954] bg-white/10' : 'text-white/55 hover:text-white'
                          )}
                          aria-label={spotifyLivingArt ? 'Turn off living artwork' : 'Turn on living artwork'}
                        >
                          <Sparkles size={18} strokeWidth={2} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs border border-white/15 bg-zinc-900 text-white text-xs">
                        <p className="font-medium">Living artwork</p>
                        <p className="text-white/70 mt-1">
                          Gentle zoom animation on the cover. Spotify &quot;Canvas&quot; video loops are not exposed through the Web API,
                          so real Canvas clips cannot be loaded here.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="h-8 w-8 flex items-center justify-center text-white hover:text-white/70 transition-colors outline-none"
                          aria-label="More options"
                        >
                          <MoreHorizontal size={22} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 border border-white/15 bg-zinc-950 text-white">
                        <DropdownMenuItem
                          className="focus:bg-white/10"
                          onClick={() => void downloadCurrentTrack(currentTrack)}
                        >
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="focus:bg-white/10"
                          onClick={() => {
                            setShowNowPlaying(false);
                            setRightPanel('queue');
                          }}
                        >
                          View queue
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-white/10" onClick={() => void shareOrCopyNowPlaying()}>
                          Share or copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem className="focus:bg-white/10" onClick={() => setShowNowPlaying(false)}>
                          Close
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Album Art — Spotify: large, subtle shadow, 8px radius */}
                <div className="flex items-center justify-center py-6 flex-1">
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full aspect-square max-w-[min(75vw,360px)] rounded-[8px] overflow-hidden"
                    style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
                  >
                    {currentTrack.albumCover ? (
                      <motion.div
                        className="relative w-full h-full"
                        animate={
                          spotifyLivingArt && isPlaying
                            ? { scale: [1, 1.035, 1] }
                            : { scale: 1 }
                        }
                        transition={
                          spotifyLivingArt && isPlaying
                            ? { duration: 14, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.3 }
                        }
                      >
                        <motion.img
                          src={currentTrack.albumCover}
                          alt={currentTrack.album || ''}
                          className="w-full h-full object-cover"
                          animate={
                            spotifyLivingArt && isPlaying
                              ? { scale: [1, 1.08, 1] }
                              : { scale: 1 }
                          }
                          transition={
                            spotifyLivingArt && isPlaying
                              ? { duration: 18, repeat: Infinity, ease: 'easeInOut' }
                              : { duration: 0.3 }
                          }
                        />
                      </motion.div>
                    ) : (
                      <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                        <svg className="w-20 h-20 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Track info + heart — Spotify: left-aligned, heart right */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[22px] font-bold text-white tracking-[-0.01em] truncate leading-tight">
                      {currentTrack.title}
                    </h2>
                    <p className="text-[15px] text-white/65 truncate mt-0.5 font-normal">{currentTrack.artist}</p>
                  </div>
                  <button
                    onClick={() => toggleFavourite(currentTrack)}
                    className={cn('shrink-0 transition-colors', isFav ? 'text-[#1DB954]' : 'text-white/40 hover:text-white/70')}
                    aria-label={isFav ? 'Remove from liked' : 'Like'}
                  >
                    <Heart size={24} strokeWidth={1.8} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Seekbar — Spotify: gray track, green fill, shows thumb on hover */}
                <div className="mb-1">
                  <div className={cn('w-full spotify-progress', seekbarWrapperClass(seekbarStyle))}>
                    <PlaybackSeekSlider sliderClassName="w-full" />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px] font-medium tabular-nums text-white/55">{formatDuration(currentTime)}</span>
                    <span className="text-[11px] font-medium tabular-nums text-white/55">
                      -{formatDuration(remainingTime)}
                    </span>
                  </div>
                </div>

                {/* Main controls — Spotify: shuffle | prev | PLAY CIRCLE | next | repeat */}
                <div className="flex items-center justify-between px-2 mt-2 mb-5 max-w-[220px] mx-auto gap-1">
                  <button
                    onClick={toggleShuffle}
                    className={cn('h-10 w-10 flex items-center justify-center transition-colors rounded-full',
                      isShuffle ? 'text-[#1DB954]' : 'text-white/55 hover:text-white')}
                    aria-label="Shuffle"
                  >
                    <Shuffle size={20} strokeWidth={2} />
                  </button>

                  <button onClick={previousTrack} className="h-10 w-10 flex items-center justify-center text-white hover:text-white/90 transition-colors rounded-full" aria-label="Previous">
                    <SkipBack size={22} fill="currentColor" strokeWidth={0} />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="h-10 w-10 shrink-0 rounded-full bg-white text-black flex items-center justify-center transition-transform duration-150 hover:scale-[1.06] active:scale-[0.96] focus-visible:outline-none shadow-xl shadow-black/40"
                  >
                    {isPlaying ? (
                      <Pause size={20} fill="black" strokeWidth={0} />
                    ) : (
                      <Play size={20} fill="black" strokeWidth={0} className="translate-x-[1px]" />
                    )}
                  </button>

                  <button onClick={nextTrack} className="h-10 w-10 flex items-center justify-center text-white hover:text-white/90 transition-colors rounded-full" aria-label="Next">
                    <SkipForward size={22} fill="currentColor" strokeWidth={0} />
                  </button>

                  <button
                    onClick={cycleRepeat}
                    className={cn('h-10 w-10 flex items-center justify-center transition-colors rounded-full',
                      repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-white/55 hover:text-white')}
                    aria-label="Repeat"
                  >
                    {repeatMode === 'one' ? <Repeat1 size={20} strokeWidth={2} /> : <Repeat size={20} strokeWidth={2} />}
                  </button>
                </div>

                {/* Bottom row — Spotify: devices left, queue right */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => void downloadCurrentTrack(currentTrack)}
                    className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
                    aria-label="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => { setShowNowPlaying(false); setRightPanel('queue'); }}
                    className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
                    aria-label="Queue"
                  >
                    <ListMusic size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TIDAL — exact match to tidal.com web player expanded view
              Background: album art full-bleed, heavy blur + dark overlay
              Layout: title at bottom-left over art, controls below
          ═══════════════════════════════════════════════════════════ */}
          {playerTheme === 'tidal' && (
            <div className="absolute inset-0 flex flex-col h-full">
              {/* Tidal: dark animated gradient background */}
              <div className="tidal-nowplaying-bg">
                <div className="tidal-nowplaying-blob tidal-nowplaying-blob-1" />
                <div className="tidal-nowplaying-blob tidal-nowplaying-blob-2" />
                <div className="tidal-nowplaying-blob tidal-nowplaying-blob-3" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />
              </div>

              <div className="now-playing-tidal relative z-10 flex flex-col h-full max-w-[600px] mx-auto w-full px-6 pb-10 pt-3">
                {/* Top bar — Tidal: down chevron left, queue right */}
                <div className="flex items-center justify-between py-3">
                  <button
                    onClick={() => setShowNowPlaying(false)}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/18 transition-colors backdrop-blur-sm border border-white/10"
                    aria-label="Close"
                  >
                    <ChevronDown size={20} strokeWidth={2.5} />
                  </button>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Now Playing</p>
                  </div>
                  <button
                    onClick={() => { setShowNowPlaying(false); setRightPanel('queue'); }}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/18 transition-colors backdrop-blur-sm border border-white/10"
                    aria-label="Queue"
                  >
                    <ListMusic size={17} />
                  </button>
                </div>

                {/* Album Art — Tidal: 3D tilt + shine on hover (web-style hero) */}
                <div className="flex items-center justify-center flex-1 py-4">
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="relative flex flex-col items-center"
                  >
                    <div
                      ref={tidalAlbumRef}
                      onMouseMove={handleTidalAlbumMove}
                      onMouseEnter={handleTidalAlbumEnter}
                      onMouseLeave={handleTidalAlbumLeave}
                      className="relative cursor-pointer"
                      style={{ perspective: '900px', transformStyle: 'preserve-3d' }}
                    >
                      <div
                        className="relative w-full max-w-[min(72vw,380px)] aspect-square rounded-xl overflow-hidden"
                        style={{
                          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovering ? 1.03 : 1})`,
                          transition: isHovering
                            ? 'transform 0.08s ease-out, box-shadow 0.2s'
                            : 'transform 0.55s cubic-bezier(0.23,1,0.32,1), box-shadow 0.45s',
                          boxShadow: isHovering
                            ? `${-tilt.y * 1.2}px ${tilt.x * 1.2}px 56px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.12), 0 40px 90px rgba(0,0,0,0.65)`
                            : '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)',
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {currentTrack.albumCover ? (
                          <img src={currentTrack.albumCover} alt={currentTrack.album} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <svg className="w-20 h-20 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                            </svg>
                          </div>
                        )}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,${shine.opacity}) 0%, rgba(255,255,255,0.04) 42%, transparent 72%)`,
                            mixBlendMode: 'overlay',
                          }}
                        />
                        <div
                          className="absolute inset-0 pointer-events-none rounded-xl"
                          style={{
                            background: `linear-gradient(${128 + tilt.y * 3}deg, rgba(255,255,255,${isHovering ? 0.14 : 0.03}) 0%, transparent 42%, rgba(0,0,0,${isHovering ? 0.2 : 0.08}) 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Track info — Tidal: title left bold, heart right */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[22px] font-bold text-white tracking-[-0.025em] truncate leading-tight">
                      {currentTrack.title}
                    </h2>
                    <p className="text-[14px] text-white/55 truncate mt-1 font-normal">{currentTrack.artist}</p>
                    {currentTrack.album?.trim() && (
                      <p className="text-[12px] text-white/38 truncate mt-0.5">{currentTrack.album}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    {qualityBadge && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-[2px] tracking-wide bg-cyan-500 text-black leading-none cursor-default">
                            {qualityBadge.label}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs border border-white/20 bg-neutral-950 text-white text-xs px-2 py-1.5">
                          {qualityTip}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <button
                      onClick={() => toggleFavourite(currentTrack)}
                      className={cn('transition-colors', isFav ? 'text-pink-400' : 'text-white/35 hover:text-white/70')}
                      aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                    >
                      <Heart size={22} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                {/* Seekbar — Tidal web: solid round playhead */}
                <div className="mb-1">
                  <div
                    className={cn(
                      'w-full tidal-progress-slider tidal-nowplaying-scrubber',
                      seekbarWrapperClass(seekbarStyle)
                    )}
                  >
                    <PlaybackSeekSlider />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[11px] tabular-nums text-white/40 font-medium">{formatDuration(currentTime)}</span>
                    <span className="text-[11px] tabular-nums text-white/40 font-medium">
                      -{formatDuration(remainingTime)}
                    </span>
                  </div>
                </div>

                {/* Main controls — Tidal: shuffle | prev | WHITE CIRCLE play | next | repeat */}
                <div className="flex items-center justify-between px-1 mt-3 mb-5">
                  <button
                    onClick={toggleShuffle}
                    className={cn('h-10 w-10 flex items-center justify-center rounded-full transition-colors',
                      isShuffle ? 'text-white' : 'text-white/35 hover:text-white/65')}
                    aria-label="Shuffle"
                  >
                    <Shuffle size={20} strokeWidth={1.75} />
                  </button>

                  <button onClick={previousTrack} className="h-10 w-10 flex items-center justify-center text-white/80 hover:text-white transition-colors" aria-label="Previous">
                    <SkipBack size={30} fill="currentColor" strokeWidth={0} />
                  </button>

                  {/* Tidal: white circle, black icon — exactly like tidal.com */}
                  <button
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="h-[60px] w-[60px] rounded-full bg-white flex items-center justify-center transition-all duration-150 hover:scale-[1.05] active:scale-[0.97] focus-visible:outline-none"
                    style={{ boxShadow: '0 4px 24px rgba(255,255,255,0.18)' }}
                  >
                    {isPlaying ? (
                      <Pause size={26} fill="black" strokeWidth={0} />
                    ) : (
                      <Play size={26} fill="black" strokeWidth={0} className="translate-x-[2px]" />
                    )}
                  </button>

                  <button onClick={nextTrack} className="h-10 w-10 flex items-center justify-center text-white/80 hover:text-white transition-colors" aria-label="Next">
                    <SkipForward size={30} fill="currentColor" strokeWidth={0} />
                  </button>

                  <button
                    onClick={cycleRepeat}
                    className={cn('h-10 w-10 flex items-center justify-center rounded-full transition-colors',
                      repeatMode !== 'off' ? 'text-white' : 'text-white/35 hover:text-white/65')}
                    aria-label="Repeat"
                  >
                    {repeatMode === 'one' ? <Repeat1 size={20} strokeWidth={1.75} /> : <Repeat size={20} strokeWidth={1.75} />}
                  </button>
                </div>

                {/* Bottom extras */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => void downloadCurrentTrack(currentTrack)}
                    className="h-8 w-8 flex items-center justify-center text-white/35 hover:text-white/70 transition-colors"
                    aria-label="Download"
                  >
                    <Download size={17} />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-8 w-8 flex items-center justify-center text-white/35 hover:text-white/70 transition-colors outline-none"
                        aria-label="More options"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 border border-white/15 bg-zinc-950 text-white">
                      <DropdownMenuItem
                        className="focus:bg-white/10"
                        onClick={() => void downloadCurrentTrack(currentTrack)}
                      >
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-white/10" onClick={() => void shareOrCopyNowPlaying()}>
                        Share or copy
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="focus:bg-white/10" onClick={() => setShowNowPlaying(false)}>
                        Close
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )}

        </motion.div>
        </TooltipProvider>
      )}
    </AnimatePresence>
  );
}