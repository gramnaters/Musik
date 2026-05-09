'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { demoPlaylists, browseCategories, formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlayButton from '@/components/shared/PlayButton';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function PlaylistCard({
  playlist,
  onClick,
  playerTheme,
}: {
  playlist: typeof demoPlaylists[0];
  onClick: () => void;
  playerTheme: string;
}) {
  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      className={cn(
        "flex items-center rounded-md overflow-hidden cursor-pointer group transition-colors",
        playerTheme === 'tidal' ? "bg-white/5 hover:bg-white/10" : "bg-accent/50 hover:bg-accent"
      )}
      onClick={onClick}
    >
      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
        {playlist.cover ? (
          <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-accent" />
        )}
      </div>
      <div className="flex-1 px-3 py-2 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{playlist.name}</p>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">
          Playlist • {playlist.tracks?.length || 0} songs
        </p>
      </div>
      <div className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <PlayButton size="sm" onClick={onClick} />
      </div>
    </motion.div>
  );
}

function CardItem({
  title,
  subtitle,
  cover,
  onClick,
}: {
  title: string;
  subtitle?: string;
  cover?: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="flex-shrink-0 w-[min(45vw,180px)] p-2 rounded-lg bg-transparent hover:bg-accent/50 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden mb-3 shadow-lg shadow-black/40">
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-accent" />
        )}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <PlayButton size="md" onClick={onClick} />
        </div>
      </div>
      <p className="text-sm font-bold text-foreground truncate">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
      )}
    </motion.div>
  );
}

export default function HomeView() {
  const { play } = usePlayerStore();
  const { playlists, recentlyPlayed } = useLibraryStore();
  const { setSelectedPlaylistId, setActiveView, playerTheme } = useUIStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const greeting = useMemo(() => {
    if (!mounted) return 'Welcome';
    return getGreeting();
  }, [mounted]);

  const handlePlayPlaylist = (playlist: typeof demoPlaylists[0]) => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      play(playlist.tracks[0], playlist.tracks, 0);
    }
  };

  const handleOpenPlaylist = (id: string) => {
    setSelectedPlaylistId(id);
  };

  // Quick access: recently played + playlists (max 6)
  const quickAccess = playlists.slice(0, 6);

  return (
    <ScrollArea className="h-full custom-scrollbar">
      <div className="p-4 md:p-8 space-y-8 pb-32">
        {/* Hero Section */}
        {playerTheme === 'tidal' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hero relative h-[220px] rounded-2xl overflow-hidden cursor-pointer group shadow-2xl shadow-black/50"
            onClick={() => handlePlayPlaylist(demoPlaylists[0])}
          >
            <div className="hero-bg absolute inset-0 tidal-hero-gradient animate-pulse" />
            <div className="relative z-10 p-7 h-full flex flex-col justify-end">
              <div className="absolute top-6 left-7 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-white/90">
                🔥 Featured
              </div>
              <div className="absolute top-5 right-6 w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110 group-hover:bg-white/25">
                <PlayButton size="md" onClick={() => {}} />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Midnight Cascade</h2>
              <p className="text-sm text-white/60">Neon Pulse • Ultraviolet • 2024</p>
            </div>
          </motion.div>
        )}

        {/* Quick Picks / Quick Row */}
        <div>
          <h2 className="text-base font-semibold text-white/90 mb-3 tracking-tight">Quick Picks</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: '⚡', name: 'Neon Pulse' },
              { icon: '🌊', name: 'Ocean Drive' },
              { icon: '🔥', name: 'Heat Waves' },
              { icon: '💫', name: 'Blinding Lights' }
            ].map((pick, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.11)' }}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-sm font-medium text-white/80 bg-white/5 border border-white/10 backdrop-blur-xl transition-all"
                onClick={() => handlePlayPlaylist(demoPlaylists[i % demoPlaylists.length])}
              >
                <span className="text-xl">{pick.icon}</span>
                {pick.name}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Access Grid (Legacy for non-tidal) */}
        {playerTheme !== 'tidal' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
            {quickAccess.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onClick={() => {
                  handlePlayPlaylist(playlist);
                  handleOpenPlaylist(playlist.id);
                }}
                playerTheme={playerTheme}
              />
            ))}
          </div>
        )}

        {/* Made For You */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Made For You</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto custom-scrollbar-x pb-2 -mx-4 px-4 md:-mx-8 md:px-8">
            {playlists.slice(0, 6).map((playlist) => (
              <CardItem
                key={playlist.id}
                title={playlist.name}
                subtitle={playlist.description || `Playlist • ${playlist.tracks?.length || 0} songs`}
                cover={playlist.cover}
                onClick={() => {
                  handlePlayPlaylist(playlist);
                  handleOpenPlaylist(playlist.id);
                }}
              />
            ))}
          </div>
        </section>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Recently Played</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto custom-scrollbar-x pb-2 -mx-4 px-4 md:-mx-8 md:px-8">
              {recentlyPlayed.slice(0, 8).map((track) => (
                <CardItem
                  key={track.id}
                  title={track.title}
                  subtitle={track.artist}
                  cover={track.albumCover}
                  onClick={() => play(track)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Browse Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Browse All</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {browseCategories.map((cat) => (
              <motion.div
                key={cat.id}
                whileHover={{ scale: 1.03 }}
                className="aspect-square rounded-lg p-4 cursor-pointer relative overflow-hidden"
                style={{ backgroundColor: cat.color }}
                onClick={() => {
                  setActiveView('search');
                }}
              >
                <h3 className="text-lg font-bold text-white relative z-10">{cat.name}</h3>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
