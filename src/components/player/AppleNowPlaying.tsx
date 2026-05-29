'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Heart, MoreHorizontal, Shuffle, Repeat, Mic2,
  Volume2, Volume1, VolumeX, Globe,
} from 'lucide-react';
import { formatDuration } from '@/lib/demo-data';

function containsJapaneseKana(text: string): boolean {
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(text);
}

function sampleAlbumArtColors(imgUrl: string): Promise<[string, string, string]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 60;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(['40,40,60', '30,35,55', '20,25,45']); return; }
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      const pts = [
        [0.15, 0.15], [0.5, 0.1], [0.85, 0.15],
        [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
        [0.15, 0.85], [0.5, 0.9], [0.85, 0.85],
      ];

      const sampled: { r: number; g: number; b: number }[] = [];
      for (const [px, py] of pts) {
        const x = Math.floor(px * size);
        const y = Math.floor(py * size);
        const idx = (y * size + x) * 4;
        if (idx + 2 < data.length) {
          const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          sampled.push({
            r: Math.min(255, Math.round(avg + (data[idx] - avg) * 1.4)),
            g: Math.min(255, Math.round(avg + (data[idx + 1] - avg) * 1.4)),
            b: Math.min(255, Math.round(avg + (data[idx + 2] - avg) * 1.4)),
          });
        }
      }

      if (sampled.length === 0) { resolve(['40,40,60', '30,35,55', '20,25,45']); return; }

      const buckets: { r: number; g: number; b: number; count: number }[] = [];
      for (const c of sampled) {
        let found = false;
        for (const bkt of buckets) {
          if (Math.abs(bkt.r - c.r) < 35 && Math.abs(bkt.g - c.g) < 35 && Math.abs(bkt.b - c.b) < 35) {
            bkt.count++;
            bkt.r = Math.round((bkt.r + c.r) / 2);
            bkt.g = Math.round((bkt.g + c.g) / 2);
            bkt.b = Math.round((bkt.b + c.b) / 2);
            found = true; break;
          }
        }
        if (!found) buckets.push({ r: c.r, g: c.g, b: c.b, count: 1 });
      }

      buckets.sort((a, b) => b.count - a.count);
      const top = buckets.slice(0, 3);

      const darken = (c: { r: number; g: number; b: number }, amt: number) => ({
        r: Math.max(0, c.r - amt), g: Math.max(0, c.g - amt), b: Math.max(0, c.b - amt),
      });

      const c0 = top[0] ? darken(top[0], 40) : { r: 40, g: 40, b: 60 };
      const c1 = top[1] ? darken(top[1], 60) : { r: 30, g: 35, b: 55 };
      const c2 = top[2] ? darken(top[2], 80) : { r: 20, g: 25, b: 45 };

      const fmt = (c: { r: number; g: number; b: number }) => `${c.r},${c.g},${c.b}`;
      resolve([fmt(c0), fmt(c1), fmt(c2)]);
    };
    img.onerror = () => resolve(['40,40,60', '30,35,55', '20,25,45']);
    img.src = imgUrl;
  });
}

export default function AppleNowPlaying() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    showNowPlaying, setShowNowPlaying,
    volume, isMuted, setVolume, toggleMute,
    togglePlayPause, nextTrack, previousTrack,
  } = usePlayerStore();
  const { isFavourite, toggleFavourite } = useLibraryStore();
  const { playerTheme } = useUIStore();

  const [rawColors, setRawColors] = useState('40,40,60|30,35,55|20,25,45');
  const [showMenu, setShowMenu] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsOffset, setLyricsOffset] = useState(0);
  const [romajiMode, setRomajiMode] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const amLyricsRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const isFav = currentTrack ? isFavourite(currentTrack.id) : false;

  useEffect(() => {
    if (!currentTrack?.albumCover) return;
    setBgLoaded(false);
    sampleAlbumArtColors(currentTrack.albumCover).then((colors) => {
      setRawColors(colors.join('|'));
      setBgLoaded(true);
    });
  }, [currentTrack?.albumCover]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // Load am-lyrics web component
  useEffect(() => {
    import('@uimaxbai/am-lyrics/am-lyrics.js').catch(console.error);
  }, []);

  // Create/recreate am-lyrics element
  useEffect(() => {
    if (!showLyrics || !currentTrack || !lyricsContainerRef.current) {
      if (lyricsContainerRef.current) lyricsContainerRef.current.innerHTML = '';
      amLyricsRef.current = null;
      return;
    }
    const container = lyricsContainerRef.current;
    container.innerHTML = '';
    const el = document.createElement('am-lyrics');
    el.setAttribute('song-title', currentTrack.title);
    el.setAttribute('song-artist', currentTrack.artist);
    if (currentTrack.album) el.setAttribute('song-album', currentTrack.album);
    if (currentTrack.duration) el.setAttribute('song-duration', String(currentTrack.duration * 1000));
    el.setAttribute('query', `${currentTrack.title} ${currentTrack.artist}`.trim());
    el.setAttribute('highlight-color', '#ffffff');
    el.setAttribute('autoscroll', '');
    el.setAttribute('interpolate', '');
    if (containsJapaneseKana(currentTrack.title) || containsJapaneseKana(currentTrack.artist ?? '')) {
      el.setAttribute('lang', 'ja');
    }
    el.style.setProperty('--lyplus-blur-amount', '0.16em');
    el.style.setProperty('--lyplus-blur-amount-near', '0.085em');
    el.style.setProperty('--lyplus-text-color', 'rgba(255,255,255,0.08)');
    el.style.setProperty('--lyplus-active-color', '#ffffff');
    el.style.setProperty('--lyplus-font-size-base', 'clamp(34px, 3vw, 52px)');
    el.style.setProperty('--lyplus-padding-line', '8px');
    el.style.setProperty('--lyrics-scroll-padding-top', '80px');
    el.style.setProperty('font-weight', '600');
    el.style.setProperty('line-height', '1.32');
    el.style.setProperty('letter-spacing', '-0.04em');
    el.style.height = '100%';
    el.style.width = '100%';
    el.addEventListener('lyrics-ready', (() => {
      if (container.parentElement) container.parentElement.scrollTop = 0;
    }) as EventListener);
    container.appendChild(el);
    amLyricsRef.current = el;
  }, [showLyrics, currentTrack?.id, showNowPlaying]);

  // Sync currentTime to am-lyrics via rAF
  useEffect(() => {
    if (!showLyrics || !amLyricsRef.current) return;
    const tick = () => {
      const el = amLyricsRef.current;
      if (!el) return;
      const { currentTime: ct } = usePlayerStore.getState();
      el.currentTime = ct * 1000 - lyricsOffset * 1000;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [showLyrics, lyricsOffset]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    usePlayerStore.getState().seekTo(pct * (duration || 247));
  }, [duration]);

  const dur = duration || 247;
  const progress = Math.min((currentTime / dur) * 100, 100);
  const remaining = Math.max(0, dur - currentTime);

  if (playerTheme !== 'apple' && playerTheme !== 'spotify') return null;

  const [c1, c2, c3] = rawColors.split('|');

  return (
    <AnimatePresence>
      {showNowPlaying && currentTrack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-[300] flex flex-col items-center overflow-hidden select-none"
        >
          {/* Dark base */}
          <div className="absolute inset-0" style={{ background: '#161616' }} />

          {/* Animated background — Monochrome-inspired */}
          {currentTrack.albumCover && (
            <>
              {/* Blurred album art base */}
              <motion.div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${currentTrack.albumCover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(80px) saturate(1.3)',
                  opacity: bgLoaded ? 0.2 : 0,
                  transition: 'opacity 1.2s ease',
                }}
              />
              {/* Smooth conic gradient from extracted colors — no banding blobs */}
              <div
                className="absolute inset-0 anp-conic-rotate"
                style={{
                  background: `conic-gradient(from 0deg, rgba(${c1},0.3), rgba(${c2},0.2), rgba(${c3},0.3), rgba(${c1},0.3))`,
                  filter: 'blur(60px)',
                  opacity: bgLoaded ? 1 : 0,
                  transition: 'opacity 1.2s ease',
                }}
              />
              {/* Extra accent sweep */}
              <div
                className="absolute inset-0 anp-conic-sweep"
                style={{
                  background: `conic-gradient(from 0deg, transparent, rgba(${c1},0.15) 30%, rgba(${c2},0.1) 60%, transparent 90%)`,
                  filter: 'blur(40px)',
                  opacity: bgLoaded ? 0.6 : 0,
                  transition: 'opacity 1.2s ease',
                }}
              />
              {/* Noise overlay — breaks up banding (Monochrome dithering technique) */}
              <div
                className="absolute inset-0"
                style={{
                  opacity: 0.035,
                  mixBlendMode: 'overlay',
                  pointerEvents: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }}
              />
            </>
          )}

          {/* Dark vignette overlay */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
          }} />

          <style>{`
            @keyframes anp-marquee-scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .anp-scroll-inner {
              display: flex;
              white-space: nowrap;
              animation: anp-marquee-scroll 20s linear infinite;
              width: fit-content;
            }
            .anp-scroll-inner > span {
              display: inline-block;
              padding-right: 40px;
            }
            @keyframes anp-conic-rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .anp-conic-rotate {
              animation: anp-conic-rotate 25s linear infinite;
              will-change: transform;
            }
            @keyframes anp-conic-sweep {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .anp-conic-sweep {
              animation: anp-conic-sweep 35s linear infinite;
              will-change: transform;
            }
          `}</style>

          {/* Close button */}
          <button
            onClick={() => setShowNowPlaying(false)}
            className="absolute top-5 left-5 z-20 text-white/60 hover:text-white transition-colors"
          >
            <X size={22} strokeWidth={1.5} />
          </button>

          {showLyrics ? (
            /* ── Lyrics layout: two-column grid ── */
            <div className="relative z-10 flex-1 grid min-h-0 w-full"
              style={{
                gridTemplateColumns: 'minmax(420px, 540px) minmax(380px, 1fr)',
                gap: 'clamp(1.5rem, 3vw, 3.5rem)',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(2rem, 4vh, 4rem) clamp(2rem, 4vw, 4rem)',
                overflow: 'hidden',
              }}
            >
              {/* Left column: album + controls */}
              <div className="flex flex-col items-stretch justify-center gap-3 w-full">
                <img
                  src={currentTrack.albumCover || '/placeholder-album.png'}
                  alt={currentTrack.album || 'Album art'}
                  className="w-full aspect-square self-center object-cover rounded-[14px] shadow-[0_16px_60px_rgba(0,0,0,0.6)]"
                  crossOrigin="anonymous"
                />

                {/* Track info */}
                <div className="w-full mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-white font-bold text-[16px] leading-tight truncate">{currentTrack.title}</h2>
                    <div className="overflow-hidden whitespace-nowrap mt-0.5">
                      <div className="anp-scroll-inner">
                        <span className="text-white/60 text-[12px]">{currentTrack.artist}{currentTrack.album ? ` — ${currentTrack.album}` : ''}</span>
                        <span className="text-white/60 text-[12px]">{currentTrack.artist}{currentTrack.album ? ` — ${currentTrack.album}` : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => setShowLyrics(v => !v)} className="text-white transition-colors"><Mic2 size={16} strokeWidth={1.5} /></button>
                    <button onClick={() => toggleFavourite(currentTrack.id)} className="text-white/60 hover:text-white transition-colors">
                      <Heart size={16} fill={isFav ? 'currentColor' : 'none'} strokeWidth={1.5} />
                    </button>
                    <button onClick={() => setShowMenu(v => !v)} className="text-white/60 hover:text-white transition-colors relative">
                      <MoreHorizontal size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full">
                  <div ref={progressRef} className="relative w-full h-[3px] bg-white/[0.25] rounded-full cursor-pointer group" onClick={handleProgressClick}>
                    <div className="absolute left-0 top-0 h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-white rounded-full shadow-md" style={{ left: `calc(${progress}% - 5px)` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-white/70 text-[10px]">{formatDuration(currentTime)}</span>
                    <span className="text-white/70 text-[10px]">-{formatDuration(remaining)}</span>
                  </div>
                </div>

                {/* Transport controls */}
                <div className="flex items-center justify-center gap-6 w-full">
                  <button onClick={() => { const s = usePlayerStore.getState(); s.setShuffle ? s.setShuffle(!s.isShuffle) : null; }} className="text-white/60 hover:text-white transition-colors">
                    <Shuffle size={16} strokeWidth={1.5} />
                  </button>
                  <button onClick={previousTrack} className="text-white hover:text-white/80 transition-colors">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                      <polygon points="12,19 1,12 12,5" /><polygon points="24,19 13,12 24,5" />
                    </svg>
                  </button>
                  <button onClick={togglePlayPause} className="text-white hover:text-white/80 transition-colors">
                    {isPlaying ? (
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                        <rect x="5" y="2.5" width="5.5" height="19" rx="1.4" /><rect x="13.5" y="2.5" width="5.5" height="19" rx="1.4" />
                      </svg>
                    ) : (
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="ml-0.5">
                        <path d="M4 2v20l18-10z" />
                      </svg>
                    )}
                  </button>
                  <button onClick={nextTrack} className="text-white hover:text-white/80 transition-colors">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                      <polygon points="12,19 23,12 12,5" /><polygon points="0,19 11,12 0,5" />
                    </svg>
                  </button>
                  <button onClick={() => { const s = usePlayerStore.getState(); s.cycleRepeat ? s.cycleRepeat() : null; }} className="text-white/60 hover:text-white transition-colors">
                    <Repeat size={16} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Volume bar */}
                <div className="w-full flex items-center gap-2">
                  <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors flex-shrink-0">
                    {isMuted || volume === 0 ? <VolumeX size={14} strokeWidth={1.5} /> : volume < 0.5 ? <Volume1 size={14} strokeWidth={1.5} /> : <Volume2 size={14} strokeWidth={1.5} />}
                  </button>
                  <div className="relative flex-1 h-[3px] bg-white/[0.25] rounded-full cursor-pointer group" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}>
                    <div className="absolute left-0 top-0 h-full bg-white rounded-full" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-[8px] h-[8px] bg-white rounded-full shadow-md" style={{ left: `calc(${isMuted ? 0 : volume * 100}% - 4px)` }} />
                  </div>
                </div>
              </div>

              {/* Right column: lyrics */}
              <aside className="relative flex flex-col min-w-0 h-full self-stretch overflow-hidden">
                {/* Header overlay — scrolls with content via flex layout */}
                <div className="flex items-center justify-between px-1 pt-8 pb-2 flex-shrink-0">
                  <span className="text-white/50 text-[11px] font-medium uppercase tracking-wider">Lyrics</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRomajiMode(v => !v)} className={`p-1 rounded ${romajiMode ? 'text-white' : 'text-white/40 hover:text-white/70'}`} title="Romaji">
                      <Globe size={14} strokeWidth={1.5} />
                    </button>
                    <button onClick={() => setLyricsOffset(v => Math.max(-5, v - 0.1))} className="text-white/40 hover:text-white/70 p-1 text-xs font-mono">–</button>
                    <span className="text-white/30 text-[10px] font-mono w-8 text-center">{lyricsOffset.toFixed(1)}s</span>
                    <button onClick={() => setLyricsOffset(v => Math.min(5, v + 0.1))} className="text-white/40 hover:text-white/70 p-1 text-xs font-mono">+</button>
                    <button onClick={() => setShowLyrics(false)} className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white rounded hover:bg-white/10">
                      <X size={13} />
                    </button>
                  </div>
                </div>
                {/* Scrollable lyrics area */}
                <div className="flex-1 overflow-y-auto min-h-0 pt-10" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <div ref={lyricsContainerRef} style={{ height: '100%' }} />
                </div>
              </aside>
            </div>
          ) : (
            /* ── Centered layout (no lyrics) ── */
            <div className="relative z-10 flex flex-col items-center w-full h-full max-w-[680px]">
              {/* Top section */}
              <div className="flex flex-col items-center w-full mt-16 flex-shrink-0">
                <div className="flex-shrink-0">
                  <img
                    src={currentTrack.albumCover || '/placeholder-album.png'}
                    alt={currentTrack.album || 'Album art'}
                    className="w-[min(65vh,680px)] h-[min(65vh,680px)] max-w-[680px] max-h-[680px] object-cover rounded-[14px] shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
                    crossOrigin="anonymous"
                  />
                </div>

                {/* Track Info */}
                <div className="w-full mt-[25px] mb-1 flex items-center justify-between gap-4 px-10">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-white font-bold text-[21px] leading-tight truncate">
                      {currentTrack.title}
                    </h2>
                    <div className="overflow-hidden whitespace-nowrap mt-0.5">
                      <div className="anp-scroll-inner">
                        <span className="text-white/60 text-[13px]">{currentTrack.artist}{currentTrack.album ? ` — ${currentTrack.album}` : ''}</span>
                        <span className="text-white/60 text-[13px]">{currentTrack.artist}{currentTrack.album ? ` — ${currentTrack.album}` : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <button
                      onClick={() => setShowLyrics(v => !v)}
                      className={`transition-colors ${showLyrics ? 'text-white' : 'text-white/60 hover:text-white'}`}
                    >
                      <Mic2 size={18} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => toggleFavourite(currentTrack.id)}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      <Heart size={18} fill={isFav ? 'currentColor' : 'none'} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setShowMenu(v => !v)}
                      className="text-white/60 hover:text-white transition-colors relative"
                    >
                      <MoreHorizontal size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* 3-dot Menu */}
                {showMenu && (
                  <div
                    ref={menuRef}
                    className="absolute right-10 top-[calc(50%+60px)] bg-[rgba(30,30,35,0.95)] border border-white/[0.08] rounded-xl shadow-xl py-1 z-20 min-w-[160px]"
                  >
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left">
                      Add to Library
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left">
                      Add to Playlist
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left">
                      View Album
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left">
                      View Artist
                    </button>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="w-[min(65vh,680px)] max-w-[680px] mb-1">
                  <div
                    ref={progressRef}
                    className="relative w-full h-[3px] bg-white/[0.25] rounded-full cursor-pointer group"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-white rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-white rounded-full shadow-md"
                      style={{ left: `calc(${progress}% - 5px)` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-white/70 text-[11px]">{formatDuration(currentTime)}</span>
                    <span className="text-white/70 text-[11px]">-{formatDuration(remaining)}</span>
                  </div>
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-1 min-h-0" />

              {/* Bottom section */}
              <div className="flex flex-col items-center w-full flex-shrink-0 mb-14">
                {/* Transport Controls */}
                <div className="flex items-center justify-center gap-8 mb-5">
                  <button
                    onClick={() => { const s = usePlayerStore.getState(); s.setShuffle ? s.setShuffle(!s.isShuffle) : null; }}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <Shuffle size={20} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={previousTrack}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                      <polygon points="12,19 1,12 12,5" /><polygon points="24,19 13,12 24,5" />
                    </svg>
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    {isPlaying ? (
                      <svg width="37" height="37" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                        <rect x="5" y="2.5" width="5.5" height="19" rx="1.4" /><rect x="13.5" y="2.5" width="5.5" height="19" rx="1.4" />
                      </svg>
                    ) : (
                      <svg width="37" height="37" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="ml-0.5">
                        <path d="M4 2v20l18-10z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={nextTrack}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                      <polygon points="12,19 23,12 12,5" /><polygon points="0,19 11,12 0,5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { const s = usePlayerStore.getState(); s.cycleRepeat ? s.cycleRepeat() : null; }}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <Repeat size={20} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Volume Bar */}
                <div className="w-[min(65vh,680px)] max-w-[680px] flex items-center gap-3">
                  <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors flex-shrink-0">
                    {isMuted || volume === 0 ? <VolumeX size={16} strokeWidth={1.5} /> : volume < 0.5 ? <Volume1 size={16} strokeWidth={1.5} /> : <Volume2 size={16} strokeWidth={1.5} />}
                  </button>
                  <div className="relative flex-1 h-[3px] bg-white/[0.25] rounded-full cursor-pointer group" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}>
                    <div className="absolute left-0 top-0 h-full bg-white rounded-full" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-[8px] h-[8px] bg-white rounded-full shadow-md" style={{ left: `calc(${isMuted ? 0 : volume * 100}% - 4px)` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
