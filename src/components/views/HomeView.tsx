'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { useAddonStore } from '@/stores/addonStore';
import { useMetadataStore } from '@/stores/metadataStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlayButton from '@/components/shared/PlayButton';
import TrackList from '@/components/shared/TrackList';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Loader2, Play, Music, Disc, Users, ListMusic, Globe } from 'lucide-react';
import type { Track, Album } from '@/types/music';
import { Button } from '@/components/ui/button';
import { addonTrackToTrack } from '@/lib/addon-track-map';
import { trackListenDedupeKey } from '@/lib/track-identity';
import { toast } from '@/hooks/use-toast';

/** Monochrome Genres */
const GENRES = [
  { id: 'hip_hop', name: 'Hip-Hop' },
  { id: 'rnb', name: 'R&B / Soul' },
  { id: 'blues', name: 'Blues' },
  { id: 'classical', name: 'Classical' },
  { id: 'country', name: 'Country' },
  { id: 'dance_electronic', name: 'Dance & Electronic' },
  { id: 'americana', name: 'Folk / Americana' },
  { id: 'world', name: 'Global' },
  { id: 'gospel', name: 'Gospel / Christian' },
  { id: 'jazz', name: 'Jazz' },
  { id: 'kpop', name: 'K-Pop' },
  { id: 'kids', name: 'Kids' },
  { id: 'latin', name: 'Latin' },
  { id: 'metal', name: 'Metal' },
  { id: 'pop', name: 'Pop' },
  { id: 'reggae', name: 'Reggae / Dancehall' },
  { id: 'retro', name: 'Legacy' },
  { id: 'indierock', name: 'Rock / Indie' },
];

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="text-xs font-semibold text-white/50 hover:text-white transition-colors"
        >
          See all
        </button>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {children}
    </div>
  );
}

function Card({ 
  title, 
  subtitle, 
  image, 
  onClick, 
  type = 'album' 
}: { 
  title: string; 
  subtitle?: string; 
  image?: string; 
  onClick: () => void;
  type?: 'album' | 'playlist' | 'artist' | 'track';
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className={cn(
        "relative aspect-square mb-3 overflow-hidden shadow-lg border border-white/5",
        type === 'artist' ? "rounded-full" : "rounded-xl"
      )}>
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            {type === 'artist' ? <Users className="text-white/20" size={32} /> : 
             type === 'album' ? <Disc className="text-white/20" size={32} /> :
             <Music className="text-white/20" size={32} />}
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <PlayButton size="md" onClick={onClick} />
        </div>
      </div>
      <p className={cn(
        "text-sm font-bold text-white truncate",
        type === 'artist' && "text-center"
      )}>{title}</p>
      {subtitle && (
        <p className={cn(
          "text-xs text-white/50 truncate mt-0.5",
          type === 'artist' && "text-center"
        )}>{subtitle}</p>
      )}
    </motion.div>
  );
}

export default function HomeView() {
  const [activeTab, setActiveTab] = useState<'home' | 'explore'>('explore');
  const [exploreData, setExploreData] = useState<any>(null);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [genreHub, setGenreHub] = useState<{ id: string; name: string; data?: any; loading: boolean } | null>(null);
  
  const { play } = usePlayerStore();
  const { recentlyPlayed, playlists: myPlaylists } = useLibraryStore();
  const { playerTheme, setSelectedPlaylistId } = useUIStore();

  const fetchExplore = useCallback(async () => {
    setExploreLoading(true);
    try {
      const res = await fetch('/api/hot');
      const data = await res.json();
      setExploreData(data);
    } catch (e) {
      console.error('Failed to fetch explore data', e);
    } finally {
      setExploreLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'explore' && !exploreData) {
      fetchExplore();
    }
  }, [activeTab, exploreData, fetchExplore]);

  const loadGenre = async (id: string, name: string) => {
    setGenreHub({ id, name, loading: true });
    try {
      const res = await fetch(`/api/explore/genre?id=${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !data.sections) throw new Error('No data returned');
      setGenreHub({ id, name, data, loading: false });
    } catch (e) {
      console.error('Failed to load genre', e);
      toast({
        title: 'Failed to load genre',
        description: 'The music provider might be down. Please try again later.',
        variant: 'destructive',
      });
      setGenreHub(null);
    }
  };

  const getImageUrl = (item: any) => {
    if (!item) return '';
    const uuid = item.squareImage || item.image || item.picture || item.album?.cover || item.cover;
    if (typeof uuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      return `https://resources.tidal.com/images/${uuid.replace(/-/g, '/')}/640x640.jpg`;
    }
    return item.artworkURL || (typeof uuid === 'string' ? uuid : '');
  };

  const mapItemToTrack = (item: any): Track => {
    // If it's already a Track object, return it
    if (item.source && item.id && !item.uuid) return item;
    
    return {
      id: item.id || item.uuid,
      title: item.title || item.name || 'Unknown Track',
      artist: item.artist?.name || item.artists?.[0]?.name || item.artist || 'Unknown Artist',
      album: item.album?.title || item.album || '',
      albumCover: getImageUrl(item),
      duration: item.duration || 0,
      source: item.source || 'tidal',
    };
  };

  const renderHome = () => {
    const recentDeduped = recentlyPlayed.slice(0, 12);
    
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        {recentDeduped.length > 0 && (
          <section>
            <SectionHeader title="Recently Played" />
            <Grid>
              {recentDeduped.map((track) => (
                <Card 
                  key={trackListenDedupeKey(track)}
                  title={track.title}
                  subtitle={track.artist}
                  image={track.albumCover}
                  onClick={() => play(track)}
                  type="track"
                />
              ))}
            </Grid>
          </section>
        )}

        {myPlaylists.length > 0 && (
          <section>
            <SectionHeader title="Your Playlists" />
            <Grid>
              {myPlaylists.map((pl) => (
                <Card 
                  key={pl.id}
                  title={pl.name}
                  subtitle={`${pl.tracks?.length || 0} tracks`}
                  image={pl.cover}
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  type="playlist"
                />
              ))}
            </Grid>
          </section>
        )}

        <section>
          <SectionHeader title="Recommendations" />
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 group hover:border-white/10 transition-colors">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ListMusic className="text-white/20" size={32} />
            </div>
            <p className="text-white font-semibold mb-1">Personalized Mixes</p>
            <p className="text-white/40 text-sm max-w-xs text-center">Connect your accounts in Settings to see your daily mixes and picks.</p>
          </div>
        </section>
      </div>
    );
  };

  const renderExplore = () => {
    if (genreHub) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full bg-white/5 hover:bg-white/10 shrink-0"
              onClick={() => setGenreHub(null)}
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold truncate">{genreHub.name}</h1>
              <p className="text-sm text-white/40">Genre Hub</p>
            </div>
          </div>

          {genreHub.loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-white/20" size={40} />
              <p className="text-white/20 text-sm font-medium">Curating tracks...</p>
            </div>
          ) : (
            <div className="space-y-12">
              {!genreHub.data?.sections?.length && (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-3xl border border-white/5">
                  <Music className="text-white/10 mb-4" size={48} />
                  <p className="text-white/50 font-medium">No content found for this genre</p>
                  <Button variant="ghost" className="mt-4 text-white/40" onClick={() => loadGenre(genreHub.id, genreHub.name)}>
                    Retry
                  </Button>
                </div>
              )}
              {genreHub.data?.sections?.map((section: any, idx: number) => (
                <section key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[100ms]">
                  <SectionHeader title={section.title} />
                  {section.type === 'TRACK_LIST' ? (
                    <div className="bg-zinc-900/20 rounded-2xl border border-white/5 p-2">
                      <TrackList 
                        tracks={section.items.map(mapItemToTrack)} 
                        showAlbumArt 
                        showIndex 
                      />
                    </div>
                  ) : (
                    <Grid>
                      {section.items.map((item: any, i: number) => (
                        <Card
                          key={i}
                          title={item.title || item.name}
                          subtitle={item.artist?.name || item.artists?.[0]?.name || item.artist}
                          image={getImageUrl(item)}
                          onClick={() => {
                            if (section.type === 'TRACK' || !section.type) {
                              play(mapItemToTrack(item));
                            } else {
                              // Handle other types if needed
                            }
                          }}
                          type={section.type === 'ARTIST' ? 'artist' : 'album'}
                        />
                      ))}
                    </Grid>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <section>
          <SectionHeader title="Genres" />
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <Button
                key={g.id}
                variant="secondary"
                className="bg-zinc-900/40 border border-white/5 hover:bg-zinc-800 hover:border-white/10 transition-all rounded-full h-10 px-5 text-sm font-semibold"
                onClick={() => loadGenre(g.id, g.name)}
              >
                {g.name}
              </Button>
            ))}
          </div>
        </section>

        {exploreLoading ? (
          <div className="space-y-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-6">
                <div className="h-7 w-48 bg-zinc-900 rounded animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <div key={j} className="space-y-3">
                      <div className="aspect-square bg-zinc-900 rounded-2xl animate-pulse" />
                      <div className="h-4 w-3/4 bg-zinc-900 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-zinc-900 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !exploreData || (!exploreData.top_tracks?.length && !exploreData.top_albums?.length) ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-zinc-900/20 rounded-3xl border border-dashed border-white/5">
            <Globe className="text-white/10" size={48} />
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-2">Feed currently unavailable</h3>
              <p className="text-white/40 text-sm max-w-xs">We couldn't load the trending music. Please check your connection.</p>
            </div>
            <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/5" onClick={fetchExplore}>
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {exploreData?.top_albums && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <SectionHeader title="Trending Albums" />
                <Grid>
                  {exploreData.top_albums.map((item: any) => (
                    <Card 
                      key={item.id}
                      title={item.title}
                      subtitle={item.artist?.name}
                      image={getImageUrl(item)}
                      onClick={() => {}}
                    />
                  ))}
                </Grid>
              </section>
            )}

            {exploreData?.top_tracks && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[100ms]">
                <SectionHeader title="Trending Tracks" />
                <div className="bg-zinc-900/20 rounded-2xl border border-white/5 p-2">
                  <TrackList 
                    tracks={exploreData.top_tracks.map(mapItemToTrack)} 
                    showAlbumArt 
                    showIndex 
                  />
                </div>
              </section>
            )}

            {exploreData?.featured_playlists && exploreData.featured_playlists.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[150ms]">
                <SectionHeader title="Featured Playlists" />
                <Grid>
                  {exploreData.featured_playlists.map((item: any) => (
                    <Card 
                      key={item.uuid || item.id}
                      title={item.title}
                      subtitle={item.description || `${item.numberOfTracks || 0} tracks`}
                      image={getImageUrl(item)}
                      onClick={() => {}}
                      type="playlist"
                    />
                  ))}
                </Grid>
              </section>
            )}

            {exploreData?.sections?.map((section: any, idx: number) => (
              <section key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[200ms]">
                <SectionHeader title={section.title} />
                <Grid>
                  {section.items.map((item: any, i: number) => (
                    <Card 
                      key={item.id || item.uuid || i}
                      title={item.title || item.name}
                      subtitle={item.artist?.name || item.artists?.[0]?.name || item.artist}
                      image={getImageUrl(item)}
                      onClick={() => {
                        if (section.type === 'TRACK') {
                          play(mapItemToTrack(item));
                        }
                      }}
                      type={section.type === 'ARTIST_LIST' ? 'artist' : 'album'}
                    />
                  ))}
                </Grid>
              </section>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-black text-white">
      {/* Fixed Header Tabs */}
      <div className="flex items-center gap-10 px-10 py-8 border-b border-white/5 bg-black/80 backdrop-blur-xl z-20 sticky top-0">
        <div className="relative">
          <button
            className={cn(
              "text-3xl font-black tracking-tight transition-all duration-300",
              activeTab === 'home' ? "text-white scale-100" : "text-white/20 hover:text-white/40 scale-95"
            )}
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          {activeTab === 'home' && (
            <motion.div 
              layoutId="homeTabUnderline"
              className="absolute -bottom-2 left-0 right-0 h-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" 
            />
          )}
        </div>
        <div className="relative">
          <button
            className={cn(
              "text-3xl font-black tracking-tight transition-all duration-300",
              activeTab === 'explore' ? "text-white scale-100" : "text-white/20 hover:text-white/40 scale-95"
            )}
            onClick={() => setActiveTab('explore')}
          >
            Explore
          </button>
          {activeTab === 'explore' && (
            <motion.div 
              layoutId="homeTabUnderline"
              className="absolute -bottom-2 left-0 right-0 h-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" 
            />
          )}
        </div>
      </div>

      <ScrollArea className="h-full custom-scrollbar">
        <div className="p-8 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'explore' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'explore' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'home' ? renderHome() : renderExplore()}
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
