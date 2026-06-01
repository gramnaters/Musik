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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { ChevronRight, ChevronLeft, Loader2, Play, Music, Disc, Users, ListMusic, Globe, MoreHorizontal } from 'lucide-react';
import type { Track, Album, Playlist } from '@/types/music';
import { Button } from '@/components/ui/button';
import { addonTrackToTrack } from '@/lib/addon-track-map';
import { trackListenDedupeKey } from '@/lib/track-identity';
import { toast } from '@/hooks/use-toast';
import { resolveAssetUrl, proxiedRemoteUrl } from '@/lib/resolve-asset-url';
import { mapMetadataSearchTrack } from '@/lib/map-metadata-track';

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
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-x-4 gap-y-8">
      {children}
    </div>
  );
}

function Card({ 
  title, 
  subtitle, 
  image, 
  onClick, 
  type = 'album',
  onMenuPlay,
  onMenuAddToQueue,
  onMenuAddToPlaylist,
  menuPlaylists,
}: { 
  title: string; 
  subtitle?: string; 
  image?: string; 
  onClick: () => void;
  type?: 'album' | 'playlist' | 'artist' | 'track';
  onMenuPlay?: () => void;
  onMenuAddToQueue?: () => void;
  onMenuAddToPlaylist?: (playlistId: string) => void;
  menuPlaylists?: Playlist[];
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
        {type !== 'artist' && (onMenuPlay || onMenuAddToPlaylist) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
              >
                <MoreHorizontal size={16} className="text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border border-white/10" onClick={(e) => e.stopPropagation()}>
              {onMenuPlay && <DropdownMenuItem onClick={onMenuPlay}>Play</DropdownMenuItem>}
              {onMenuAddToQueue && <DropdownMenuItem onClick={onMenuAddToQueue}>Add to Queue</DropdownMenuItem>}
              {(onMenuPlay || onMenuAddToQueue) && <DropdownMenuSeparator className="bg-white/10" />}
              {onMenuAddToPlaylist && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Add to Playlist</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-64 overflow-y-auto bg-zinc-900 border border-white/10">
                    {(menuPlaylists || []).map((pl) => (
                      <DropdownMenuItem key={pl.id} onClick={() => onMenuAddToPlaylist(pl.id)}>
                        {pl.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
  const [collectionHub, setCollectionHub] = useState<{
    id: string;
    title: string;
    subtitle?: string;
    image?: string;
    tracks: Track[];
    loading: boolean;
    addonId?: string;
  } | null>(null);
  
  const { play, addToQueue } = usePlayerStore();
  const { recentlyPlayed, playlists: myPlaylists, addToPlaylist, addRecentlyPlayed } = useLibraryStore();
  const { playerTheme, setSelectedPlaylistId } = useUIStore();

  const { getHome } = useAddonStore();
  const { catalogProvider, appleStorefront } = useMetadataStore();

  const getImageUrl = (item: any) => {
    if (!item) return '';
    let uuid = item.squareImage || item.image || item.picture || item.album?.cover || item.cover || item.artworkURL;
    if (typeof uuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      return `/api/cover?id=${uuid}&size=640`;
    }
    
    let resolved = typeof uuid === 'string' ? uuid : '';
    if (item.addonId && resolved) {
      const addon = useAddonStore.getState().addons.find(a => a.manifest.id === item.addonId);
      const baseURL = addon?.manifest.baseURL || '';
      const resUrl = resolveAssetUrl(resolved, baseURL) || resolved;
      if (resUrl && /^https?:\/\//i.test(resUrl)) {
        return proxiedRemoteUrl(resUrl);
      }
      return resUrl;
    }
    return resolved;
  };

  const mapItemToTrack = (item: any): Track => {
    if (item.addonId) {
      const track = addonTrackToTrack(item);
      track.albumCover = getImageUrl(item);
      return track;
    }
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

  const loadCollection = async (item: any, type: 'album' | 'playlist' | 'artist') => {
    setGenreHub(null);
    setCollectionHub({
      id: item.id || item.uuid,
      title: item.title || item.name || 'Collection',
      subtitle: item.artist?.name || item.artists?.[0]?.name || item.artist || '',
      image: getImageUrl(item),
      tracks: [],
      loading: true,
      addonId: item.addonId
    });

    try {
      let tracks: Track[] = [];
      const addonId = item.addonId;

      if (addonId) {
        const store = useAddonStore.getState();
        let raw: any[] = [];
        if (type === 'album') {
          raw = await store.getAlbumTracksForAddon(addonId, item.id || item.uuid);
        } else if (type === 'playlist') {
          raw = await store.getPlaylistTracksForAddon(addonId, item.id || item.uuid);
        } else if (type === 'artist') {
          raw = await store.getArtistTracksForAddon(addonId, item.id || item.uuid);
        }
        if (raw) {
          raw.forEach(t => { t.addonId = addonId; });
          tracks = raw.map(mapItemToTrack);
        }
      } else {
        // Standard metadata proxy
        const params = new URLSearchParams({ 
          id: item.id || item.uuid, 
          provider: catalogProvider,
          title: item.title || item.name || '',
          artist: item.artist?.name || item.artists?.[0]?.name || item.artist || '',
          country: appleStorefront || 'US',
          type: type === 'artist' ? 'album' : type,
        });
        const res = await fetch(`/api/metadata/playlist-items?${params}`);
        if (res.ok) {
          const data = await res.json();
          tracks = (data.tracks || []).map((x: any) => mapMetadataSearchTrack(x));
        }
      }

      setCollectionHub(h => h ? { ...h, tracks, loading: false } : null);
    } catch (e) {
      console.error('Failed to load collection tracks', e);
      toast({
        title: 'Failed to load collection',
        description: 'Unable to fetch tracks. Please check connection and settings.',
        variant: 'destructive'
      });
      setCollectionHub(null);
    }
  };

  const fetchExplore = useCallback(async () => {
    setExploreLoading(true);
    try {
      if (catalogProvider === 'addon') {
        const data = await getHome();
        if (data) {
          setExploreData({
            top_tracks: data.tracks || [],
            top_albums: data.albums || [],
            featured_playlists: data.playlists || [],
            sections: data.artists ? [
              {
                title: 'Trending Artists',
                type: 'ARTIST_LIST',
                items: data.artists
              }
            ] : []
          });
        } else {
          setExploreData({ top_tracks: [], top_albums: [], featured_playlists: [], sections: [] });
        }
        return;
      }

      const params = new URLSearchParams();
      if (catalogProvider === 'apple' || catalogProvider === 'spotify') {
        params.set('provider', catalogProvider);
        params.set('country', appleStorefront || 'US');
      }
      const res = await fetch(`/api/hot?${params}`);
      if (!res.ok) {
        let detail = '';
        try { const e = await res.json(); detail = e.error || `HTTP ${res.status}`; } catch { detail = `HTTP ${res.status}`; }
        throw new Error(detail);
      }
      const data = await res.json();
      setExploreData(data);
    } catch (e) {
      console.error('Failed to fetch explore data', e);
    } finally {
      setExploreLoading(false);
    }
  }, [catalogProvider, getHome, appleStorefront]);

  useEffect(() => {
    if (!exploreData) {
      fetchExplore();
    }
  }, [exploreData, fetchExplore]);

  const loadGenre = async (id: string, name: string) => {
    setCollectionHub(null);
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

  const handleQuickPlayItem = useCallback(async (item: any) => {
    try {
      const params = new URLSearchParams({
        id: item.id || item.uuid,
        provider: catalogProvider,
        title: item.title || item.name || '',
        artist: item.artist?.name || item.artists?.[0]?.name || item.artist || '',
        country: appleStorefront || 'US',
        type: 'album',
      });
      const res = await fetch(`/api/metadata/playlist-items?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const tracks = (data.tracks || []).map((x: any) => mapMetadataSearchTrack(x));
      if (tracks.length > 0) {
        play(tracks[0], tracks, 0);
        tracks.forEach((t: Track) => addRecentlyPlayed(t));
      }
    } catch (e) {
      console.error('Failed to quick play item', e);
    }
  }, [catalogProvider, appleStorefront, play, addRecentlyPlayed]);

  const handleAddItemToQueue = useCallback(async (item: any) => {
    try {
      const params = new URLSearchParams({
        id: item.id || item.uuid,
        provider: catalogProvider,
        title: item.title || item.name || '',
        artist: item.artist?.name || item.artists?.[0]?.name || item.artist || '',
        country: appleStorefront || 'US',
        type: 'album',
      });
      const res = await fetch(`/api/metadata/playlist-items?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const tracks = (data.tracks || []).map((x: any) => mapMetadataSearchTrack(x));
      tracks.forEach((t: Track) => addToQueue(t));
    } catch (e) {
      console.error('Failed to add item to queue', e);
    }
  }, [catalogProvider, appleStorefront, addToQueue]);

  const handleAddItemToPlaylist = useCallback(async (item: any, playlistId: string) => {
    try {
      const params = new URLSearchParams({
        id: item.id || item.uuid,
        provider: catalogProvider,
        title: item.title || item.name || '',
        artist: item.artist?.name || item.artists?.[0]?.name || item.artist || '',
        country: appleStorefront || 'US',
        type: 'album',
      });
      const res = await fetch(`/api/metadata/playlist-items?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const tracks = (data.tracks || []).map((x: any) => mapMetadataSearchTrack(x));
      tracks.forEach((t: Track) => addToPlaylist(playlistId, t));
    } catch (e) {
      console.error('Failed to add item to playlist', e);
    }
  }, [catalogProvider, appleStorefront, addToPlaylist]);

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
          {exploreData?.top_tracks?.length > 0 || exploreData?.top_albums?.length > 0 ? (
            <div className="space-y-8">
              {exploreData.top_tracks?.length > 0 && (
                <div className="bg-zinc-900/20 rounded-2xl border border-white/5 p-2">
                  <TrackList
                    tracks={exploreData.top_tracks.slice(0, 5).map(mapItemToTrack)}
                    showAlbumArt
                    showIndex
                  />
                </div>
              )}
              {exploreData.top_albums?.length > 0 && (
                <Grid>
                  {exploreData.top_albums.slice(0, 5).map((item: any) => (
                    <Card
                      key={item.id}
                      title={item.title}
                      subtitle={item.artist?.name || item.artist}
                      image={getImageUrl(item)}
                      onClick={() => loadCollection(item, 'album')}
                      onMenuPlay={() => handleQuickPlayItem(item)}
                      onMenuAddToQueue={() => handleAddItemToQueue(item)}
                      onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                      menuPlaylists={myPlaylists}
                    />
                  ))}
                </Grid>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5 group hover:border-white/10 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ListMusic className="text-white/20" size={32} />
              </div>
              <p className="text-white font-semibold mb-1">Personalized Mixes</p>
              <p className="text-white/40 text-sm max-w-xs text-center">
                {catalogProvider === 'spotify'
                  ? 'Configure a Spotify token in Settings &gt; Instances to enable recommendations.'
                  : catalogProvider === 'addon'
                    ? 'Install an addon with home feed support to see curated content here.'
                    : 'Trending content unavailable right now. Check your connection and try again.'}
              </p>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderExplore = () => {
    if (collectionHub) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full bg-white/5 hover:bg-white/10 shrink-0"
              onClick={() => setCollectionHub(null)}
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold truncate">{collectionHub.title}</h1>
              {collectionHub.subtitle && (
                <p className="text-sm text-white/40">{collectionHub.subtitle}</p>
              )}
            </div>
          </div>

          {collectionHub.loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-white/20" size={40} />
              <p className="text-white/20 text-sm font-medium">Gathering collection tracks...</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
                {collectionHub.image && (
                  <div className="relative group w-48 h-48 md:w-56 md:h-56 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/5">
                    <img 
                      src={collectionHub.image} 
                      alt={collectionHub.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/placeholder.png';
                      }}
                    />
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-primary font-bold">Collection</p>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">{collectionHub.title}</h2>
                    {collectionHub.subtitle && (
                      <p className="text-white/60 text-lg font-medium">{collectionHub.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {collectionHub.tracks.length > 0 && (
                      <Button
                        onClick={() => play(collectionHub.tracks[0], collectionHub.tracks, 0)}
                        className="rounded-full h-12 px-6 font-bold flex items-center gap-2 bg-primary text-black hover:scale-102 transition-transform shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                      >
                        <Play size={18} fill="currentColor" />
                        Play All
                      </Button>
                    )}
                    <span className="text-sm text-white/30 font-medium">
                      {collectionHub.tracks.length} {collectionHub.tracks.length === 1 ? 'track' : 'tracks'}
                    </span>
                  </div>
                </div>
              </div>

              {!collectionHub.tracks.length && (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-3xl border border-white/5">
                  <Music className="text-white/10 mb-4" size={48} />
                  <p className="text-white/50 font-medium">No tracks found inside this collection</p>
                </div>
              )}

              {collectionHub.tracks.length > 0 && (
                <div className="bg-zinc-900/20 rounded-2xl border border-white/5 p-2">
                  <TrackList 
                    tracks={collectionHub.tracks} 
                    showAlbumArt 
                    showIndex 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

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
                            } else if (section.type === 'ARTIST') {
                              loadCollection(item, 'artist');
                            } else {
                              loadCollection(item, 'album');
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
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6">
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
            {exploreData?.top_tracks && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
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

            {(() => {
              const artistMap = new Map<string, any>();
              (exploreData.top_tracks || []).forEach((t: any) => {
                const a = t.artist;
                const name = typeof a === 'string' ? a : a?.name || t.artists?.[0]?.name;
                if (name && !artistMap.has(name)) {
                  artistMap.set(name, {
                    id: t.artists?.[0]?.id || name,
                    name,
                    image: t.albumCover || '',
                    artist: { name },
                  });
                }
              });
              const topArtists = [...artistMap.values()].slice(0, 10);
              return topArtists.length > 0 ? (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[50ms]">
                  <SectionHeader title="Top Artists" />
                  <Grid>
                    {topArtists.map((item: any) => (
                      <Card
                        key={item.id}
                        title={item.name}
                        image={item.image}
                        onClick={() => loadCollection(item, 'artist')}
                        type="artist"
                      />
                    ))}
                  </Grid>
                </section>
              ) : null;
            })()}

            {exploreData?.top_albums && exploreData.top_albums.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[100ms]">
                <SectionHeader title="Trending Albums" />
                <Grid>
                  {exploreData.top_albums.map((item: any) => (
                    <Card 
                      key={item.id}
                      title={item.title}
                      subtitle={item.artist?.name || item.artists?.[0]?.name || item.artist}
                      image={getImageUrl(item)}
                      onClick={() => loadCollection(item, 'album')}
                      onMenuPlay={() => handleQuickPlayItem(item)}
                      onMenuAddToQueue={() => handleAddItemToQueue(item)}
                      onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                      menuPlaylists={myPlaylists}
                    />
                  ))}
                </Grid>
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
                      subtitle={item.description || `${item.trackCount || item.numberOfTracks || 0} tracks`}
                      image={getImageUrl(item)}
                      onClick={() => loadCollection(item, 'playlist')}
                      type="playlist"
                      onMenuPlay={() => handleQuickPlayItem(item)}
                      onMenuAddToQueue={() => handleAddItemToQueue(item)}
                      onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                      menuPlaylists={myPlaylists}
                    />
                  ))}
                </Grid>
              </section>
            )}

            {exploreData?.sections?.map((section: any, idx: number) => (
              <section key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[200ms]">
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
                        key={item.id || item.uuid || i}
                        title={item.title || item.name}
                        subtitle={item.artist?.name || item.artists?.[0]?.name || item.artist}
                        image={getImageUrl(item)}
                        onClick={() => {
                          if (section.type === 'TRACK' || !section.type) {
                            play(mapItemToTrack(item));
                          } else if (section.type === 'ARTIST_LIST') {
                            loadCollection(item, 'artist');
                          } else {
                            loadCollection(item, section.type === 'PLAYLIST_LIST' ? 'playlist' : 'album');
                          }
                        }}
                        type={
                          section.type === 'ARTIST_LIST' ? 'artist' :
                          section.type === 'PLAYLIST_LIST' ? 'playlist' : 'album'
                        }
                        onMenuPlay={section.type !== 'ARTIST_LIST' ? () => handleQuickPlayItem(item) : undefined}
                        onMenuAddToQueue={section.type !== 'ARTIST_LIST' ? () => handleAddItemToQueue(item) : undefined}
                        onMenuAddToPlaylist={section.type !== 'ARTIST_LIST' ? (pid) => handleAddItemToPlaylist(item, pid) : undefined}
                        menuPlaylists={section.type !== 'ARTIST_LIST' ? myPlaylists : undefined}
                      />
                    ))}
                  </Grid>
                )}
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
        <div className="p-8 pb-44">
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
