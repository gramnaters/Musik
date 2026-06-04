'use client';

import { useUIStore } from '@/stores/uiStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useStreamingStore } from '@/stores/streamingStore';
import { cn } from '@/lib/utils';
import { Home, Search, Plus, ChevronLeft, ChevronRight, Music, Settings as SettingsIcon, MoreHorizontal, Trash2, Pencil, Play, ListPlus, Clock, Library, Heart, Hourglass } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Sidebar() {
  const { 
    activeView, navigateTo, sidebarCollapsed, toggleSidebar, 
    selectedPlaylistId, setSelectedPlaylistId,
    playerTheme,
  } = useUIStore();
  const { playlists, createPlaylist, deletePlaylist, renamePlaylist } = useLibraryStore();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setDialogOpen(false);
    }
  };

  const {
    sidebarHome, sidebarLibrary, sidebarRecent,
    sidebarSettings, sidebarDonate,
  } = useStreamingStore();

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', view: 'home' as const, visible: sidebarHome },
    { id: 'library', icon: Library, label: 'Library', view: 'library' as const, visible: sidebarLibrary },
    { id: 'recent', icon: Clock, label: 'Recent', view: 'recent' as const, visible: sidebarRecent },
    { id: 'search', icon: Search, label: 'Search', view: 'search' as const, visible: true },
    { id: 'settings', icon: SettingsIcon, label: 'Settings', view: 'settings' as const, visible: true },
  ];

  const filteredNavItems = navItems.filter((item) => item.visible);

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
      className={cn(
        'hidden md:flex flex-col flex-shrink-0 h-full overflow-hidden',
        playerTheme === 'tidal' ? 'tidal-glass-sidebar border-none' : 'bg-sidebar border-r border-sidebar-border',
      )}
    >
      {/* Top section */}
      <div className={cn(
        'flex items-center p-4 gap-2',
        sidebarCollapsed && 'flex-col px-2'
      )}>
        {/* Logo icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            'bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-[0_2px_8px_rgba(29,185,84,0.3)]'
          )}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 14 L2 5 L6.5 11 L9 7.5 L11.5 11 L16 5 L16 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* Brand name — only when expanded */}
        {!sidebarCollapsed && (
          <span
            className={cn(
              'font-bold tracking-[-0.04em] text-[18px] leading-none flex-1',
              playerTheme === 'tidal' ? 'text-white' : 'text-foreground'
            )}
          >
            musik
          </span>
        )}
        {/* Toggle arrow — pushed to right edge when expanded, centered below logo when collapsed */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            'h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent shrink-0',
            !sidebarCollapsed && 'ml-auto'
          )}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-2 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = item.id === 'recent' ? false : (activeView === item.view && !selectedPlaylistId);
          return (
            <button
            key={item.label}
              onClick={() => {
                const target = item.view === 'recent' ? 'home' : item.view;
                navigateTo(target);
                setSelectedPlaylistId(null);
              }}
              className={cn(
                'w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-[15px] font-medium relative transition-all duration-200',
                isActive
                  ? playerTheme === 'tidal' ? 'tidal-nav-item-active' : 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                sidebarCollapsed && 'justify-center px-2',
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon
                size={isActive && playerTheme === 'tidal' ? 22 : 20}
                className={cn(
                  'flex-shrink-0 transition-transform',
                  isActive && 'scale-110',
                  isActive && playerTheme === 'spotify' && 'text-spotify-green',
                  isActive && playerTheme === 'tidal' && 'text-cyan-400',
                  isActive && playerTheme === 'apple' && 'text-apple-red'
                )}
              />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Donate */}
      {sidebarDonate && !sidebarCollapsed && (
        <div className="px-2 mt-1">
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200">
                <Heart size={20} className="text-red-400" />
                <span>Donate</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-foreground sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white text-lg">Support Musik</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  If Musik has been useful to you and you're able to, consider making a donation. 
                  It helps keep the project alive and supports ongoing development — and you get our eternal gratitude :)
                </p>
                <Button
                  className="w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold"
                  onClick={() => window.open('https://ko-fi.com', '_blank')}
                >
                  <Heart size={16} className="mr-2" fill="currentColor" />
                  Donate on Ko-fi
                </Button>
                <p className="text-xs text-zinc-500 text-center leading-relaxed">
                  If you cannot financially support us, please consider sharing Musik with friends and the community!
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Library section */}
      <div className="flex-1 flex flex-col min-h-0 mt-4">
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-[15px] font-semibold text-foreground">Your Library</span>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent">
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
        )}

        <ScrollArea className="flex-1 px-2">
          {sidebarCollapsed && (
            <button
              onClick={() => setDialogOpen(true)}
              className="w-full flex items-center justify-center px-2 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50"
              title="Create Playlist"
            >
              <Plus size={20} />
            </button>
          )}

          {playlists.map((playlist) => {
            const isActive = selectedPlaylistId === playlist.id;
            return (
              <div key={playlist.id} className="relative group">
                <button
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px]',
                    'transition-all duration-200',
                    isActive
                      ? 'text-foreground bg-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                  title={sidebarCollapsed ? playlist.name : undefined}
                >
                  {playlist.cover ? (
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-accent">
                      <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded bg-accent/50 flex items-center justify-center flex-shrink-0">
                      <Music size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  {!sidebarCollapsed && (
                    <div className="min-w-0 text-left flex-1">
                      <p className="font-medium truncate text-[14px]">{playlist.name}</p>
                      <p className="text-[12px] text-muted-foreground truncate">
                        Playlist • {playlist.tracks?.length || 0} songs
                      </p>
                    </div>
                  )}
                </button>
                {!sidebarCollapsed && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <MoreHorizontal size={14} className="text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border border-white/10" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => {
                        if (playlist.tracks && playlist.tracks.length > 0) {
                          usePlayerStore.getState().play(playlist.tracks[0], playlist.tracks, 0);
                        }
                      }}>
                        <Play size={14} className="mr-2" />Play
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        if (playlist.tracks) {
                          const player = usePlayerStore.getState();
                          playlist.tracks.forEach((t) => player.addToQueue(t));
                        }
                      }}>
                        <ListPlus size={14} className="mr-2" />Add to Queue
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={() => {
                        setRenameTarget(playlist.id);
                        setRenameName(playlist.name);
                        setRenameDialogOpen(true);
                      }}>
                        <Pencil size={14} className="mr-2" />Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteConfirm(playlist.id)}>
                        <Trash2 size={14} className="mr-2 text-red-400" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </ScrollArea>
      </div>

      {/* Rename Playlist Dialog */}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameName.trim() && renameTarget) {
                  renamePlaylist(renameTarget, renameName.trim());
                  setRenameDialogOpen(false);
                  setRenameTarget(null);
                }
              }}
              className="bg-background border-border text-foreground"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setRenameDialogOpen(false); setRenameTarget(null); }} className="border-border text-foreground">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (renameName.trim() && renameTarget) {
                    renamePlaylist(renameTarget, renameName.trim());
                    setRenameDialogOpen(false);
                    setRenameTarget(null);
                  }
                }}
                className="bg-spotify-green hover:bg-spotify-green-hover text-white"
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
                  if (selectedPlaylistId === deleteConfirm) {
                    setSelectedPlaylistId(null);
                  }
                  setDeleteConfirm(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.aside>
  );
}
