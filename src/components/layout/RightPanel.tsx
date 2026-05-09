'use client';

import { useUIStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, GripVertical, Play, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const isThisTrack = track.id === currentTrackId;
  const isCurrentlyPlaying = isThisTrack && isPlaying;

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
        'flex items-center gap-3 px-3 py-2 rounded-md group hover:bg-accent',
        isThisTrack && 'bg-accent/50'
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

      {/* Index / Equalizer */}
      <div className="w-5 flex items-center justify-center flex-shrink-0">
        {isCurrentlyPlaying ? (
          <div className="flex items-end gap-0.5 h-4 text-spotify-green">
            <div className="w-0.5 bg-spotify-green rounded-full equalizer-bar-1" style={{ height: 4 }} />
            <div className="w-0.5 bg-spotify-green rounded-full equalizer-bar-2" style={{ height: 8 }} />
            <div className="w-0.5 bg-spotify-green rounded-full equalizer-bar-3" style={{ height: 6 }} />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{index + 1}</span>
        )}
      </div>

      {/* Album art */}
      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-accent">
        {track.albumCover ? (
          <img src={track.albumCover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={14} className="text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm font-medium truncate',
          isThisTrack ? 'text-spotify-green' : 'text-foreground'
        )}>
          {track.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-xs text-muted-foreground flex-shrink-0">
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
          <Play size={12} fill="currentColor" />
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
  const { queue, currentTrack, isPlaying, reorderQueue } = usePlayerStore();

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
              <div className="p-6 flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <Music size={48} className="text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {currentTrack
                      ? `Lyrics for "${currentTrack.title}" are not available`
                      : 'Play a song to see its lyrics'}
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
