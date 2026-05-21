'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

const OFFSET_STORAGE_PREFIX = 'lyrics-offset-';

function getOffsetKey(trackId: string) {
  return `${OFFSET_STORAGE_PREFIX}${trackId}`;
}

export default function LyricsView() {
  const { currentTrack, currentTime, seek } = usePlayerStore();
  const [mounted, setMounted] = useState(false);
  const [offset, setOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/@uimaxbai/am-lyrics@1.5.3/dist/src/am-lyrics.min.js';
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, [mounted]);

  useEffect(() => {
    if (currentTrack?.id) {
      const saved = localStorage.getItem(getOffsetKey(currentTrack.id));
      setOffset(saved ? Number(saved) : 0);
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!containerRef.current || !currentTrack || !mounted) return;
    const el = document.createElement('am-lyrics');
    el.setAttribute('song-title', currentTrack.title);
    el.setAttribute('song-artist', currentTrack.artist);
    el.setAttribute('song-album', currentTrack.album ?? '');
    el.setAttribute('song-duration', String((currentTrack.duration ?? 0) * 1000));
    el.setAttribute('query', `${currentTrack.title} ${currentTrack.artist}`);
    el.setAttribute('highlight-color', '#ffffff');
    el.setAttribute('autoscroll', '');
    el.setAttribute('interpolate', '');
    el.style.width = '100%';
    el.style.height = '100%';
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ timestamp: number }>;
      if (ce.detail?.timestamp != null) seek(ce.detail.timestamp / 1000);
    };
    el.addEventListener('line-click', handler);
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);
    lyricsRef.current = el;
    return () => {
      el.removeEventListener('line-click', handler);
    };
  }, [currentTrack?.id, mounted]);

  useEffect(() => {
    if (!lyricsRef.current || !mounted) return;
    lyricsRef.current.currentTime = Math.max(0, currentTime * 1000 + offset);
  }, [currentTime, offset, mounted]);

  if (!currentTrack || !mounted) return null;

  const adjustOffset = (delta: number) => {
    if (!currentTrack) return;
    const newOffset = offset + delta;
    setOffset(newOffset);
    localStorage.setItem(getOffsetKey(currentTrack.id), String(newOffset));
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div ref={containerRef} className="flex-1 overflow-hidden" />
      <div className="flex items-center justify-center gap-3 py-3 px-4 border-t border-white/10">
        <button
          onClick={() => adjustOffset(-500)}
          className="h-7 px-2 rounded text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          -0.5s
        </button>
        <span className="text-[11px] font-medium tabular-nums text-white/30">
          offset {offset > 0 ? '+' : ''}{(offset / 1000).toFixed(1)}s
        </span>
        <button
          onClick={() => adjustOffset(500)}
          className="h-7 px-2 rounded text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          +0.5s
        </button>
        {offset !== 0 && (
          <button
            onClick={() => adjustOffset(-offset)}
            className="h-7 px-2 rounded text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            reset
          </button>
        )}
      </div>
    </div>
  );
}
