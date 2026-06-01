'use client';

import { useState, useMemo } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { Playlist, Track } from '@/types/music';
import { trackListenDedupeKey } from '@/lib/track-identity';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import TrackList from '@/components/shared/TrackList';
import PlayButton from '@/components/shared/PlayButton';
import { Plus, Music, Play, Pencil, Trash2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

function PlaylistCardView({
  playlist,
  onOpen,
  onPlay,
  onDelete,
  onRename,
}: {
  playlist: Playlist;
  onOpen: () => void;
  onPlay: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      className="flex-shrink-0 w-[min(45vw,180px)] p-2 rounded-lg bg-transparent hover:bg-accent/50 cursor-pointer group"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden mb-3 shadow-lg shadow-black/40 bg-accent">
        {playlist.cover ? (
          <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-accent flex items-center justify-center">
            <Music size={32} className="text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <PlayButton size="md" onClick={onPlay} />
        </div>
      </div>
      <p
        className="text-sm font-bold text-foreground truncate cursor-pointer hover:underline"
        onClick={onOpen}
      >
        {playlist.name}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Playlist • {playlist.tracks?.length || 0} songs
      </p>
    </motion.div>
  );
}

export default function LibraryView() {
  const { playlists, favourites, recentlyPlayed, createPlaylist, deletePlaylist, addToPlaylist, renamePlaylist } = useLibraryStore();
  const { play } = usePlayerStore();
  const { selectedPlaylistId, setSelectedPlaylistId } = useUIStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  const recentPlayedDeduped = useMemo(() => {
    const seen = new Set<string>();
    const out: Track[] = [];
    for (const t of recentlyPlayed) {
      const k = trackListenDedupeKey(t);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  }, [recentlyPlayed]);

  // Favourite track IDs (display requires full Track objects in a future enhancement)
  const favouriteTracks: Track[] = [];

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setCreateDialogOpen(false);
    }
  };

  const handleRename = () => {
    if (renameTarget && renameName.trim()) {
      renamePlaylist(renameTarget.id, renameName.trim());
      setRenameTarget(null);
      setRenameName('');
      setRenameDialogOpen(false);
    }
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      play(playlist.tracks[0], playlist.tracks, 0);
    }
  };

  // If a playlist is selected, show its detail view
  if (selectedPlaylist) {
    return (
      <ScrollArea className="h-full custom-scrollbar">
        <div className="p-4 md:p-8 pb-32">
          {/* Header */}
          <div className="flex items-end gap-6 mb-8">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-md overflow-hidden flex-shrink-0 bg-accent shadow-2xl shadow-black/60">
              {selectedPlaylist.cover ? (
                <img src={selectedPlaylist.cover} alt={selectedPlaylist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-accent flex items-center justify-center">
                  <Music size={48} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Playlist</p>
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-foreground mb-4 truncate">
                {selectedPlaylist.name}
              </h1>
              {selectedPlaylist.description && (
                <p className="text-sm text-muted-foreground mb-2">{selectedPlaylist.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Musik</span>
                {' • '}
                {selectedPlaylist.tracks?.length || 0} songs
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mb-6">
            {selectedPlaylist.tracks && selectedPlaylist.tracks.length > 0 && (
              <PlayButton
                size="lg"
                onClick={() => handlePlayPlaylist(selectedPlaylist)}
                trackId={selectedPlaylist.tracks[0]?.id}
                showPauseState={false}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRenameTarget({ id: selectedPlaylist.id, name: selectedPlaylist.name });
                setRenameName(selectedPlaylist.name);
                setRenameDialogOpen(true);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setDeleteConfirm(selectedPlaylist.id);
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={18} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedPlaylistId(null)}
              className="text-muted-foreground hover:text-foreground ml-auto"
            >
              Back to Library
            </Button>
          </div>

          {/* Track list */}
          <TrackList
            tracks={selectedPlaylist.tracks || []}
            showAlbumArt={true}
            showIndex={true}
          />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full custom-scrollbar">
      <div className="p-4 md:p-8 pb-32">
        <Tabs defaultValue="playlists">
          <TabsList className="bg-transparent border-b border-border/30 rounded-none h-auto p-0 w-full justify-start gap-6 mb-6">
            <TabsTrigger
              value="playlists"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-2 px-0 font-medium"
            >
              Playlists
            </TabsTrigger>
            <TabsTrigger
              value="favourites"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-2 px-0 font-medium"
            >
              Liked Songs
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-2 px-0 font-medium"
            >
              Recently Played
            </TabsTrigger>
          </TabsList>

          <TabsContent value="playlists" className="mt-4">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Playlists</h2>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <Plus size={20} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Create Playlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Playlist name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                      className="bg-background border-border text-foreground"
                      autoFocus
                    />
                    <Button onClick={handleCreatePlaylist} className="w-full bg-spotify-green hover:bg-spotify-green-hover text-white">
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Create new playlist card */}
              <motion.div
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                onClick={() => setCreateDialogOpen(true)}
                className="flex-shrink-0 p-2 rounded-lg bg-accent/30 hover:bg-accent/50 cursor-pointer"
              >
                <div className="w-full aspect-square rounded-md bg-accent/50 flex items-center justify-center mb-3">
                  <Plus size={32} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Create Playlist</p>
              </motion.div>

              {playlists.map((playlist) => (
                <PlaylistCardView
                  key={playlist.id}
                  playlist={playlist}
                  onOpen={() => setSelectedPlaylistId(playlist.id)}
                  onPlay={() => handlePlayPlaylist(playlist)}
                  onDelete={() => deletePlaylist(playlist.id)}
                  onRename={() => {
                    setRenameTarget({ id: playlist.id, name: playlist.name });
                    setRenameName(playlist.name);
                    setRenameDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="favourites" className="mt-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-indigo-500 to-blue-300 flex items-center justify-center">
                <Heart size={20} className="text-white" fill="white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Liked Songs</h2>
                <p className="text-sm text-muted-foreground">{favouriteTracks.length} songs</p>
              </div>
            </div>
            {favouriteTracks.length > 0 && (
              <div className="mb-4">
                <PlayButton
                  size="md"
                  onClick={() => play(favouriteTracks[0], favouriteTracks, 0)}
                  trackId={favouriteTracks[0]?.id}
                  showPauseState={false}
                />
              </div>
            )}
            <TrackList tracks={favouriteTracks} showAlbumArt={true} showIndex={true} />
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            <h2 className="text-2xl font-bold text-foreground mb-6">Recently Played</h2>
            <TrackList tracks={recentPlayedDeduped} showAlbumArt={true} showIndex={true} />
          </TabsContent>
        </Tabs>

        {/* Rename Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Rename Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Playlist name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="bg-background border-border text-foreground"
                autoFocus
              />
              <Button onClick={handleRename} className="w-full bg-spotify-green hover:bg-spotify-green-hover text-white">
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Delete Playlist</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this playlist? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-border text-foreground">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm) {
                    deletePlaylist(deleteConfirm);
                    setDeleteConfirm(null);
                    if (selectedPlaylistId === deleteConfirm) {
                      setSelectedPlaylistId(null);
                    }
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
