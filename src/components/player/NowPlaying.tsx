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
  Volume2, Volume1, VolumeX, Heart, ListMusic, ChevronDown, Download,
  MoreHorizontal, Star, ChevronUp,
} from 'lucide-react';
import { downloadCurrentTrack } from '@/lib/download-track';
import { seekbarWrapperClass } from '@/lib/seekbar-styles';
import { AppleMusicPlayIcon } from '@/components/icons/AppleMusicPlayIcon';

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
  const remainingTime = duration > 0 ? Math.max(0, duration - currentTime) : 0;

  return (
    <AnimatePresence>
      {showNowPlaying && currentTrack && (
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
                <div className="absolute inset-0 bg-black/55" />
                <div className="absolute inset-x-0 bottom-0 h-2/3"
                  style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.92) 100%)' }} />
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

                {/* Album Art — Apple Music: large square, prominent rounded corners, deep shadow */}
                <div className="flex-1 flex items-center justify-center py-4">
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full aspect-square max-w-[min(72vw,380px)] rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 32px 72px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.5)' }}
                  >
                    {currentTrack.albumCover ? (
                      <img src={currentTrack.albumCover} alt={currentTrack.album} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <svg className="w-20 h-20 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Track info — Apple Music: title left, heart right */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-[22px] font-bold text-white tracking-[-0.02em] truncate leading-tight">
                        {currentTrack.title}
                      </h2>
                      {qualityBadge && (
                        <span className="shrink-0 text-[9px] font-black px-1 py-0.5 rounded-[2px] tracking-wide bg-black/80 text-white border border-white/20 leading-none">
                          {qualityBadge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[16px] text-[#fc3c44] font-medium truncate mt-0.5 leading-tight">
                      {/* Apple Music shows artist in their brand red/pink */}
                      {currentTrack.artist}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFavourite(currentTrack)}
                    className={cn('shrink-0 transition-colors', isFav ? 'text-[#fc3c44]' : 'text-white/40 hover:text-white/70')}
                    aria-label={isFav ? 'Remove from library' : 'Add to library'}
                  >
                    <Heart size={24} strokeWidth={1.8} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Seekbar — Apple Music: slim white track, red-tinted fill, round thumb */}
                <div className="mb-1">
                  <div className={cn('w-full apple-progress', seekbarWrapperClass(seekbarStyle))}>
                    <Slider
                      value={[currentTime]}
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={(v) => seekTo(v[0])}
                      className="w-full cursor-pointer"
                    />
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

                  {/* Apple Music: LARGE icon, NO circle, NO background - fixed position */}
                  <button
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
                    style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                  >
                    {isPlaying ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="6,3 20,12 6,21" />
                      </svg>
                    )}
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

                {/* Volume — Apple Music: speaker icons flanking a slim slider */}
                <div className="flex items-center gap-3 px-1 mb-4">
                  <button onClick={toggleMute} className="text-white/40 hover:text-white/70 transition-colors shrink-0">
                    <VolumeX size={16} />
                  </button>
                  <div className="flex-1 apple-progress">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      min={0} max={100} step={1}
                      onValueChange={(v) => setVolume(v[0] / 100)}
                      className="w-full cursor-pointer"
                    />
                  </div>
                  <button onClick={toggleMute} className="text-white/40 hover:text-white/70 transition-colors shrink-0">
                    <Volume2 size={16} />
                  </button>
                </div>

                {/* Bottom row — Apple Music: AirPlay left, star (add), more (…) right */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => void downloadCurrentTrack(currentTrack)}
                    className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
                    aria-label="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => toggleFavourite(currentTrack)}
                    className={cn('h-8 w-8 flex items-center justify-center rounded-full border transition-colors',
                      isFav
                        ? 'border-[#fc3c44] text-[#fc3c44]'
                        : 'border-white/25 text-white/50 hover:border-white/50 hover:text-white/80')}
                    aria-label="Add to library"
                  >
                    <Star size={15} strokeWidth={2} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
                    aria-label="More"
                  >
                    <MoreHorizontal size={18} />
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
                <div className="flex items-center justify-between py-4">
                  <button
                    onClick={() => setShowNowPlaying(false)}
                    className="h-8 w-8 flex items-center justify-center text-white hover:text-white/70 transition-colors"
                    aria-label="Close"
                  >
                    <ChevronDown size={24} strokeWidth={2.5} />
                  </button>
                  <div className="text-center min-w-0 flex-1 px-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70 truncate">
                      {currentTrack.album || 'Now Playing'}
                    </p>
                  </div>
                  <button
                    className="h-8 w-8 flex items-center justify-center text-white hover:text-white/70 transition-colors"
                    aria-label="More options"
                  >
                    <MoreHorizontal size={22} />
                  </button>
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
                      <img src={currentTrack.albumCover} alt={currentTrack.album} className="w-full h-full object-cover" />
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
                    <Slider
                      value={[currentTime]}
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={(v) => seekTo(v[0])}
                      className="w-full cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[11px] font-medium tabular-nums text-white/55">{formatDuration(currentTime)}</span>
                    <span className="text-[11px] font-medium tabular-nums text-white/55">
                      -{formatDuration(remainingTime)}
                    </span>
                  </div>
                </div>

                {/* Main controls — Spotify: shuffle | prev | PLAY CIRCLE | next | repeat */}
                <div className="flex items-center justify-between px-2 mt-2 mb-5">
                  <button
                    onClick={toggleShuffle}
                    className={cn('h-8 w-8 flex items-center justify-center transition-colors',
                      isShuffle ? 'text-[#1DB954]' : 'text-white/55 hover:text-white')}
                    aria-label="Shuffle"
                  >
                    <Shuffle size={18} strokeWidth={2} />
                  </button>

                  <button onClick={previousTrack} className="h-10 w-10 flex items-center justify-center text-white hover:text-white/70 transition-colors" aria-label="Previous">
                    <SkipBack size={28} fill="currentColor" strokeWidth={0} />
                  </button>

                  {/* Spotify: exact white filled circle, black icon */}
                  <button
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="h-[56px] w-[56px] rounded-full bg-white flex items-center justify-center transition-transform duration-150 hover:scale-[1.05] active:scale-[0.97] focus-visible:outline-none"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}
                  >
                    {isPlaying ? (
                      <Pause size={24} fill="black" strokeWidth={0} />
                    ) : (
                      <Play size={24} fill="black" strokeWidth={0} className="translate-x-[2px]" />
                    )}
                  </button>

                  <button onClick={nextTrack} className="h-10 w-10 flex items-center justify-center text-white hover:text-white/70 transition-colors" aria-label="Next">
                    <SkipForward size={28} fill="currentColor" strokeWidth={0} />
                  </button>

                  <button
                    onClick={cycleRepeat}
                    className={cn('h-8 w-8 flex items-center justify-center transition-colors',
                      repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-white/55 hover:text-white')}
                    aria-label="Repeat"
                  >
                    {repeatMode === 'one' ? <Repeat1 size={18} strokeWidth={2} /> : <Repeat size={18} strokeWidth={2} />}
                  </button>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-3 px-1 mb-4">
                  <button onClick={toggleMute} className="text-white/50 hover:text-white/80 transition-colors shrink-0">
                    <VolumeX size={16} />
                  </button>
                  <div className="flex-1 spotify-progress">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      min={0} max={100} step={1}
                      onValueChange={(v) => setVolume(v[0] / 100)}
                      className="w-full cursor-pointer"
                    />
                  </div>
                  <button onClick={toggleMute} className="text-white/50 hover:text-white/80 transition-colors shrink-0">
                    <Volume2 size={16} />
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
              {/* Tidal: album art fills top 55%, blurred behind controls */}
              <div className="absolute inset-0">
                {currentTrack.albumCover && (
                  <img
                    src={currentTrack.albumCover}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-105"
                    style={{ filter: 'blur(70px) saturate(1.4) brightness(0.3)' }}
                  />
                )}
                <div className="absolute inset-0 bg-black/65" />
              </div>

              <div className="relative z-10 flex flex-col h-full max-w-[600px] mx-auto w-full px-6 pb-10 pt-3">
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

                {/* Album Art — Tidal: square, rounded-xl, prominent glow */}
                <div className="flex items-center justify-center flex-1 py-4">
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full aspect-square max-w-[min(72vw,380px)] rounded-xl overflow-hidden"
                    style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)' }}
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
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-[2px] tracking-wide bg-cyan-500 text-black leading-none">
                        {qualityBadge.label}
                      </span>
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

                {/* Seekbar — Tidal: glass-style track, white fill */}
                <div className="mb-1">
                  <div className={cn('w-full tidal-progress-slider', seekbarWrapperClass(seekbarStyle))}>
                    <Slider
                      value={[currentTime]}
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={(v) => seekTo(v[0])}
                      className="w-full cursor-pointer"
                    />
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

                {/* Volume + Download */}
                <div className="flex items-center gap-3 px-1 mb-3">
                  <button onClick={toggleMute} className="text-white/35 hover:text-white/70 transition-colors shrink-0">
                    <VolumeX size={16} />
                  </button>
                  <div className="flex-1 tidal-progress-slider">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      min={0} max={100} step={1}
                      onValueChange={(v) => setVolume(v[0] / 100)}
                      className="w-full cursor-pointer"
                    />
                  </div>
                  <button onClick={toggleMute} className="text-white/35 hover:text-white/70 transition-colors shrink-0">
                    <Volume2 size={16} />
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
                  <button
                    className="h-8 w-8 flex items-center justify-center text-white/35 hover:text-white/70 transition-colors"
                    aria-label="More"
                  >
                    <MoreHorizontal size={17} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      )}
    </AnimatePresence>
  );
}