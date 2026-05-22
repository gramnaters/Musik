'use client';

import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, ListMusic, ChevronDown, MoreHorizontal, Sparkles,
  Maximize2, Music, Users, FileText,
  X, Plus, Copy, Share2, ExternalLink, ChevronRight,
  Download, PenLine, Radio,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { parseLrc, LrcLine } from '@/lib/lrc-parser';

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
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showPlaylistSub, setShowPlaylistSub] = useState(false);
  const [showShareSub, setShowShareSub] = useState(false);
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsOffset, setLyricsOffset] = useState(0);
  const [activeLyricIdx, setActiveLyricIdx] = useState(-1);
  const [color1, setColor1] = useState('#1A3A5C');
  const [color2, setColor2] = useState('#0A1F35');

  const albumRef = useRef<HTMLDivElement>(null);
  const albumInnerRef = useRef<HTMLDivElement>(null);
  const albumGlowRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    setColor1(palette[0]);
    setColor2(palette[1]);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!showLyrics || !currentTrack) return;
    setLyricsLoading(true);
    const params = new URLSearchParams({ track: currentTrack.title, artist: currentTrack.artist });
    if (currentTrack.album) params.set('album', currentTrack.album);
    if (currentTrack.duration) params.set('duration', String(currentTrack.duration));
    fetch(`/api/lyrics?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.syncedLyrics) setLyrics(parseLrc(data.syncedLyrics));
        else setLyrics([]);
      })
      .catch(() => setLyrics([]))
      .finally(() => setLyricsLoading(false));
  }, [showLyrics, currentTrack?.id]);

  useEffect(() => {
    if (!lyrics.length) { setActiveLyricIdx(-1); return; }
    const adjTime = currentTime + lyricsOffset;
    let idx = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (adjTime >= lyrics[i].time) { idx = i; break; }
    }
    setActiveLyricIdx(idx);
  }, [currentTime, lyricsOffset, lyrics]);

  useEffect(() => {
    if (activeLyricIdx < 0 || !lyricsContainerRef.current) return;
    const el = lyricRefs.current[activeLyricIdx];
    if (!el) return;
    const container = lyricsContainerRef.current;
    const targetTop = el.offsetTop - container.clientHeight * 0.35;
    container.scrollTo({ top: targetTop, behavior: 'smooth' });
  }, [activeLyricIdx]);

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
        if (showLyrics) setShowLyrics(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showLyrics]);

  lyricRefs.current = [];

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

  const seekToLyric = (time: number) => {
    usePlayerStore.getState().seekTo(time);
  };

  const artistName = currentTrack?.artist || '';
  const artistAvatarUrl = currentTrack?.albumCover || '';

  const topPills = [
    { label: 'Similar tracks', fn: () => toast({ title: 'Similar tracks' }) },
    { label: 'Credits', fn: () => setShowCredits(true) },
    { label: 'Lyrics', fn: () => setShowLyrics((v) => !v) },
  ];

  const renderAlbumArt = () => (
    <div
      ref={albumRef}
      onMouseMove={handleAlbumMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleAlbumLeave}
      className="relative cursor-pointer"
      style={{ perspective: '1500px', transformStyle: 'preserve-3d' }}
    >
      <div
        ref={albumInnerRef}
        className="w-[580px] h-[590px] min-w-[580px] min-h-[590px] max-[1200px]:w-[420px] max-[1200px]:h-[430px] max-[1200px]:min-w-[420px] max-[1200px]:min-h-[430px] overflow-hidden"
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
                <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: '45% 55%' }}>
                  {/* Left: album section */}
                  <div className="flex flex-col items-center justify-center p-10">
                    {renderAlbumArt()}
                  </div>

                  {/* Right: lyrics panel - monochrome style */}
                  <aside className="flex items-stretch justify-start overflow-hidden min-w-0" style={{ opacity: 1, transform: 'translateX(0)' }}>
                    <div style={{ width: 'min(860px, 100%)', minHeight: 0 }}>
                      <div
                        ref={lyricsContainerRef}
                        style={{
                          height: '100%',
                          position: 'relative',
                          paddingLeft: 'clamp(0.5rem, 1.6vw, 1.5rem)',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                        }}
                        className="lyrics-scroll"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6" style={{ paddingRight: 'clamp(1rem, 2vw, 2rem)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Lyrics</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setLyricsOffset((o) => Math.max(-10, o - 0.1))} className="h-6 w-6 flex items-center justify-center text-sm text-white/50 hover:text-white rounded hover:bg-white/10">&minus;</button>
                            <span style={{ fontSize: '11px', fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.5)', width: '48px', textAlign: 'center', fontWeight: 500 }}>
                              {lyricsOffset >= 0 ? '+' : ''}{lyricsOffset.toFixed(1)}s
                            </span>
                            <button onClick={() => setLyricsOffset((o) => Math.min(10, o + 0.1))} className="h-6 w-6 flex items-center justify-center text-sm text-white/50 hover:text-white rounded hover:bg-white/10">+</button>
                            {lyricsOffset !== 0 && (
                              <button onClick={() => setLyricsOffset(0)} className="h-6 px-2 text-[10px] text-white/40 hover:text-white rounded hover:bg-white/10">↺</button>
                            )}
                            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                            <button onClick={() => setShowLyrics(false)} className="h-6 w-6 flex items-center justify-center text-white/40 hover:text-white rounded hover:bg-white/10"><X size={13} /></button>
                          </div>
                        </div>

                        {/* Lyric lines */}
                        {lyricsLoading ? (
                          <div className="flex items-center justify-center h-40">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        ) : lyrics.length === 0 ? (
                          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>No synced lyrics available</p>
                        ) : (
                          <div className="lyrics-list">
                            {lyrics.map((line, i) => (
                              <p
                                key={i}
                                ref={(el) => { lyricRefs.current[i] = el; }}
                                onClick={() => seekToLyric(line.time)}
                                style={{
                                  fontSize: i === activeLyricIdx ? '32px' : '26px',
                                  fontWeight: i === activeLyricIdx ? 700 : 500,
                                  lineHeight: 1.5,
                                  marginBottom: '18px',
                                  color: i === activeLyricIdx ? '#ffffff' : 'rgba(255,255,255,0.28)',
                                  filter: i === activeLyricIdx ? 'none' : 'blur(0.6px)',
                                  cursor: 'pointer',
                                  transition: 'all 0.35s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (i !== activeLyricIdx) e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                }}
                                onMouseLeave={(e) => {
                                  if (i !== activeLyricIdx) e.currentTarget.style.color = 'rgba(255,255,255,0.28)';
                                }}
                              >
                                {line.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center min-h-0">
                  {renderAlbumArt()}
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
