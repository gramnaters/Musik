'use client';

import { useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

const seekStyles = `
  .tidal-seek-wrapper {
    position: relative;
    width: 100%;
    height: 20px;
    display: flex;
    align-items: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  .tidal-seek-wrapper:focus-visible {
    outline: 2px solid rgba(255,255,255,0.3);
    outline-offset: 3px;
    border-radius: 4px;
  }
  .tidal-seek-track {
    position: relative;
    width: 100%;
    height: 3px !important;
    background: rgba(255,255,255,0.15);
    border-radius: 999px;
    transition: none !important;
    pointer-events: none;
  }
  .tidal-seek-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: #ffffff;
    border-radius: 999px;
    pointer-events: none;
    transition: width 0.08s linear;
  }
  .tidal-seek-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 11px;
    height: 11px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .tidal-seek-wrapper:hover .tidal-seek-thumb,
  .tidal-seek-wrapper.dragging .tidal-seek-thumb {
    opacity: 1;
  }
  .seek-container:hover .seek-timestamp {
    color: #ffffff !important;
  }
`;

export function PlaybackSeekSlider() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seekTo = usePlayerStore((s) => s.seekTo);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const max = duration > 0 ? duration : 100;
  const progress = max > 0 ? (currentTime / max) * 100 : 0;

  function getSeekPosition(clientX: number) {
    const rect = wrapperRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * max;
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;
    setDragging(true);
    seekTo(getSeekPosition(e.clientX));

    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        seekTo(getSeekPosition(e.clientX));
      });
    }

    function onMouseUp(e: MouseEvent) {
      isDragging.current = false;
      setDragging(false);
      seekTo(getSeekPosition(e.clientX));
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 0) return;
    isDragging.current = true;
    setDragging(true);
    seekTo(getSeekPosition(e.touches[0].clientX));
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current || e.touches.length === 0) return;
    e.preventDefault();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      seekTo(getSeekPosition(e.touches[0].clientX));
    });
  }

  function handleTouchEnd() {
    isDragging.current = false;
    setDragging(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }

  return (
    <>
      <style>{seekStyles}</style>
      <div
        ref={wrapperRef}
        className={`tidal-seek-wrapper${dragging ? ' dragging' : ''}`}
        onMouseDown={currentTrack ? handleMouseDown : undefined}
        onTouchStart={currentTrack ? handleTouchStart : undefined}
        onTouchMove={currentTrack ? handleTouchMove : undefined}
        onTouchEnd={currentTrack ? handleTouchEnd : undefined}
        tabIndex={0}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(currentTime)}
      >
        <div className="tidal-seek-track">
          <div className="tidal-seek-fill" style={{ width: `${progress}%` }} />
          <div className="tidal-seek-thumb" style={{ left: `${progress}%` }} />
        </div>
      </div>
    </>
  );
}
