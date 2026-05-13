'use client';

import { Track } from '@/types/music';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { getQualityBadgeForTrack, getQualityTooltip } from '@/lib/audio-quality';
import { downloadCurrentTrack } from '@/lib/download-track';
import { MoreHorizontal, Play, Pause, Heart, Plus, Volume2, CircleArrowUp } from 'lucide-react';
import { AppleMusicPlayIcon } from '@/components/icons/AppleMusicPlayIcon';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const isFav = isFavourite(track.id);
  const isThisTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isThisTrack) {
      togglePlayPause();
    } else if (tracks) {
      play(track, tracks, index ?? tracks.findIndex((t) => t.id === track.id));
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
          Add to queue
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-foreground focus:bg-accent focus:text-foreground">
            Add to playlist
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
          onClick={() => void downloadCurrentTrack(track)}
          className="text-foreground focus:bg-accent focus:text-foreground"
        >
          Download
        </ContextMenuItem>
        {track.streamURL && (
          <ContextMenuItem
            onClick={() => {
              void navigator.clipboard?.writeText(track.streamURL || '');
            }}
            className="text-foreground focus:bg-accent focus:text-foreground"
          >
            Copy stream link
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function TagBadge({ track }: { track: Pick<Track, 'quality' | 'format' | 'streamURL' | 'explicit'> }) {
  const badge = getQualityBadgeForTrack(track);
  const qTip = getQualityTooltip(track);

  if (!badge && !track.explicit) return null;

  const explicitEl = track.explicit ? (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="text-[8px] font-bold px-1 rounded-[2px] bg-white/20 text-white/90 leading-tight h-3.5 inline-flex items-center cursor-default">
          E
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs border border-white/20 bg-neutral-950 text-white text-xs px-2 py-1.5 shadow-lg"
      >
        Explicit content
      </TooltipContent>
    </Tooltip>
  ) : null;

  const qualityEl = badge ? (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'text-[8px] font-black px-1 rounded-[2px] leading-tight flex items-center justify-center h-3.5 cursor-default',
            badge.label === 'ATMOS' ? 'text-white/80' : 'bg-white/10 text-white/70'
          )}
        >
          {badge.label === 'ATMOS' ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
            </svg>
          ) : (
            badge.label
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs border border-white/20 bg-neutral-950 text-white text-xs px-2 py-1.5 shadow-lg"
      >
        {qTip}
      </TooltipContent>
    </Tooltip>
  ) : null;

  return (
    <div className="flex gap-1 items-center">
      {explicitEl}
      {qualityEl}
    </div>
  );
}

function TrackRowMenu({
  track,
  index,
  tracks,
  alwaysShowTrigger,
}: {
  track: Track;
  index: number;
  tracks: Track[];
  alwaysShowTrigger?: boolean;
}) {
  const { play, addToQueue, currentTrack, isPlaying, togglePlayPause } = usePlayerStore();
  const { toggleFavourite, isFavourite, playlists, addToPlaylist, addRecentlyPlayed } = useLibraryStore();
  const isFav = isFavourite(track.id);
  const isThisTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isThisTrack) {
      togglePlayPause();
    } else {
      play(track, tracks, index);
    }
    addRecentlyPlayed(track);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100',
            alwaysShowTrigger && 'opacity-100'
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Track options"
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={handlePlay}>
          {isThisTrack && isPlaying ? 'Pause' : 'Play'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => addToQueue(track)}>Add to queue</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Add to playlist</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-64 overflow-y-auto custom-scrollbar">
            {playlists.map((pl) => (
              <DropdownMenuItem key={pl.id} onClick={() => addToPlaylist(pl.id, track)}>
                {pl.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toggleFavourite(track)}>
          {isFav ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void downloadCurrentTrack(track)}>Download</DropdownMenuItem>
        {track.streamURL && (
          <DropdownMenuItem onClick={() => void navigator.clipboard?.writeText(track.streamURL || '')}>
            Copy stream link
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
    <TooltipProvider delayDuration={200}>
      <div className="w-full">
        {!compact && (
          <div className="grid grid-cols-[16px_4fr_3fr_minmax(80px,1fr)] md:grid-cols-[16px_4fr_3fr_minmax(120px,1fr)_44px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30 mb-2">
            <span className="text-center">#</span>
            <span>Title</span>
            <span className="hidden sm:block">Album</span>
            <span className="text-right">Time</span>
            <span className="hidden md:block" aria-hidden />
          </div>
        )}

        {tracks.map((track, index) => {
          const isThisTrack = currentTrack?.id === track.id;
          const isCurrentlyPlaying = isThisTrack && isPlaying;
          const tidalPlaying = playerTheme === 'tidal' && isCurrentlyPlaying;
          const applePlaying = playerTheme === 'apple' && isCurrentlyPlaying;
          const spotifyPlaying = playerTheme === 'spotify' && isCurrentlyPlaying;
          const fav = isFavourite(track.id);

          return (
            <TrackContextMenu key={track.id} track={track} index={index} tracks={tracks}>
              <div
                className={cn(
                  'group grid grid-cols-[16px_4fr_3fr_minmax(80px,1fr)] md:grid-cols-[16px_4fr_3fr_minmax(120px,1fr)_44px] gap-4 px-4 py-2 rounded-md',
                  'cursor-pointer transition-colors duration-150',
                  !spotifyPlaying && 'hover:bg-accent',
                  !spotifyPlaying && isThisTrack && 'bg-accent/50',
                  spotifyPlaying && 'hover:bg-[#2a2a2a]',
                  tidalPlaying && 'bg-[#1a1a1a] hover:bg-[#222] border border-white/[0.06]',
                  applePlaying && 'bg-accent/45 hover:bg-accent/60'
                )}
                onDoubleClick={() => handlePlay(track, index)}
                onClick={() => handlePlay(track, index)}
              >
                <div className="flex items-center justify-center">
                  {applePlaying ? (
                    <span className="text-sm tabular-nums text-muted-foreground">{showIndex ? index + 1 : ''}</span>
                  ) : tidalPlaying ? (
                    <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden />
                  ) : spotifyPlaying ? (
                    <span className="text-sm tabular-nums text-muted-foreground">{showIndex ? index + 1 : ''}</span>
                  ) : isCurrentlyPlaying ? (
                    <div
                      className={cn(
                        'flex items-end gap-0.5 h-4',
                        playerTheme === 'spotify' && 'text-spotify-green',
                        playerTheme === 'tidal' && 'text-cyan-400',
                        playerTheme === 'apple' && 'text-apple-red'
                      )}
                    >
                      <div
                        className={cn(
                          'w-0.5 rounded-full equalizer-bar-1',
                          playerTheme === 'spotify'
                            ? 'bg-spotify-green'
                            : playerTheme === 'tidal'
                              ? 'bg-cyan-400'
                              : 'bg-apple-red'
                        )}
                        style={{ height: 4 }}
                      />
                      <div
                        className={cn(
                          'w-0.5 rounded-full equalizer-bar-2',
                          playerTheme === 'spotify'
                            ? 'bg-spotify-green'
                            : playerTheme === 'tidal'
                              ? 'bg-cyan-400'
                              : 'bg-apple-red'
                        )}
                        style={{ height: 8 }}
                      />
                      <div
                        className={cn(
                          'w-0.5 rounded-full equalizer-bar-3',
                          playerTheme === 'spotify'
                            ? 'bg-spotify-green'
                            : playerTheme === 'tidal'
                              ? 'bg-cyan-400'
                              : 'bg-apple-red'
                        )}
                        style={{ height: 6 }}
                      />
                    </div>
                  ) : (
                    <>
                      <span className="group-hover:hidden text-sm text-muted-foreground">
                        {showIndex ? index + 1 : ''}
                      </span>
                      <button
                        type="button"
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

                <div className="flex items-center gap-3 min-w-0">
                  {showAlbumArt && track.albumCover && (
                    <div
                      className={cn(
                        'relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-accent ring-1 ring-white/10',
                        tidalPlaying && 'ring-white/15'
                      )}
                    >
                      <img
                        src={track.albumCover}
                        alt={track.album}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {applePlaying && (
                        <div
                          className="absolute bottom-1 left-1 flex items-end gap-0.5 pointer-events-none track-playing-eq"
                          aria-hidden
                        >
                          <span className="w-[3px] rounded-full bg-white h-2 track-eq-bar shadow-sm" />
                          <span className="w-[3px] rounded-full bg-white h-3.5 track-eq-bar shadow-sm" />
                          <span className="w-[3px] rounded-full bg-white h-2.5 track-eq-bar shadow-sm" />
                          <span className="w-[3px] rounded-full bg-white h-3 track-eq-bar shadow-sm" />
                        </div>
                      )}
                      {spotifyPlaying && (
                        <div
                          className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/55 pointer-events-none"
                          aria-hidden
                        >
                          <Pause size={18} className="text-white fill-white" strokeWidth={0} />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          spotifyPlaying && 'text-foreground group-hover:text-white',
                          !spotifyPlaying && isThisTrack && playerTheme === 'spotify' && 'text-spotify-green',
                          !spotifyPlaying && isThisTrack && playerTheme === 'tidal' && 'text-cyan-400',
                          !spotifyPlaying && isThisTrack && playerTheme === 'apple' && 'text-apple-red',
                          !isThisTrack && 'text-foreground',
                          tidalPlaying && 'text-cyan-400 font-bold tracking-tight'
                        )}
                      >
                        {track.title}
                      </p>
                      {spotifyPlaying && (
                        <span className="hidden group-hover:inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#333] text-white/95 shrink-0 border border-white/10">
                          Song
                        </span>
                      )}
                      {tidalPlaying && (
                        <CircleArrowUp
                          className="w-3.5 h-3.5 text-white/35 shrink-0 hidden sm:block"
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                      {spotifyPlaying ? (
                        <span className="group-hover:hidden shrink-0">
                          <TagBadge track={track} />
                        </span>
                      ) : !tidalPlaying ? (
                        <TagBadge track={track} />
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        'text-xs truncate',
                        tidalPlaying && 'text-white/35',
                        applePlaying && 'text-muted-foreground',
                        spotifyPlaying && 'text-muted-foreground group-hover:text-white/60'
                      )}
                    >
                      {tidalPlaying ? (
                        track.album?.trim() || '\u00a0'
                      ) : spotifyPlaying ? (
                        <>
                          <span className="group-hover:hidden">{track.artist}</span>
                          <span className="hidden group-hover:inline">Song · {track.artist}</span>
                        </>
                      ) : (
                        track.artist
                      )}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center min-w-0">
                  <span
                    className={cn(
                      'text-sm truncate',
                      tidalPlaying && 'text-white font-bold',
                      !tidalPlaying && spotifyPlaying && 'text-muted-foreground group-hover:text-white/45',
                      !tidalPlaying && !spotifyPlaying && 'text-muted-foreground'
                    )}
                  >
                    {tidalPlaying ? track.artist : track.album}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5 min-w-0">
                  {spotifyPlaying ? (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-white hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(track);
                      }}
                      aria-label={fav ? 'Remove from library' : 'Add to library'}
                    >
                      <Plus size={18} strokeWidth={2} className={fav ? 'text-spotify-green' : 'text-white/80'} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        'opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                        tidalPlaying && 'opacity-100 text-white/45 hover:text-white/80',
                        fav && playerTheme === 'spotify' && 'text-spotify-green',
                        fav && playerTheme === 'tidal' && 'text-cyan-400',
                        fav && playerTheme === 'apple' && 'text-apple-red',
                        !fav && !tidalPlaying && 'text-muted-foreground hover:text-foreground'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(track);
                      }}
                      aria-label={fav ? 'Unlike' : 'Like'}
                    >
                      <Heart size={14} fill={fav ? 'currentColor' : 'none'} />
                    </button>
                  )}
                  <span
                    className={cn(
                      'text-sm tabular-nums shrink-0',
                      tidalPlaying && 'text-white font-medium',
                      spotifyPlaying && 'text-muted-foreground group-hover:text-white/55'
                    )}
                  >
                    {track.duration ? formatDuration(track.duration) : '--:--'}
                  </span>
                </div>

                <div className="hidden md:flex items-center justify-end">
                  <TrackRowMenu track={track} index={index} tracks={tracks} alwaysShowTrigger={tidalPlaying} />
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
    </TooltipProvider>
  );
}
