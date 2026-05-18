"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface PlayerBarProps {
  song?: {
    title: string;
    artist: string;
    album: string;
    albumArt?: string;
    duration?: number;
    isExplicit?: boolean;
    isPreview?: boolean;
  };
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onShuffle?: () => void;
  onRepeat?: () => void;
  onQueue?: () => void;
  currentTime?: number;
  onSeek?: (time: number) => void;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
}

const DEFAULT_SONG = {
  title: "Ran To Atlanta",
  artist: "Drake, Future, Molly Santana",
  album: "ICEMAN",
  duration: 247,
  isExplicit: true,
  isPreview: true,
};

export default function PlayerBar({
  song = DEFAULT_SONG,
  isPlaying = false,
  onPlayPause,
  onNext,
  onPrev,
  onShuffle,
  onRepeat,
  onQueue,
  currentTime = 25,
  onSeek,
  volume = 0.8,
  onVolumeChange,
}: PlayerBarProps) {
  const [shuffleActive, setShuffleActive] = useState(false);
  const [repeatMode, setRepeatMode] = useState<0 | 1 | 2>(0);
  const [hoveredSeek, setHoveredSeek] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const [showVolume, setShowVolume] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const volWrapRef = useRef<HTMLDivElement>(null);

  const duration = song.duration ?? 247;
  const progress = Math.min((currentTime / duration) * 100, 100);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      onSeek?.(pct * duration);
    },
    [duration, onSeek]
  );

  const cycleRepeat = () => setRepeatMode((m) => ((m + 1) % 3) as 0 | 1 | 2);

  useEffect(() => {
    if (!showVolume || !volWrapRef.current) return;
    const el = volWrapRef.current;
    const onLeave = () => setShowVolume(false);
    el.addEventListener("mouseleave", onLeave);
    return () => el.removeEventListener("mouseleave", onLeave);
  }, [showVolume]);

  return (
    <>
      <style>{`
        @keyframes scroll-title {
          0%, 20% { transform: translateX(0); }
          80%, 100% { transform: translateX(-100%); }
        }
        .am-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          padding: 0 10px 6px;
          background: transparent;
          pointer-events: none;
        }
        .am-pill {
          pointer-events: all;
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
          height: 54px;
          border-radius: 27px;
          background: rgba(28, 28, 30, 0.06);
          backdrop-filter: blur(32px) saturate(1.8);
          -webkit-backdrop-filter: blur(32px) saturate(1.8);
          border: 0.5px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0 8px;
          gap: 0;
          position: relative;
          box-shadow: 0 4px 24px rgba(0,0,0,0.35);
        }
        .am-track {
          flex: 1;
          height: 12px;
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        .am-track-inner {
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.12);
          border-radius: 2px;
          overflow: hidden;
          transition: height 0.15s ease;
        }
        .am-track.hovering .am-track-inner {
          height: 7px;
          background: rgba(255,255,255,0.2);
        }
        .am-fill {
          height: 100%;
          background: rgba(255,255,255,0.8);
          border-radius: 2px;
          transition: width 0.1s linear;
        }
        .am-track.hovering .am-fill {
          background: #fff;
        }
        .am-left-top.blurred {
          filter: blur(6px);
          opacity: 0.5;
          transition: filter 0.2s ease, opacity 0.2s ease;
        }
        .am-left-area {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          min-width: 0;
          gap: 2px;
        }
        .am-left-top {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }
        .am-art {
          width: 28px;
          height: 28px;
          border-radius: 5px;
          background: linear-gradient(135deg, #3a3a3c 0%, #2c2c2e 100%);
          flex-shrink: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .am-art img { width: 100%; height: 100%; object-fit: cover; }
        .am-art-placeholder { color: rgba(255,255,255,0.2); font-size: 14px; }
        .am-meta { min-width: 0; display: flex; flex-direction: column; gap: 0; overflow: hidden; }
        .am-title-row {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow: hidden;
          white-space: nowrap;
        }
        .am-title-wrap {
          overflow: hidden;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }
        .am-title {
          display: inline-block;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          font-size: 11.5px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
          letter-spacing: -0.01em;
          white-space: nowrap;
          padding-right: 20px;
        }
        .am-title-wrap:hover .am-title {
          animation: scroll-title 6s ease-in-out infinite;
        }
        .am-explicit {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          font-size: 7.5px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 2px;
          padding: 0 3px;
          flex-shrink: 0;
          line-height: 1.2;
        }
        .am-artist {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.45);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }
        .am-progress-row { display: flex; align-items: center; gap: 0; }
        .am-controls {
          display: flex;
          align-items: center;
          gap: 1px;
          flex-shrink: 0;
          margin-right: 8px;
        }
        .am-btn-transport {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.85);
          transition: color 0.12s ease, transform 0.1s ease;
          border-radius: 50%;
          width: 46px;
          height: 46px;
        }
        .am-btn-transport:hover { color: #fff; transform: scale(1.1); }
        .am-btn-transport:active { transform: scale(0.92); }
        .am-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.75);
          transition: color 0.12s ease, transform 0.1s ease;
          border-radius: 50%;
          width: 28px;
          height: 28px;
        }
        .am-btn:hover { color: #fff; transform: scale(1.08); }
        .am-btn:active { transform: scale(0.94); }
        .am-btn.active { color: #fff; }
        .am-btn.dim { color: rgba(255,255,255,0.35); }
        .am-play-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.95);
          transition: color 0.12s ease, transform 0.1s ease;
          width: 46px;
          height: 46px;
        }
        .am-play-btn:hover { color: #fff; transform: scale(1.1); }
        .am-play-btn:active { transform: scale(0.92); }
        .am-right {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
          margin-left: 6px;
        }
        .am-volume-pill {
          display: flex;
          align-items: center;
          height: 46px;
          border-radius: 23px;
          overflow: hidden;
          transition: background 0.25s ease, box-shadow 0.25s ease;
        }
        .am-volume-pill.open {
          background: rgba(30, 30, 35, 0.85);
          box-shadow: 0 2px 10px rgba(0,0,0,0.35);
        }
        .am-volume-slider-area {
          width: 0;
          overflow: hidden;
          transition: width 0.25s ease, padding 0.25s ease;
          display: flex;
          align-items: center;
          height: 100%;
          box-sizing: border-box;
        }
        .am-volume-slider-area.open {
          width: 130px;
          padding: 0 6px 0 16px;
        }
        .am-volume-slider {
          width: 100%;
          height: 4px;
          accent-color: rgba(255,255,255,0.8);
          cursor: pointer;
          border-radius: 2px;
          opacity: 0.9;
        }
        .am-btn-vol {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.8);
          transition: color 0.12s ease;
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          border-radius: 50%;
        }
        .am-btn-vol:hover { color: #fff; }
        @keyframes am-pop-in {
          from { opacity: 0; transform: scale(0.97) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .am-bar { animation: am-pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      <div className="am-bar">
        <div className="am-pill">
          {/* LEFT: transport controls */}
          <div className="am-controls">
            <button
              className={`am-btn ${shuffleActive ? "active" : "dim"}`}
              onClick={() => { setShuffleActive(v => !v); onShuffle?.(); }}
              title="Shuffle"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"/>
                <line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/>
                <line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
            </button>
            <button className="am-btn-transport" onClick={onPrev} title="Previous">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 17.5 11.5 12 18 6.5V17.5z"/>
                <path d="M12 17.5 5.5 12 12 6.5V17.5z"/>
              </svg>
            </button>
            <button className="am-play-btn" onClick={onPlayPause} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            <button className="am-btn-transport" onClick={onNext} title="Next">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6.5 12.5 12 6 17.5V6.5z"/>
                <path d="M12 6.5 18.5 12 12 17.5V6.5z"/>
              </svg>
            </button>
            <button
              className={`am-btn ${repeatMode > 0 ? "active" : "dim"}`}
              onClick={cycleRepeat}
              title={repeatMode === 0 ? "Repeat off" : repeatMode === 1 ? "Repeat all" : "Repeat one"}
            >
              {repeatMode === 2 ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <polyline points="7 23 3 19 7 15"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  <text x="10" y="14" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">1</text>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <polyline points="7 23 3 19 7 15"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
              )}
            </button>
          </div>

          {/* CENTER: album info + progress below */}
          <div className="am-left-area">
            <div className={`am-left-top ${hoveredSeek ? "blurred" : ""}`}>
              <div className="am-art">
                {song.albumArt ? (
                  <img src={song.albumArt} alt={song.album} />
                ) : (
                  <span className="am-art-placeholder">♪</span>
                )}
              </div>
              <div className="am-meta">
                <div className="am-title-row">
                  <div className="am-title-wrap">
                    <span className="am-title">{song.title}</span>
                  </div>
                  {song.isExplicit && <span className="am-explicit">E</span>}
                </div>
                <span className="am-artist">
                  {song.artist}
                  {song.album && (
                    <span style={{ color: "rgba(255,255,255,0.28)" }}>
                      {" "}— {song.album}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="am-progress-row">
              <div
                className={`am-track ${hoveredSeek ? "hovering" : ""}`}
                ref={progressRef}
                onClick={handleProgressClick}
                onMouseEnter={() => setHoveredSeek(true)}
                onMouseLeave={() => setHoveredSeek(false)}
              >
                <div className="am-track-inner">
                  <div className="am-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: utility */}
          <div className="am-right">
            <button className="am-btn" title="Download">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button className="am-btn" onClick={onQueue} title="Queue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </button>
            <div className={`am-volume-pill ${showVolume ? "open" : ""}`} ref={volWrapRef}>
              <div className={`am-volume-slider-area ${showVolume ? "open" : ""}`}>
                <input
                  className="am-volume-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={localVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setLocalVolume(v);
                    onVolumeChange?.(v);
                  }}
                />
              </div>
              <button className="am-btn-vol" onClick={() => setShowVolume(v => !v)} title="Volume">
                {localVolume === 0 ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : localVolume < 0.5 ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
