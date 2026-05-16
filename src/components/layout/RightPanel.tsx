'use client';

import { useUIStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useLyricsStore } from '@/stores/lyricsStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, GripVertical, Play, Pause, Music, Loader2 } from 'lucide-react';
import { AppleMusicPlayIcon } from '@/components/icons/AppleMusicPlayIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTrackItem({
  track,
  index,
  queueIndex,
  isPlaying,
  currentTrackId,
}: {
  track: { id: string; title: string; artist: string; albumCover?: string; duration?: number };
  index: number;
  queueIndex: number;
  isPlaying: boolean;
  currentTrackId?: string;
}) {
  const { removeFromQueue, play } = usePlayerStore();
  const { addRecentlyPlayed } = useLibraryStore();
  const { playerTheme } = useUIStore();
  const isThisTrack = track.id === currentTrackId;
  const isCurrentlyPlaying = isThisTrack && isPlaying;
  const tidalPlaying = playerTheme === 'tidal' && isCurrentlyPlaying;
  const applePlaying = playerTheme === 'apple' && isCurrentlyPlaying;
  const spotifyPlaying = playerTheme === 'spotify' && isCurrentlyPlaying;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md group',
        !spotifyPlaying && 'hover:bg-accent',
        !spotifyPlaying && isThisTrack && 'bg-accent/50',
        spotifyPlaying && 'hover:bg-[#2a2a2a]',
        tidalPlaying && 'bg-[#1a1a1a] hover:bg-[#222] border border-white/[0.06]',
        applePlaying && 'bg-accent/45 hover:bg-accent/60'
      )}
    >
      {/* Drag handle */}
      <button
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      {/* Index / playing */}
      <div className="w-5 flex items-center justify-center flex-shrink-0 tabular-nums">
        {applePlaying ? (
          <span className="text-xs text-muted-foreground">{index + 1}</span>
        ) : tidalPlaying ? (
          <span className="w-3 shrink-0" aria-hidden />
        ) : spotifyPlaying ? (
          <span className="text-xs text-muted-foreground">{index + 1}</span>
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
                playerTheme === 'spotify' && 'bg-spotify-green',
                playerTheme === 'tidal' && 'bg-cyan-400',
                playerTheme === 'apple' && 'bg-apple-red'
              )}
              style={{ height: 4 }}
            />
            <div
              className={cn(
                'w-0.5 rounded-full equalizer-bar-2',
                playerTheme === 'spotify' && 'bg-spotify-green',
                playerTheme === 'tidal' && 'bg-cyan-400',
                playerTheme === 'apple' && 'bg-apple-red'
              )}
              style={{ height: 8 }}
            />
            <div
              className={cn(
                'w-0.5 rounded-full equalizer-bar-3',
                playerTheme === 'spotify' && 'bg-spotify-green',
                playerTheme === 'tidal' && 'bg-cyan-400',
                playerTheme === 'apple' && 'bg-apple-red'
              )}
              style={{ height: 6 }}
            />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{index + 1}</span>
        )}
      </div>

      {/* Album art */}
      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-accent ring-1 ring-white/10">
        {track.albumCover ? (
          <img src={track.albumCover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={14} className="text-muted-foreground" />
          </div>
        )}
        {tidalPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 pointer-events-none" aria-hidden>
            <Play size={16} className="text-white fill-white translate-x-px" strokeWidth={0} />
          </div>
        )}
        {applePlaying && (
          <div
            className="absolute bottom-1 left-1 flex items-end gap-0.5 pointer-events-none track-playing-eq"
            aria-hidden
          >
            <span className="w-[3px] rounded-full bg-white h-1.5 track-eq-bar" />
            <span className="w-[3px] rounded-full bg-white h-2.5 track-eq-bar" />
            <span className="w-[3px] rounded-full bg-white h-2 track-eq-bar" />
            <span className="w-[3px] rounded-full bg-white h-2.5 track-eq-bar" />
          </div>
        )}
        {spotifyPlaying && (
          <div
            className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/55 pointer-events-none"
            aria-hidden
          >
            <Pause size={16} className="text-white fill-white" strokeWidth={0} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p
            className={cn(
              'text-sm font-medium truncate',
              spotifyPlaying && 'text-foreground group-hover:text-white',
              !spotifyPlaying && isThisTrack && playerTheme === 'spotify' && 'text-spotify-green',
              !spotifyPlaying && isThisTrack && playerTheme === 'tidal' && 'text-cyan-400',
              !spotifyPlaying && isThisTrack && playerTheme === 'apple' && 'text-apple-red',
              !isThisTrack && 'text-foreground',
              tidalPlaying && 'text-white font-semibold'
            )}
          >
            {track.title}
          </p>
          {spotifyPlaying && (
            <span className="hidden group-hover:inline-flex text-[9px] font-semibold px-1 py-0.5 rounded bg-[#333] text-white/95 shrink-0 border border-white/10">
              Song
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-xs truncate',
            tidalPlaying && 'text-white/50',
            spotifyPlaying && 'text-muted-foreground group-hover:text-white/60'
          )}
        >
          {tidalPlaying ? (
            `Track · ${track.artist}`
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

      {/* Duration */}
      <span
        className={cn(
          'text-xs flex-shrink-0 tabular-nums',
          tidalPlaying && 'text-white/45',
          spotifyPlaying && 'text-muted-foreground group-hover:text-white/55'
        )}
      >
        {track.duration ? formatDuration(track.duration) : '--:--'}
      </span>

      {/* Play button */}
      {!isThisTrack && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground flex-shrink-0"
          onClick={() => {
            play(track);
            addRecentlyPlayed(track);
          }}
        >
          {playerTheme === 'apple' ? (
            <AppleMusicPlayIcon size={12} className="translate-x-px" />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
        </Button>
      )}

      {/* Remove button */}
      {queueIndex !== index && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground flex-shrink-0"
          onClick={() => removeFromQueue(index)}
        >
          <X size={12} />
        </Button>
      )}
    </div>
  );
}

export default function RightPanel() {
  const { rightPanel, setRightPanel, playerTheme } = useUIStore();
  const { queue, currentTrack, isPlaying, reorderQueue, currentTime } = usePlayerStore();
  const { lyrics, syncedLyrics, isLoading, fetchLyrics } = useLyricsStore();

  useEffect(() => {
    if (rightPanel === 'lyrics' && currentTrack) {
      fetchLyrics(currentTrack.id, currentTrack.title, currentTrack.artist);
    }
  }, [rightPanel, currentTrack, fetchLyrics]);

  const activeLyricIndex = useMemo(() => {
    if (!syncedLyrics) return -1;
    let index = -1;
    for (let i = 0; i < syncedLyrics.length; i++) {
      if (currentTime >= syncedLyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [syncedLyrics, currentTime]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex((t) => t.id === active.id);
      const newIndex = queue.findIndex((t) => t.id === over.id);
      const newQueue = arrayMove(queue, oldIndex, newIndex);
      reorderQueue(oldIndex, newIndex);
    }
  };

  if (rightPanel === 'none') return null;

  return (
    <AnimatePresence>
      {(rightPanel === 'queue' || rightPanel === 'lyrics') && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "hidden lg:flex flex-col flex-shrink-0 h-full overflow-hidden transition-all duration-500",
            playerTheme === 'tidal' ? "tidal-glass-sidebar border-none" : "bg-card border-l border-border/30"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground">
              {rightPanel === 'queue' ? 'Queue' : 'Lyrics'}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightPanel('none')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            {rightPanel === 'queue' && (
              <div className="p-4 space-y-6">
                {/* Now Playing */}
                {currentTrack && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Now Playing</h4>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-accent/50">
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        {currentTrack.albumCover ? (
                          <img src={currentTrack.albumCover} alt={currentTrack.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-accent flex items-center justify-center">
                            <Music size={14} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-spotify-green truncate">{currentTrack.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                      </div>
                      {isPlaying && (
                        <div className="flex items-end gap-0.5 h-4 text-spotify-green">
                          <div className="w-0.5 bg-spotify-green rounded-full equalizer-bar-1" style={{ height: 4 }} />
                          <div className="w-0.5 bg-spotify-green rounded-full equalizer-bar-2" style={{ height: 8 }} />
                          <div className="w-0.5 bg-spotify-green rounded-full equalizer-bar-3" style={{ height: 6 }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Up Next */}
                {queue.length > 1 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Next Up</h4>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={queue
                          .filter((_, i) => i !== (currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1))
                          .map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          {queue.map((track, index) => {
                            const currentIdx = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
                            if (index === currentIdx) return null;
                            return (
                              <SortableTrackItem
                                key={track.id}
                                track={track}
                                index={index}
                                queueIndex={currentIdx}
                                isPlaying={isPlaying}
                                currentTrackId={currentTrack?.id}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                {queue.length <= 1 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Add songs to your queue to see them here
                  </p>
                )}
              </div>
            )}

            {rightPanel === 'lyrics' && (
              <div className="h-full flex flex-col p-6 overflow-hidden">
                {!currentTrack ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <Music size={48} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Play a song to see its lyrics</p>
                  </div>
                ) : isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                  </div>
                ) : syncedLyrics && syncedLyrics.length > 0 ? (
                  <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                    {syncedLyrics.map((line, idx) => (
                      <motion.p
                        key={idx}
                        initial={false}
                        animate={{
                          opacity: activeLyricIndex === idx ? 1 : 0.4,
                          scale: activeLyricIndex === idx ? 1.05 : 1,
                          color: activeLyricIndex === idx ? 'var(--foreground)' : 'var(--muted-foreground)',
                        }}
                        className={cn(
                          "text-lg font-bold leading-tight cursor-default transition-all duration-300 origin-left",
                          activeLyricIndex === idx && "text-white"
                        )}
                      >
                        {line.text}
                      </motion.p>
                    ))}
                  </div>
                ) : lyrics ? (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <p className="text-base leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium">
                      {lyrics}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <Music size={48} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Lyrics for "{currentTrack.title}" are not available
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
