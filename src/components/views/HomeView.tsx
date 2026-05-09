'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { demoPlaylists, browseCategories, demoTracks } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlayButton from '@/components/shared/PlayButton';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

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

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          See all <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

export default function HomeView() {
  const { play } = usePlayerStore();
  const { playlists, recentlyPlayed } = useLibraryStore();
  const { setSelectedPlaylistId, setActiveView, playerTheme, setSearchQuery } = useUIStore();

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
  const quickAccess = useMemo(() => playlists.slice(0, 6), [playlists]);
  const quickTracks = useMemo(() => recentlyPlayed.slice(0, 4), [recentlyPlayed]);
  const madeForYou = useMemo(() => playlists.slice(0, 10), [playlists]);
  const recommendedArtists = useMemo(() => {
    const source = recentlyPlayed.length > 0 ? recentlyPlayed : demoTracks;
    const map = new Map<string, { name: string; image?: string; count: number }>();
    source.forEach((t) => {
      const key = t.artistId || t.artist;
      const prev = map.get(key);
      map.set(key, {
        name: t.artist,
        image: prev?.image || t.albumCover,
        count: (prev?.count || 0) + 1,
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([id, v]) => ({ id, ...v }));
  }, [recentlyPlayed]);

  return (
    <ScrollArea className="h-full custom-scrollbar">
      <div className="p-4 md:p-8 space-y-8 pb-32">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground">
            Discover something new or jump back in.
          </p>
        </div>

        {/* Spotify-style quick grid (playlists + recent) */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
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
          {quickTracks.map((track) => (
            <motion.button
              key={track.id}
              type="button"
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              className={cn(
                "flex items-center rounded-md overflow-hidden cursor-pointer group transition-colors text-left",
                playerTheme === 'tidal' ? "bg-white/5 hover:bg-white/10" : "bg-accent/50 hover:bg-accent"
              )}
              onClick={() => play(track)}
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
                {track.albumCover ? (
                  <img src={track.albumCover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-accent" />
                )}
              </div>
              <div className="flex-1 px-3 py-2 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">{track.artist}</p>
              </div>
              <div className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayButton size="sm" onClick={() => play(track)} />
              </div>
            </motion.button>
          ))}
        </section>

        {/* Discover */}
        <section>
          <SectionHeader
            title="Discover"
            onSeeAll={() => {
              setSearchQuery('');
              setActiveView('search');
            }}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {browseCategories.slice(0, 12).map((cat) => (
              <motion.button
                key={cat.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                className="h-24 rounded-xl p-4 cursor-pointer relative overflow-hidden text-left"
                style={{ backgroundColor: cat.color }}
                onClick={() => {
                  setSearchQuery(cat.name);
                  setActiveView('search');
                }}
              >
                <div className="absolute inset-0 bg-black/10" />
                <h3 className="text-base font-extrabold text-white relative z-10">{cat.name}</h3>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Made For You */}
        <section>
          <SectionHeader title="Made For You" />
          <div className="flex gap-4 overflow-x-auto custom-scrollbar-x pb-2 -mx-4 px-4 md:-mx-8 md:px-8">
            {madeForYou.map((playlist) => (
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
            <SectionHeader title="Recently played" />
            <div className="flex gap-4 overflow-x-auto custom-scrollbar-x pb-2 -mx-4 px-4 md:-mx-8 md:px-8">
              {recentlyPlayed.slice(0, 12).map((track) => (
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

        {/* Recommended artists */}
        <section>
          <SectionHeader title="Recommended artists" />
          <div className="flex gap-4 overflow-x-auto custom-scrollbar-x pb-2 -mx-4 px-4 md:-mx-8 md:px-8">
            {recommendedArtists.map((a) => (
              <motion.button
                key={a.id}
                type="button"
                whileHover={{ y: -3 }}
                className={cn(
                  'flex-shrink-0 w-[min(40vw,160px)] p-3 rounded-xl text-left',
                  playerTheme === 'tidal' ? 'bg-white/5 hover:bg-white/10' : 'bg-accent/30 hover:bg-accent/50'
                )}
                onClick={() => {
                  setSearchQuery(a.name);
                  setActiveView('search');
                }}
              >
                <div className="w-full aspect-square rounded-full overflow-hidden bg-accent shadow-lg shadow-black/40 mb-3">
                  {a.image ? (
                    <img src={a.image} alt={a.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-black text-muted-foreground">{a.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm font-bold text-foreground truncate">{a.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Artist</div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Browse All */}
        <section>
          <SectionHeader title="Browse all" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {browseCategories.map((cat) => (
              <motion.button
                key={cat.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                className="aspect-square rounded-xl p-4 cursor-pointer relative overflow-hidden text-left"
                style={{ backgroundColor: cat.color }}
                onClick={() => {
                  setSearchQuery(cat.name);
                  setActiveView('search');
                }}
              >
                <div className="absolute inset-0 bg-black/10" />
                <h3 className="text-lg font-extrabold text-white relative z-10">{cat.name}</h3>
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
