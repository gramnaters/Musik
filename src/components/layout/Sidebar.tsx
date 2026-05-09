'use client';

import { useUIStore } from '@/stores/uiStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { cn } from '@/lib/utils';
import { Home, Search, Library, Plus, ChevronLeft, ChevronRight, Music, Puzzle, Settings as SettingsIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Sidebar() {
  const { 
    activeView, navigateTo, sidebarCollapsed, toggleSidebar, 
    selectedPlaylistId, setSelectedPlaylistId,
    playerTheme,
  } = useUIStore();
  const { playlists, createPlaylist } = useLibraryStore();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setDialogOpen(false);
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', view: 'home' as const },
    { icon: Search, label: 'Search', view: 'search' as const },
    { icon: Library, label: 'Your Library', view: 'library' as const },
    { icon: Puzzle, label: 'Addons', view: 'addons' as const },
    { icon: SettingsIcon, label: 'Settings', view: 'settings' as const },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      className={cn(
        'hidden md:flex flex-col flex-shrink-0 h-full transition-all duration-500',
        playerTheme === 'tidal' ? 'tidal-glass-sidebar border-none' : 'bg-sidebar border-r border-sidebar-border',
      )}
    >
      {/* Top section */}
      <div className={cn('flex items-center p-4 gap-2', sidebarCollapsed && 'justify-center')}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 12L12 22L22 12L12 2ZM12 6L18 12L12 18L6 12L12 6Z" fill="white" />
              </svg>
            </div>
            <span
              className={cn(
                'font-bold text-xl tracking-tight',
                playerTheme === 'tidal' ? 'text-white' : 'text-foreground'
              )}
            >
              musik
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            'h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent',
            sidebarCollapsed && 'hidden'
          )}
        >
          <ChevronLeft size={20} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeView === item.view && !selectedPlaylistId;
          return (
            <button
              key={item.view}
              onClick={() => {
                navigateTo(item.view);
                setSelectedPlaylistId(null);
              }}
              className={cn(
                'w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-[13.5px] font-medium relative transition-all duration-200',
                isActive
                  ? playerTheme === 'tidal' ? 'tidal-nav-item-active' : 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                sidebarCollapsed && 'justify-center px-2',
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={isActive && playerTheme === 'tidal' ? 22 : 20} className={cn("flex-shrink-0 transition-transform", isActive && "scale-110")} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Library section */}
      <div className="flex-1 flex flex-col min-h-0 mt-4">
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-sm font-semibold text-foreground">Your Library</span>
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
              <button
                key={playlist.id}
                onClick={() => setSelectedPlaylistId(playlist.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm',
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
                  <div className="min-w-0 text-left">
                    <p className="font-medium truncate">{playlist.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Playlist • {playlist.tracks?.length || 0} songs
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </ScrollArea>
      </div>

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <div className="p-2 border-t border-sidebar-border/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full h-8 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      )}
    </motion.aside>
  );
}
