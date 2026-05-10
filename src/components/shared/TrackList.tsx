'use client';

import { useState } from 'react';
import { Track } from '@/types/music';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { getQualityBadge } from '@/lib/audio-quality';
import { MoreHorizontal, Play, Pause, Heart } from 'lucide-react';
import { AppleMusicPlayIcon } from '@/components/icons/AppleMusicPlayIcon';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
  index?: number;
  tracks?: Track[];
}

export function TrackContextMenu({
  track,
  children,
  index,
  tracks,
}: TrackContextMenuProps) {
  const { play, addToQueue, currentTrack, isPlaying, togglePlayPause } = usePlayerStore();
  const { toggleFavourite, isFavourite, playlists, addToPlaylist, addRecentlyPlayed } = useLibraryStore();
  const { playerTheme } = useUIStore();
  const isFav = isFavourite(track.id);
  const isThisTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isThisTrack) {
      togglePlayPause();
    } else if (tracks) {
      play(track, tracks, index ?? tracks.findIndex(t => t.id === track.id));
    } else {
      play(track);
    }
    addRecentlyPlayed(track);
  };

  const handleAddToQueue = () => {
    addToQueue(track);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-popover border-border">
        <ContextMenuItem
          onClick={handlePlay}
          className="text-foreground focus:bg-accent focus:text-foreground"
        >
          {isThisTrack && isPlaying ? 'Pause' : 'Play'}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleAddToQueue}
          className="text-foreground focus:bg-accent focus:text-foreground"
        >
          Add to Queue
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-foreground focus:bg-accent focus:text-foreground">
            Add to Playlist
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="bg-popover border-border max-h-64 overflow-y-auto custom-scrollbar">
            {playlists.map((pl) => (
              <ContextMenuItem
                key={pl.id}
                onClick={() => addToPlaylist(pl.id, track)}
                className="text-foreground focus:bg-accent focus:text-foreground"
              >
                {pl.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => toggleFavourite(track)}
          className="text-foreground focus:bg-accent focus:text-foreground"
        >
          {isFav ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
        </ContextMenuItem>
        {track.artistId && (
          <ContextMenuItem className="text-foreground focus:bg-accent focus:text-foreground">
            Go to Artist
          </ContextMenuItem>
        )}
        {track.albumId && (
          <ContextMenuItem className="text-foreground focus:bg-accent focus:text-foreground">
            Go to Album
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => {
            console.log('Downloading track:', track.title);
            const link = document.createElement('a');
            link.href = track.streamURL || '#';
            link.download = `${track.title} - ${track.artist}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="text-foreground focus:bg-accent focus:text-foreground"
        >
          Download Track
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function TagBadge({ quality, explicit }: { quality?: string; explicit?: boolean }) {
  const badge = getQualityBadge(quality);
  if (!badge && !explicit) return null;
  
  return (
    <div className="flex gap-1 items-center">
      {explicit && (
        <span className="text-[8px] font-bold px-1 rounded-[2px] bg-white/20 text-white/70 leading-tight">E</span>
      )}
      {badge && (
        <span className={cn(
          "text-[8px] font-black px-1 rounded-[2px] leading-tight flex items-center justify-center h-3.5",
          badge.label === 'ATMOS' ? "text-white/80" : "bg-white/10 text-white/70"
        )}>
          {badge.label === 'ATMOS' ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            </svg>
          ) : badge.label}
        </span>
      )}
    </div>
  );
}

interface TrackListProps {
  tracks: Track[];
  showAlbumArt?: boolean;
  showIndex?: boolean;
  compact?: boolean;
  onPlayTrack?: (track: Track, index: number) => void;
}

export default function TrackList({
  tracks,
  showAlbumArt = true,
  showIndex = true,
  compact = false,
  onPlayTrack,
}: TrackListProps) {
  const { play, currentTrack, isPlaying, togglePlayPause } = usePlayerStore();
  const { addRecentlyPlayed, isFavourite, toggleFavourite } = useLibraryStore();
  const { playerTheme } = useUIStore();

  const handlePlay = (track: Track, index: number) => {
    if (onPlayTrack) {
      onPlayTrack(track, index);
    } else {
      play(track, tracks, index);
    }
    addRecentlyPlayed(track);
  };

  return (
    <div className="w-full">
      {/* Header row */}
      {!compact && (
        <div className="grid grid-cols-[16px_4fr_3fr_minmax(80px,1fr)] md:grid-cols-[16px_4fr_3fr_minmax(120px,1fr)_50px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30 mb-2">
          <span className="text-center">#</span>
          <span>Title</span>
          <span className="hidden sm:block">Album</span>
          <span className="text-right flex items-center justify-end">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="4" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="12" r="1.5" />
            </svg>
          </span>
          <span className="hidden md:block"></span>
        </div>
      )}

      {/* Track rows */}
      {tracks.map((track, index) => {
        const isThisTrack = currentTrack?.id === track.id;
        const isCurrentlyPlaying = isThisTrack && isPlaying;
        const fav = isFavourite(track.id);

        return (
          <TrackContextMenu key={track.id} track={track} index={index} tracks={tracks}>
            <div
              className={cn(
                'group grid grid-cols-[16px_4fr_3fr_minmax(80px,1fr)] md:grid-cols-[16px_4fr_3fr_minmax(120px,1fr)_50px] gap-4 px-4 py-2 rounded-md',
                'hover:bg-accent cursor-pointer transition-colors duration-150',
                isThisTrack && 'bg-accent/50'
              )}
              onDoubleClick={() => handlePlay(track, index)}
              onClick={() => {
                handlePlay(track, index);
              }}
            >
              {/* Index / Play button / Equalizer */}
              <div className="flex items-center justify-center">
                {isCurrentlyPlaying ? (
                  <div className={cn(
                    "flex items-end gap-0.5 h-4",
                    playerTheme === 'spotify' && "text-spotify-green",
                    playerTheme === 'tidal' && "text-cyan-400",
                    playerTheme === 'apple' && "text-apple-red"
                  )}>
                    <div className={cn("w-0.5 rounded-full equalizer-bar-1", 
                      playerTheme === 'spotify' ? "bg-spotify-green" : 
                      playerTheme === 'tidal' ? "bg-cyan-400" : "bg-apple-red")} style={{ height: 4 }} />
                    <div className={cn("w-0.5 rounded-full equalizer-bar-2", 
                      playerTheme === 'spotify' ? "bg-spotify-green" : 
                      playerTheme === 'tidal' ? "bg-cyan-400" : "bg-apple-red")} style={{ height: 8 }} />
                    <div className={cn("w-0.5 rounded-full equalizer-bar-3", 
                      playerTheme === 'spotify' ? "bg-spotify-green" : 
                      playerTheme === 'tidal' ? "bg-cyan-400" : "bg-apple-red")} style={{ height: 6 }} />
                  </div>
                ) : (
                  <>
                    <span className="group-hover:hidden text-sm text-muted-foreground">
                      {showIndex ? index + 1 : ''}
                    </span>
                    <button
                      className="hidden group-hover:flex text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(track, index);
                      }}
                    >
                      {isThisTrack ? (
                        <Pause size={14} fill="currentColor" />
                      ) : playerTheme === 'apple' ? (
                        <AppleMusicPlayIcon size={14} className="translate-x-px" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Title + Artist */}
              <div className="flex items-center gap-3 min-w-0">
                {showAlbumArt && track.albumCover && (
                  <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-accent">
                    <img
                      src={track.albumCover}
                      alt={track.album}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      isThisTrack && playerTheme === 'spotify' && 'text-spotify-green',
                      isThisTrack && playerTheme === 'tidal' && 'text-cyan-400',
                      isThisTrack && playerTheme === 'apple' && 'text-apple-red',
                      !isThisTrack && 'text-foreground'
                    )}>
                      {track.title}
                    </p>
                    <TagBadge quality={track.quality} explicit={track.explicit} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Album */}
              <div className="hidden sm:flex items-center min-w-0">
                <span className="text-sm text-muted-foreground truncate">
                  {track.album}
                </span>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-end gap-2">
                <button
                  className={cn(
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    fav && playerTheme === 'spotify' && 'text-spotify-green',
                    fav && playerTheme === 'tidal' && 'text-cyan-400',
                    fav && playerTheme === 'apple' && 'text-apple-red',
                    !fav && 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavourite(track);
                  }}
                >
                  <Heart size={14} fill={fav ? 'currentColor' : 'none'} />
                </button>
                <span className="text-sm text-muted-foreground">
                  {track.duration ? formatDuration(track.duration) : '--:--'}
                </span>
              </div>

              {/* More button (hidden on mobile) */}
              <div className="hidden md:flex items-center justify-end">
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          </TrackContextMenu>
        );
      })}

      {tracks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No tracks found</p>
        </div>
      )}
    </div>
  );
}
