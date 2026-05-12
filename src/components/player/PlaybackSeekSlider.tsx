'use client';

import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '@/stores/playerStore';
import { cn } from '@/lib/utils';

type PlaybackSeekSliderProps = {
  className?: string;
  sliderClassName?: string;
};

/**
 * Seek bar that stays smooth while audio time updates from requestAnimationFrame:
 * while dragging, the thumb follows local values instead of fighting the store.
 */
export function PlaybackSeekSlider({ className, sliderClassName }: PlaybackSeekSliderProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seekTo = usePlayerStore((s) => s.seekTo);

  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<number | null>(null);

  const max = duration > 0 ? duration : 100;
  const clampedStore = Math.min(Math.max(0, currentTime), max);
  const display =
    dragging && pending !== null ? Math.min(Math.max(0, pending), max) : clampedStore;

  useEffect(() => {
    if (!dragging) setPending(null);
  }, [currentTime, dragging, max]);

  return (
    <div className={cn('w-full min-w-0', className)}>
      <Slider
        className={cn('w-full cursor-pointer touch-pan-y', sliderClassName)}
        value={[display]}
        min={0}
        max={max}
        step={0.05}
        disabled={!currentTrack}
        onPointerDown={() => setDragging(true)}
        onValueChange={(v) => {
          const next = v[0] ?? 0;
          setPending(next);
        }}
        onValueCommit={(v) => {
          const next = v[0] ?? 0;
          seekTo(next);
          setDragging(false);
          setPending(null);
        }}
      />
    </div>
  );
}
