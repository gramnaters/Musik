'use client';

import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, ListMusic, ChevronDown, MoreHorizontal, Sparkles,
  Maximize2, Music, Users, FileText,
  X, Plus, Copy, Share2, ExternalLink, ChevronRight,
  Download, PenLine, Radio, Globe,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getRecommendations, mapMonochromeTrack } from '@/lib/monochrome';

const colorPalettes: [string, string][] = [
  ['#8B1A1A', '#4A0E0E'],
  ['#1A3A5C', '#0A1F35'],
  ['#2D5A1B', '#152B0D'],
  ['#5C3A1A', '#2E1C0D'],
  ['#3A1A5C', '#1C0D2E'],
  ['#1A4A4A', '#0D2525'],
  ['#5C4A1A', '#2E250D'],
  ['#4A1A3A', '#250D1C'],
];

function containsJapaneseKana(text: string): boolean {
  if (!text) return false;
  return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

function containsAsianText(text: string): boolean {
  if (!text) return false;
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

async function loadAndConvertRomaji(el: HTMLElement) {
  const root = el.shadowRoot || el;
  const text = root.textContent || '';
  if (!containsAsianText(text)) return;

  try {
    if (!window.Kuroshiro) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Kuroshiro'));
        document.head.appendChild(s);
      });
    }
    if (!window.KuromojiAnalyzer) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load KuromojiAnalyzer'));
        document.head.appendChild(s);
      });
    }

    const Kuroshiro = (window as any).Kuroshiro.default || (window as any).Kuroshiro;
    const KuromojiAnalyzer = (window as any).KuromojiAnalyzer.default || (window as any).KuromojiAnalyzer;
    const kuroshiro = new Kuroshiro();

    // Monkey-patch XHR for kuromoji dict files
    if (!(window as any)._kuroOriginalXHR) {
      (window as any)._kuroOriginalXHR = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method: string, url: any, ...rest: any[]) {
        const urlStr = url.toString();
        if (urlStr.includes('/dict/') && urlStr.includes('.dat.gz')) {
          const filename = urlStr.split('/').pop();
          const cdnUrl = `https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/${filename}`;
          return (window as any)._kuroOriginalXHR.call(this, method, cdnUrl, ...rest);
        }
        return (window as any)._kuroOriginalXHR.call(this, method, url, ...rest);
      };
    }

    await kuroshiro.init(new KuromojiAnalyzer({ dictPath: '/dict/' }));

    // Convert text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const nodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) nodes.push(node);

    for (const textNode of nodes) {
      if (!textNode.parentElement) continue;
      const txt = textNode.textContent || '';
      if (!containsAsianText(txt)) continue;

      const parentTag = textNode.parentElement.tagName.toLowerCase();
      const parentClass = String(textNode.parentElement.className || '');
      if (['script', 'style', 'code'].includes(parentTag)) continue;
      if (parentClass.includes('timestamp') || (parentClass.includes('time') && !parentClass.includes('progress-text'))) continue;

      try {
        const romaji = await kuroshiro.convert(txt, { to: 'romaji', mode: 'spaced', romajiSystem: 'hepburn' });
        if (romaji && romaji !== txt) textNode.textContent = romaji;
      } catch {}
    }
  } catch (e) {
    console.warn('Romaji conversion failed:', e);
  }
}

export default function NowPlaying() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    showNowPlaying, setShowNowPlaying,
  } = usePlayerStore();
  const { isFavourite, toggleFavourite } = useLibraryStore();
  const { playlists, addToPlaylist, createPlaylist } = useLibraryStore();

  const [isHovering, setIsHovering] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showSimilarTracks, setShowSimilarTracks] = useState(false);
  const [similarTracks, setSimilarTracks] = useState<any[]>([]);
  const [similarTracksLoading, setSimilarTracksLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showPlaylistSub, setShowPlaylistSub] = useState(false);
  const [showShareSub, setShowShareSub] = useState(false);
  const [lyricsOffset, setLyricsOffset] = useState(0);
  const [romajiMode, setRomajiMode] = useState(false);
  const [color1, setColor1] = useState('#1A3A5C');
  const [color2, setColor2] = useState('#0A1F35');

  const albumRef = useRef<HTMLDivElement>(null);
  const albumInnerRef = useRef<HTMLDivElement>(null);
  const albumGlowRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const amLyricsRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    setColor1(palette[0]);
    setColor2(palette[1]);
  }, [currentTrack?.id]);

  // Load am-lyrics web component
  useEffect(() => {
    import('@uimaxbai/am-lyrics/am-lyrics.js').catch(console.error);
  }, []);

  // Initialize Romaji mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lyricsRomajiMode');
      if (saved === 'true') setRomajiMode(true);
    } catch {}
  }, []);

  // Create/recreate am-lyrics element when track or visibility changes
  useEffect(() => {
    if (!showLyrics || !currentTrack || !lyricsContainerRef.current) {
      // Clear container when lyrics hidden or no track
      if (lyricsContainerRef.current) {
        lyricsContainerRef.current.innerHTML = '';
      }
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
    el.style.setProperty('--lyrics-scroll-padding-top', '18%');
    el.style.setProperty('font-weight', '600');
    el.style.setProperty('line-height', '1.32');
    el.style.setProperty('letter-spacing', '-0.04em');
    el.style.height = '100%';
    el.style.width = '100%';

    el.addEventListener('lyrics-ready', (() => {
      if (container.parentElement) {
        container.parentElement.scrollTop = 0;
      }
    }) as EventListener);

    container.appendChild(el);
    amLyricsRef.current = el;
  }, [showLyrics, currentTrack?.id, showNowPlaying]);

  // Auto-convert to Romaji when lyrics load and Romaji mode is on
  useEffect(() => {
    if (!showLyrics || !amLyricsRef.current || !romajiMode) return;
    const el = amLyricsRef.current;
    const tryConvert = () => {
      const root = el.shadowRoot || el;
      if (root.textContent && root.textContent.length > 50) {
        loadAndConvertRomaji(el);
      }
    };
    const id = setTimeout(tryConvert, 1000);
    const id2 = setTimeout(tryConvert, 3000);
    return () => { clearTimeout(id); clearTimeout(id2); };
  }, [showLyrics, romajiMode, currentTrack?.id]);

  // Sync currentTime to am-lyrics via rAF (Monochrome-style smooth sync)
  useEffect(() => {
    if (!showLyrics || !amLyricsRef.current) return;

    const tick = () => {
      const el = amLyricsRef.current;
      if (!el) return;
      const { currentTime: ct } = usePlayerStore.getState();
      const adjMs = ct * 1000 - lyricsOffset * 1000;
      el.currentTime = adjMs;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [showLyrics, lyricsOffset]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false); setShowPlaylistSub(false); setShowShareSub(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false); setShowPlaylistSub(false); setShowShareSub(false);
        setShowSimilarTracks(false);
        if (showLyrics) setShowLyrics(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showLyrics]);

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
    } catch { /* user cancelled */ }
  };

  const handleAlbumMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!albumRef.current) return;
    const rect = albumRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const rx = dy * -10;
    const ry = dx * 10;
    if (albumInnerRef.current) {
      albumInnerRef.current.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
      albumInnerRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
    const sx = ((e.clientX - rect.left) / rect.width) * 100;
    const sy = ((e.clientY - rect.top) / rect.height) * 100;
    if (albumGlowRef.current) {
      albumGlowRef.current.style.background = `radial-gradient(circle 180px at ${sx}% ${sy}%, rgba(255,255,255,0.04), transparent)`;
    }
  };

  const handleAlbumLeave = () => {
    if (albumInnerRef.current) {
      albumInnerRef.current.style.transition = 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
      albumInnerRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }
    if (albumGlowRef.current) {
      albumGlowRef.current.style.background = 'radial-gradient(circle 180px at 50% 50%, transparent, transparent)';
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 4 });
    setShowMenu((v) => !v);
    setShowPlaylistSub(false);
    setShowShareSub(false);
  };

  const artistName = currentTrack?.artist || '';
  const artistAvatarUrl = currentTrack?.albumCover || '';

  const topPills = [
    {
      label: 'Similar tracks',
      fn: async () => {
        if (!currentTrack?.id) return;
        setSimilarTracks([]);
        setSimilarTracksLoading(true);
        setShowSimilarTracks(true);
        try {
          // Use the original source track ID (not the addon-prefixed one) for Tidal API
          const trackId = currentTrack.addonTrackId || currentTrack.id;
          const data = await getRecommendations(trackId);
          const items = (data.tracks || data.items || data.results || []).slice(0, 20);
          setSimilarTracks(items.map(mapMonochromeTrack));
        } catch {
          setSimilarTracks([]);
        } finally {
          setSimilarTracksLoading(false);
        }
      },
    },
    { label: 'Credits', fn: () => setShowCredits(true) },
    { label: 'Lyrics', fn: () => setShowLyrics((v) => !v) },
  ];

  const renderAlbumArt = () => (
    <div
      ref={albumRef}
      onMouseMove={handleAlbumMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleAlbumLeave}
      className="relative cursor-pointer w-full h-full"
      style={{ perspective: '1500px', transformStyle: 'preserve-3d' }}
    >
      <div
        ref={albumInnerRef}
        className="w-full h-full overflow-hidden"
        style={{
          transform: 'rotateX(0deg) rotateY(0deg)',
          transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        {currentTrack.albumCover ? (
          <img src={currentTrack.albumCover} alt={currentTrack.album} className="w-full h-full object-cover object-center" style={{ imageRendering: '-webkit-optimize-contrast' }} />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center"><Music size={80} className="text-white/20" /></div>
        )}
        <div
          ref={albumGlowRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle 180px at 50% 50%, transparent, transparent)',
            transition: 'background 0.15s ease-out',
          }}
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {showNowPlaying && currentTrack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[100]"
        >
          {/* Background: solid color from album palette */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${color1}, ${color2})`,
            }}
          />

          {/* Content layer — clipped to stay above player bar */}
          <div className="absolute inset-x-0 top-0 bottom-[100px] flex flex-col overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              {/* ─── TOP BAR ─── */}
              <div className="flex items-center justify-between px-8 pt-6 pb-2 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/20 bg-white/10">
                    {artistAvatarUrl ? (
                      <img src={artistAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50 text-xs font-bold">{artistName.charAt(0)}</div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white/90 hover:underline cursor-pointer">{artistName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {topPills.map((pill) => (
                    <button
                      key={pill.label}
                      onClick={pill.fn}
                      style={{
                        padding: '7px 18px',
                        borderRadius: '999px',
                        background: pill.label === 'Lyrics' && showLyrics
                          ? 'rgba(255,255,255,0.25)'
                          : 'rgba(255,255,255,0.1)',
                        border: `1px solid ${
                          pill.label === 'Lyrics' && showLyrics
                            ? 'rgba(255,255,255,0.5)'
                            : 'rgba(255,255,255,0.22)'
                        }`,
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 500,
                        letterSpacing: '0.01em',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        if (!(pill.label === 'Lyrics' && showLyrics)) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          pill.label === 'Lyrics' && showLyrics
                            ? 'rgba(255,255,255,0.25)'
                            : 'rgba(255,255,255,0.1)';
                      }}
                    >
                      {pill.label}
                    </button>
                  ))}
                  <button className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                    <Maximize2 size={15} />
                  </button>
                  <button
                    onClick={() => setShowNowPlaying(false)}
                    className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
              </div>

              {/* ─── CENTER ─── */}
              {showLyrics ? (
                <div
                  className="flex-1 grid min-h-0"
                  style={{
                    gridTemplateColumns: 'minmax(420px, 580px) minmax(440px, 1fr)',
                    gap: 'clamp(2rem, 4vw, 4.5rem)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'clamp(3rem, 6vh, 5rem) clamp(3rem, 6vw, 5rem) clamp(3rem, 5vh, 4rem)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Left: album section */}
                  <div className="flex flex-col items-center justify-center" style={{ width: 'min(580px, 100%)', justifySelf: 'center' }}>
                    <div className="w-full">
                      {renderAlbumArt()}
                    </div>
                  </div>

                  {/* Right: lyrics panel - monochrome style */}
                  <aside className="flex flex-col items-stretch justify-start overflow-hidden min-w-0" style={{ opacity: 1, transform: 'translateX(0)' }}>
                    {/* Shell wrapper matching Monochrome */}
                    <div style={{ width: 'min(860px, 100%)', minHeight: 0, marginLeft: 0 }}>
                      {/* Header with timing controls + romaji toggle */}
                      <div className="flex items-center justify-between shrink-0 mb-4" style={{ paddingRight: 'clamp(1rem, 2vw, 2rem)' }}>
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Lyrics</span>
                          <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
                          <button onClick={() => setLyricsOffset((o) => o - 0.5)} className="h-6 w-6 flex items-center justify-center text-sm text-white/50 hover:text-white rounded hover:bg-white/10">&minus;</button>
                          <span
                            onClick={() => setLyricsOffset(0)}
                            style={{ fontSize: '11px', fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.5)', width: '48px', textAlign: 'center', fontWeight: 600, cursor: 'pointer' }}
                            title="Reset timing offset"
                          >
                            {lyricsOffset >= 0 ? '+' : ''}{lyricsOffset.toFixed(1)}s
                          </span>
                          <button onClick={() => setLyricsOffset((o) => o + 0.5)} className="h-6 w-6 flex items-center justify-center text-sm text-white/50 hover:text-white rounded hover:bg-white/10">+</button>
                          {lyricsOffset !== 0 && (
                            <button onClick={() => setLyricsOffset(0)} className="h-6 px-2 text-[10px] text-white/40 hover:text-white rounded hover:bg-white/10">↺</button>
                          )}
                          <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                          <button
                            onClick={() => {
                              const next = !romajiMode;
                              setRomajiMode(next);
                              try { localStorage.setItem('lyricsRomajiMode', next ? 'true' : 'false'); } catch {}
                              if (amLyricsRef.current && next) {
                                loadAndConvertRomaji(amLyricsRef.current);
                              }
                            }}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                            style={{ color: romajiMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}
                            title="Toggle Romaji (Japanese to Latin)"
                          >
                            <Globe size={14} />
                          </button>
                          <button onClick={() => setShowLyrics(false)} className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white rounded hover:bg-white/10"><X size={13} /></button>
                        </div>
                      </div>

                      {/* am-lyrics container */}
                      <div
                        ref={lyricsContainerRef}
                        className="lyrics-scroll"
                        style={{
                          minHeight: 0,
                          height: '100%',
                          position: 'relative',
                          paddingLeft: 'clamp(0.5rem, 1.6vw, 1.5rem)',
                          overflow: 'visible',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                        }}
                      />
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center min-h-0 p-10">
                  <div className="w-[580px] h-[590px] min-w-[580px] min-h-[590px] max-[1200px]:w-[420px] max-[1200px]:h-[430px] max-[1200px]:min-w-[420px] max-[1200px]:min-h-[430px]">
                    {renderAlbumArt()}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Overlays */}
          {showMenu && (
            <ContextMenuOverlay
              menuRef={menuRef}
              currentTrack={currentTrack}
              menuPos={menuPos}
              showPlaylistSub={showPlaylistSub}
              showShareSub={showShareSub}
              setShowMenu={setShowMenu}
              setShowPlaylistSub={setShowPlaylistSub}
              setShowShareSub={setShowShareSub}
              toggleFavourite={toggleFavourite}
              playlists={playlists}
              addToPlaylist={addToPlaylist}
              createPlaylist={createPlaylist}
              shareOrCopyNowPlaying={shareOrCopyNowPlaying}
              setShowCredits={setShowCredits}
              toast={toast}
            />
          )}
          {showCredits && currentTrack && (
            <CreditsModal currentTrack={currentTrack} onClose={() => setShowCredits(false)} />
          )}
          {showSimilarTracks && currentTrack && (
            <SimilarTracksModal
              currentTrack={currentTrack}
              tracks={similarTracks}
              loading={similarTracksLoading}
              onClose={() => { setShowSimilarTracks(false); setSimilarTracksLoading(false); }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Sub-components ─── */

function ContextMenuOverlay({ menuRef, currentTrack, menuPos, showPlaylistSub, showShareSub, setShowMenu, setShowPlaylistSub, setShowShareSub, toggleFavourite, playlists, addToPlaylist, createPlaylist, shareOrCopyNowPlaying, setShowCredits, toast: _toast }: any) {
  return (
    <div ref={menuRef} className="fixed z-[300] w-72 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
      style={{ left: Math.min(menuPos.x, window.innerWidth - 300), top: menuPos.y }}>
      {!showPlaylistSub && !showShareSub && (
        <div>
          <div className="flex items-center gap-3 p-3 border-b border-white/10">
            {currentTrack?.albumCover ? <img src={currentTrack.albumCover} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-white/10" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentTrack?.title}</p>
              <p className="text-xs text-white/50 truncate">{currentTrack?.artist}</p>
            </div>
          </div>
          {[
            { icon: Plus, label: 'Add to playlist', right: <ChevronRight size={14} />, fn: () => setShowPlaylistSub(true) },
            { icon: Heart, label: 'Add to My Collection', fn: () => { currentTrack && toggleFavourite(currentTrack); setShowMenu(false); } },
            { icon: Sparkles, label: 'Go to track radio', fn: () => { _toast({ title: 'Track Radio' }); setShowMenu(false); } },
            { icon: Music, label: 'Go to album', fn: () => { setShowMenu(false); } },
            { icon: Download, label: 'Download Track', fn: () => { if (currentTrack) { void import('@/lib/download-track').then(m => m.downloadSingleTrack(currentTrack)); } setShowMenu(false); } },
            { icon: Download, label: 'Download Album', fn: () => { if (currentTrack && currentTrack.albumId) { void import('@/lib/download-track').then(m => m.downloadTracksBulk([currentTrack], { albumName: currentTrack.album, artistName: currentTrack.artist })); } setShowMenu(false); } },
            { icon: FileText, label: 'Credits', fn: () => { setShowCredits(true); setShowMenu(false); } },
            { icon: Users, label: 'Go to artist', fn: () => { setShowMenu(false); } },
            { icon: Share2, label: 'Share', right: <ChevronRight size={14} />, fn: () => setShowShareSub(true) },
          ].map((item: any) => (
            <button key={item.label} onClick={item.fn} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.08] transition-colors text-left">
              <item.icon size={15} className="text-white/40 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.right}
            </button>
          ))}
          <div className="border-t border-white/10">
            <button onClick={() => { window.location.href = `tidal://track/${currentTrack?.id}`; setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.08] transition-colors">
              <ExternalLink size={15} className="text-white/40 flex-shrink-0" /> Open in Desktop app <span className="text-[10px] font-bold text-white/20 tracking-wider ml-auto">TIDAL</span>
            </button>
          </div>
        </div>
      )}
      {showPlaylistSub && (
        <div>
          <button onClick={() => setShowPlaylistSub(false)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.08] border-b border-white/10"><ChevronRight size={14} className="rotate-180" /> Back</button>
          <button onClick={() => { const name = prompt('Playlist name:'); if (name && currentTrack) { const pl = createPlaylist(name); addToPlaylist(pl.id, currentTrack); _toast({ title: 'Added', description: `Added to "${name}"` }); } setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.08]"><Plus size={15} className="text-white/40" /> New playlist</button>
          {playlists.filter((p: any) => p.id !== 'liked').map((pl: any) => (
            <button key={pl.id} onClick={() => { if (currentTrack) { addToPlaylist(pl.id, currentTrack); _toast({ title: 'Added', description: `Added to "${pl.name}"` }); } setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.08]"><ListMusic size={15} className="text-white/40" /> {pl.name}</button>
          ))}
        </div>
      )}
      {showShareSub && (
        <div>
          <button onClick={() => setShowShareSub(false)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.08] border-b border-white/10"><ChevronRight size={14} className="rotate-180" /> Back</button>
          <button onClick={() => { if (currentTrack) navigator.clipboard?.writeText(`${currentTrack.title} — ${currentTrack.artist}`); _toast({ title: 'Copied' }); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.08]"><Copy size={15} className="text-white/40" /> Copy link</button>
          <button onClick={() => { void shareOrCopyNowPlaying(); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.08]"><Share2 size={15} className="text-white/40" /> Share</button>
        </div>
      )}
    </div>
  );
}

function SimilarTracksModal({ currentTrack, tracks, loading, onClose }: { currentTrack: any; tracks: any[]; loading: boolean; onClose: () => void }) {
  const handlePlay = (track: any) => {
    usePlayerStore.getState().playTrack(track);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl border border-white/10 w-[480px] max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Similar Tracks</h3>
            <p className="text-sm text-white/40 mt-0.5">Based on &ldquo;{currentTrack.title}&rdquo;</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white rounded-full hover:bg-white/10"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : tracks.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-12">No similar tracks found</p>
          ) : (
            <div className="space-y-1">
              {tracks.map((track: any, i: number) => (
                <button
                  key={track.id || i}
                  onClick={() => handlePlay(track)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.08] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-white/10">
                    {track.albumCover ? (
                      <img src={track.albumCover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music size={15} className="text-white/30" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/90 truncate">{track.title}</p>
                    <p className="text-xs text-white/40 truncate">{track.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreditsModal({ currentTrack, onClose }: { currentTrack: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl border border-white/10 w-[420px] max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Credits</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white rounded-full hover:bg-white/10"><X size={16} /></button>
        </div>
        <p className="text-white/40 text-sm">{currentTrack.title} &mdash; {currentTrack.artist}</p>
        <div className="mt-6 space-y-4">
          {[{role:'Producers', names:['—']},{role:'Writers', names:['—']},{role:'Mixing Engineers', names:['—']}].map((s) => (
            <div key={s.role}>
              <p className="text-[11px] uppercase tracking-widest text-white/30 mb-1">{s.role}</p>
              <p className="text-sm text-white/70">{s.names.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
