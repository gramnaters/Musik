'use client';

import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LyricLine {
  time: number;
  text: string;
}

export default function LyricsView() {
  const { currentTrack, currentTime } = usePlayerStore();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      return;
    }
    
    setIsLoading(true);
    const fetchLyrics = async () => {
      try {
        const url = new URL('/api/lyrics', window.location.origin);
        url.searchParams.append('track', currentTrack.title);
        url.searchParams.append('artist', currentTrack.artist);
        if (currentTrack.album) url.searchParams.append('album', currentTrack.album);
        if (currentTrack.duration) url.searchParams.append('duration', currentTrack.duration.toString());

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Lyrics not found');
        const data = await res.json();

        if (data.syncedLyrics) {
          const lines: LyricLine[] = [];
          const lrcLines = data.syncedLyrics.split('\n');
          for (const line of lrcLines) {
            const match = line.match(/\[(\d+):(\d+\.?\d*)\](.*)/);
            if (match) {
              const minutes = parseInt(match[1]);
              const seconds = parseFloat(match[2]);
              const text = match[3].trim();
              if (text) {
                lines.push({ time: minutes * 60 + seconds, text });
              }
            }
          }
          setLyrics(lines);
        } else if (data.plainLyrics) {
          const lines: LyricLine[] = data.plainLyrics.split('\n')
            .filter((l: string) => l.trim())
            .map((l: string, i: number) => ({ time: i * 5, text: l.trim() }));
          setLyrics(lines);
        } else {
          setLyrics([]);
        }
      } catch (err) {
        console.error('Lyrics error:', err);
        setLyrics([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [currentTrack?.id]);

  useEffect(() => {
    if (activeLineRef.current && scrollRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  const activeIndex = lyrics.reduce((acc, line, idx) => {
    if (currentTime >= line.time) return idx;
    return acc;
  }, -1);

  return (
    <div className="flex flex-col h-full w-full">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-12 scrollbar-none mask-fade-y"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : lyrics.length > 0 ? (
          <div className="space-y-8 max-w-2xl mx-auto">
            {lyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;
              
              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  className={cn(
                    "text-[28px] md:text-[42px] font-bold transition-all duration-500 ease-out leading-tight cursor-pointer",
                    isActive 
                      ? "text-white scale-100 opacity-100 blur-0" 
                      : isPast 
                        ? "text-white/30 scale-95 opacity-50 blur-[1px]" 
                        : "text-white/20 scale-90 opacity-30 blur-[2px] hover:text-white/40"
                  )}
                  onClick={() => {
                    usePlayerStore.getState().seek(line.time);
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-center px-10">
            <p className="text-xl font-medium">No lyrics available for this track</p>
            <p className="text-sm mt-2 opacity-60">We're working on expanding our library</p>
          </div>
        )}
      </div>
    </div>
  );
}
