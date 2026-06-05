'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { useAddonStore } from '@/stores/addonStore';
import { useMetadataStore } from '@/stores/metadataStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlayButton from '@/components/shared/PlayButton';
import TrackList from '@/components/shared/TrackList';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { ChevronRight, ChevronLeft, Loader2, Play, Music, Disc, Users, ListMusic, Globe, MoreHorizontal, RotateCw, Trash2, Heart, Search, X, Volume2, Check, ChevronDown, ListPlus } from 'lucide-react';
import type { Track, Album, Playlist } from '@/types/music';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addonTrackToTrack } from '@/lib/addon-track-map';
import { trackListenDedupeKey } from '@/lib/track-identity';
import { toast } from '@/hooks/use-toast';
import { resolveAssetUrl, proxiedRemoteUrl } from '@/lib/resolve-asset-url';
import { mapMetadataSearchTrack } from '@/lib/map-metadata-track';
import { extractVibrantColor, applyVibrantColor, resetVibrantColor } from '@/lib/vibrant-color';
import { getArtistBanner } from '@/lib/artist-banner';
import { getArtist, getArtistBio } from '@/lib/monochrome';
import Hls from 'hls.js';
import { formatDuration } from '@/lib/demo-data';

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
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">{title}</h2>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="text-xs font-semibold text-white/40 hover:text-white transition-colors"
        >
          See all
        </button>
      )}
    </div>
  );
}

function Grid({ children, minSize = '200px' }: { children: React.ReactNode; minSize?: string }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minSize}, 1fr))` }}>
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
  badges,
  isLiked,
  onToggleLike,
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
  badges?: { explicit?: boolean; quality?: string };
  isLiked?: boolean;
  onToggleLike?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="group cursor-pointer rounded-lg p-4 bg-white/[0.03] border border-transparent hover:bg-white/[0.06] hover:border-white/10 hover:shadow-lg transition-all duration-300"
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className={cn(
        "relative mb-4 overflow-hidden rounded-lg shadow-md group-hover:shadow-xl transition-shadow duration-300",
        type === 'artist' ? "rounded-full aspect-square" : "aspect-square"
      )}>
        {image ? (
          <img
            src={image}
            alt={title}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
              type === 'artist' ? "rounded-full" : "rounded-lg"
            )}
            loading="lazy"
          />
        ) : (
          <div className={cn(
            "w-full h-full bg-zinc-900 flex items-center justify-center",
            type === 'artist' ? "rounded-full" : ""
          )}>
            {type === 'artist' ? <Users className="text-white/20" size={32} /> :
             type === 'album' ? <Disc className="text-white/20" size={32} /> :
             <Music className="text-white/20" size={32} />}
          </div>
        )}
        {/* Play button - bottom right, 42px circle like Monochrome */}
        {type !== 'artist' && (
          <button
            type="button"
            className="absolute bottom-[2%] right-[2%] w-[42px] h-[42px] rounded-full bg-white/[0.87] text-black flex items-center justify-center opacity-0 translate-y-2.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-20 border-0 shadow-md hover:scale-110 hover:shadow-lg"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title="Play"
          >
            <Play size={20} fill="currentColor" className="ml-0.5" />
          </button>
        )}
        {/* Like button - top right, 32px circle */}
        {type !== 'artist' && onToggleLike && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
            className="absolute right-[2%] top-[2%] w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-10 border border-white/10 hover:bg-black/70"
            title={isLiked ? 'Remove from Liked' : 'Add to Liked'}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-red-500' : 'text-white'} />
          </button>
        )}
        {/* Menu button - top left, 32px circle */}
        {type !== 'artist' && (onMenuPlay || onMenuAddToPlaylist) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="absolute left-[2%] top-[2%] w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-10 border border-white/10 text-white hover:bg-black/70 hover:rotate-12"
                title="Menu"
              >
                <MoreHorizontal size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-52 bg-zinc-900 border border-white/10" onClick={(e) => e.stopPropagation()}>
              {onMenuPlay && <DropdownMenuItem onClick={onMenuPlay}><Play size={14} className="mr-2" />Play</DropdownMenuItem>}
              {onMenuAddToQueue && <DropdownMenuItem onClick={onMenuAddToQueue}>Add to Queue</DropdownMenuItem>}
              {(onMenuPlay || onMenuAddToQueue) && <DropdownMenuSeparator className="bg-white/10" />}
              {onToggleLike && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleLike(); }}><Heart size={14} className="mr-2" />{isLiked ? 'Remove from Liked' : 'Add to Liked'}</DropdownMenuItem>}
              <DropdownMenuItem onClick={onClick}>View Details</DropdownMenuItem>
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
        "font-semibold mb-1 truncate text-white",
        type === 'artist' && "text-center"
      )}>
        {title}
        {badges?.explicit && (
          <span className="inline-block bg-white/[0.1] text-white/60 text-[0.6rem] font-bold px-1 py-0.5 rounded-[2px] ml-1.5 align-middle">E</span>
        )}
        {badges?.quality === 'HI_RES_LOSSLESS' && (
          <span className="inline-block border border-white/20 text-white/60 text-[0.6rem] font-bold px-1 py-0.5 rounded-[2px] ml-1 align-middle">HD</span>
        )}
      </p>
      {subtitle && (
        <p className={cn(
          "text-[0.9rem] text-white/40 truncate",
          type === 'artist' && "text-center"
        )}>{subtitle}</p>
      )}
    </motion.div>
  );
}

export default function HomeView() {
  const [activeTab, setActiveTab] = useState<'home' | 'explore'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ tracks: any[]; albums: any[]; artists: any[]; playlists: any[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTab, setSearchTab] = useState<'tracks' | 'albums' | 'artists' | 'playlists'>('tracks');
  const [searchHub, setSearchHub] = useState<{ title: string; subtitle?: string; tracks: Track[]; loading: boolean; coverUrl?: string } | null>(null);
  const [artistBannerVideo, setArtistBannerVideo] = useState<string | null>(null);
  const [showFullBio, setShowFullBio] = useState(false);
  const artistVideoRef = useRef<HTMLVideoElement | null>(null);
  const artistHlsRef = useRef<Hls | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exploreData, setExploreData] = useState<any>(null);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [editorsPicks, setEditorsPicks] = useState<any[] | null>(null);
  const [editorsPicksLoading, setEditorsPicksLoading] = useState(false);
  const [recommendedAlbums, setRecommendedAlbums] = useState<any[]>([]);
  const [recommendedAlbumsLoading, setRecommendedAlbumsLoading] = useState(false);
  const [recommendedArtists, setRecommendedArtists] = useState<any[]>([]);
  const [recommendedArtistsLoading, setRecommendedArtistsLoading] = useState(false);
  const [recommendedTracks, setRecommendedTracks] = useState<any[]>([]);
  const [recommendedTracksLoading, setRecommendedTracksLoading] = useState(false);
  const [genreHub, setGenreHub] = useState<{ id: string; name: string; data?: any; loading: boolean } | null>(null);
  const [collectionHub, setCollectionHub] = useState<{
    id: string;
    title: string;
    subtitle?: string;
    image?: string;
    tracks: Track[];
    loading: boolean;
    addonId?: string;
    meta?: string;
    copyright?: string;
    artistAlbums?: any[];
    artistEPs?: any[];
    similarAlbums?: any[];
    similarArtists?: any[];
    isArtist?: boolean;
    artistBio?: string;
    artistPopularity?: number;
    artistSocialLinks?: { name: string; url: string }[];
  } | null>(null);
  
  const { play, addToQueue, currentTrack, isPlaying } = usePlayerStore();
  const { recentlyPlayed, playlists: myPlaylists, addToPlaylist, addRecentlyPlayed, toggleFavourite, favourites, createPlaylist } = useLibraryStore();
  const { playerTheme, setSelectedPlaylistId } = useUIStore();
  const { startDownload } = useDownloadStore();

  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const createAndAddPlaylist = () => {
    if (!newPlaylistName.trim() || !collectionHub) return;
    const pl = createPlaylist(newPlaylistName.trim());
    collectionHub.tracks.forEach((t: Track) => addToPlaylist(pl.id, t));
    setNewPlaylistName('');
    setCreatePlaylistOpen(false);
  };

  const { getHome } = useAddonStore();
  const { catalogProvider, appleStorefront, setCatalogProvider } = useMetadataStore();
  const { addons: installedAddons, playbackPriorityIds, activeAddonId, setActiveAddon } = useAddonStore();

  const jumpBackItems = useMemo(() => {
    const items = recentlyPlayed.slice(0, 6).map((t) => ({ ...t, _kind: 'track' as const }));
    const seed = items.map((t) => t.id).join(',');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const seeded = [...items];
    for (let i = seeded.length - 1; i > 0; i--) {
      hash = (hash * 16807 + 0) % 2147483647;
      const j = ((hash % (i + 1)) + i + 1) % (i + 1);
      [seeded[i], seeded[j]] = [seeded[j], seeded[i]];
    }
    return seeded.slice(0, 6);
  }, [recentlyPlayed.map((t) => t.id).join(',')]);

  const searchAddons = useMemo(() => {
    if (!installedAddons || installedAddons.length === 0) return [];
    const priority = playbackPriorityIds ?? [];
    return installedAddons
      .filter(a => a.enabled && a.manifest.resources?.includes?.('search'))
      .sort((a, b) => {
        const ai = priority.indexOf(a.manifest.id);
        const bi = priority.indexOf(b.manifest.id);
        if (ai === -1 && bi === -1) return a.manifest.name.localeCompare(b.manifest.name);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
  }, [installedAddons, playbackPriorityIds]);

  const getImageUrl = (item: any, size = '640') => {
    if (!item) return '';
    let rawValue = item.squareImage || item.picture || item.cover || item.image || item.albumCover || item.album?.cover || item.artworkURL;
    let uuid: string | null = null;
    if (!rawValue) {
      uuid = null;
    } else if (typeof rawValue === 'string') {
      uuid = rawValue;
    } else if (rawValue.uuid) {
      uuid = rawValue.uuid;
    } else if (rawValue.id) {
      uuid = rawValue.id;
    } else if (rawValue.cover) {
      uuid = rawValue.cover;
    }
    if (typeof uuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      return `/api/cover?id=${uuid}&size=${size}`;
    }
    if (typeof uuid === 'string' && (uuid.startsWith('/api/cover') || uuid.includes('cover?id='))) {
      return uuid;
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
    const img = getImageUrl(item);
    setCollectionHub({
      id: item.id || item.uuid,
      title: item.title || item.name || 'Collection',
      subtitle: item.artist?.name || item.artists?.[0]?.name || item.artist || (type === 'artist' ? '' : ''),
      image: img,
      tracks: [],
      loading: true,
      addonId: item.addonId,
      meta: '',
      copyright: '',
      artistAlbums: [],
      artistEPs: [],
      isArtist: type === 'artist',
      artistAlbums: [],
      artistEPs: [],
    });

    if (img && typeof window !== 'undefined') {
      extractVibrantColor(img).then((color) => {
        if (color) applyVibrantColor(color);
      });
    } else {
      resetVibrantColor();
    }

    try {
      let tracks: Track[] = [];
      let albumMeta: any = {};
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
      } else if (type === 'album') {
        // Use album detail endpoint for full metadata
        const albumId = item.id || item.uuid;
        const res = await fetch(`/api/metadata/album?id=${encodeURIComponent(albumId)}&provider=${catalogProvider}&country=${appleStorefront || 'us'}`);
        if (res.ok) {
          const data = await res.json();
          albumMeta = data.album || {};
          tracks = (data.tracks || []).map((x: any) => mapMetadataSearchTrack(x));
        }
      } else if (type === 'artist') {
        const artistName = item.title || item.name || '';
        const sp = new URLSearchParams({
          q: artistName,
          provider: catalogProvider === 'addon' ? 'monochrome' : catalogProvider,
          country: appleStorefront || 'US', type: 'track', limit: '25',
        });
        const ares = await fetch(`/api/metadata/search?${sp}`);
        if (ares.ok) {
          const adata = await ares.json();
          tracks = (adata.tracks || adata.items || []).map((x: any) => mapMetadataSearchTrack(x));
        }
      } else {
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

      // Build meta string: "May 29, 2026 • 18 tracks • 55 min"
      let metaStr = '';
      if (albumMeta.releaseDate) {
        const d = new Date(albumMeta.releaseDate);
        metaStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      if (albumMeta.numberOfTracks) {
        metaStr += metaStr ? ` • ${albumMeta.numberOfTracks} tracks` : `${albumMeta.numberOfTracks} tracks`;
      }
      if (albumMeta.duration) {
        const mins = Math.floor(albumMeta.duration / 60);
        metaStr += ` • ${mins} min`;
      }

      setCollectionHub(h => h ? { ...h, tracks, loading: false, meta: metaStr, copyright: albumMeta.copyright || '' } : null);

      // Fetch artist banner video
      if (type === 'artist') {
        const artistName = item.title || item.name || '';
        getArtistBanner(artistName).then(url => {
          if (url) setArtistBannerVideo(url);
        }).catch(() => {});
      } else {
        setArtistBannerVideo(null);
      }

      // Fetch artist details (popularity, bio, social) for Monochrome-style header
      if (type === 'artist') {
        const artistId = String(item.id || item.uuid || '').replace(/^(mono_|spotify_artist_|spotify_)/, '');
        if (artistId) {
          getArtist(artistId).then(data => {
            if (data) {
              const links = data.socialLinks || data.urls || data.links || [];
              setCollectionHub(h => h ? { ...h, artistPopularity: data.popularity ?? data.followers, artistSocialLinks: Array.isArray(links) ? links : [] } : null);
            }
          }).catch(() => {});
          getArtistBio(artistId).then(bio => {
            if (bio) setCollectionHub(h => h ? { ...h, artistBio: String(bio) } : null);
          }).catch(() => {});
        }
        setShowFullBio(false);
        // Fetch social links from MusicBrainz
        const artistName = item.title || item.name || '';
        if (artistName) {
          fetch(`https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(artistName)}&fmt=json&limit=1`, {
            headers: { 'User-Agent': 'Musik/1.0' }
          }).then(r => r.ok ? r.json() : null).then(async data => {
            if (data?.artists?.length) {
              const mbid = data.artists[0].id;
              const relRes = await fetch(`https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`, {
                headers: { 'User-Agent': 'Musik/1.0' }
              });
              if (relRes.ok) {
                const relData = await relRes.json();
                const allowedTypes = ['social network', 'streaming', 'official homepage', 'youtube', 'soundcloud', 'bandcamp'];
                const links = (relData.relations || [])
                  .filter((r: any) => allowedTypes.includes(r.type))
                  .map((r: any) => ({ name: r.type, url: r.url?.resource || '' }))
                  .filter((l: any) => l.url && !l.url.includes('tidal.com'));
                if (links.length) setCollectionHub(h => h ? { ...h, artistSocialLinks: links } : null);
              }
            }
          }).catch(() => {});
        }
      }

      // Fetch similar albums, artists, and artist's other albums/EPs
      if ((type === 'album' || type === 'playlist' || type === 'artist') && !addonId) {
        const artistId = type === 'artist' ? (item.id || item.uuid) : (item.artist?.id || item.artists?.[0]?.id || item.artistId || albumMeta.artistId || albumMeta.artist?.id);
        const albumId = item.id || item.uuid;
        
        if (artistId) {
          // Artist's more albums & EPs - try Monochrome artist API first, fall back to catalog search
          const artistName = item.artist?.name || item.artists?.[0]?.name || collectionHub?.subtitle || '';
          fetch(`/api/metadata/artist/albums?id=${encodeURIComponent(artistId)}&provider=${catalogProvider}&country=${appleStorefront || 'us'}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              const albums = data?.albums || [];
              const eps = data?.eps || [];
              // If Monochrome returned nothing, try catalog search
              if (albums.length === 0 && eps.length === 0 && artistName) {
                const sp = new URLSearchParams({ provider: catalogProvider, country: appleStorefront || 'US', q: artistName, limit: '30' });
                return fetch(`/api/metadata/search?${sp}`).then(r => r.ok ? r.json() : null).then(sData => {
                  const sTracks = (sData?.tracks || []).filter((t: any) => t.album && t.albumCover);
                  const seen = new Map<string, any>();
                  for (const t of sTracks) {
                    if (!t.album || seen.has(t.album)) continue;
                    seen.set(t.album, { id: t.albumId || `alb_${t.album}`, title: t.album, artist: t.artist, cover: t.albumCover, releaseDate: t.releaseDate || t.year });
                  }
                  return { albums: [...seen.values()], eps: [] };
                });
              }
              return { albums, eps };
            })
            .then(data => {
              if (data) {
                setCollectionHub(h => h ? { ...h, artistAlbums: data.albums || [], artistEPs: data.eps || [] } : null);
              }
            })
            .catch(() => {});

          // Similar artists
          fetch(`/api/metadata/artist/similar?id=${encodeURIComponent(artistId)}&provider=${catalogProvider}&country=${appleStorefront || 'us'}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              setCollectionHub(h => h ? { ...h, similarArtists: data?.artists || [] } : null);
            })
            .catch(() => {});
        }
        if (albumId) {
          fetch(`/api/metadata/album/similar?id=${encodeURIComponent(albumId)}&provider=${catalogProvider}&country=${appleStorefront || 'us'}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              setCollectionHub(h => h ? { ...h, similarAlbums: data?.albums || [] } : null);
            })
            .catch(() => {});
        }
      }
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
  }, [catalogProvider, appleStorefront]);

  const fetchEditorsPicks = useCallback(async () => {
    setEditorsPicksLoading(true);
    try {
      const res = await fetch('https://monochrome.tf/editors-picks.json');
      if (res.ok) {
        const data = await res.json();
        setEditorsPicks(data);
      }
    } catch (e) {
      console.error('Failed to fetch editors picks', e);
    } finally {
      setEditorsPicksLoading(false);
    }
  }, []);

  const fetchRecommendedAlbums = useCallback(async (seedAlbumId: string) => {
    setRecommendedAlbumsLoading(true);
    try {
      const provider = catalogProvider === 'addon' ? 'monochrome' : catalogProvider;
      const res = await fetch(`/api/metadata/album/similar?id=${seedAlbumId}&provider=${provider}&country=${appleStorefront || 'us'}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendedAlbums(data.albums?.slice(0, 12) || []);
      }
    } catch (e) {
      console.error('Failed to fetch recommended albums:', e);
    } finally {
      setRecommendedAlbumsLoading(false);
    }
  }, []);

  const fetchRecommendedArtists = useCallback(async (seedArtistId: string) => {
    setRecommendedArtistsLoading(true);
    try {
      const provider = catalogProvider === 'addon' ? 'monochrome' : catalogProvider;
      const res = await fetch(`/api/metadata/artist/similar?id=${seedArtistId}&provider=${provider}&country=${appleStorefront || 'us'}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendedArtists(data.artists?.slice(0, 12) || []);
      }
    } catch (e) {
      console.error('Failed to fetch recommended artists:', e);
    } finally {
      setRecommendedArtistsLoading(false);
    }
  }, []);

  const fetchRecommendedTracks = useCallback(async () => {
    setRecommendedTracksLoading(true);
    try {
      const seedArtist = recentlyPlayed[0]?.artist || recentlyPlayed[0]?.artists?.[0]?.name || 'recent';
      const params = new URLSearchParams();
      params.set('provider', catalogProvider === 'addon' ? 'monochrome' : catalogProvider);
      params.set('type', 'track');
      params.set('q', seedArtist);
      params.set('limit', '10');
      if (catalogProvider === 'apple' || catalogProvider === 'spotify') {
        params.set('country', appleStorefront || 'US');
      }
      const res = await fetch(`/api/metadata/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.tracks || data.items || [];
        setRecommendedTracks(items.slice(0, 20));
      }
    } catch (e) {
      console.error('Failed to fetch recommended tracks:', e);
    } finally {
      setRecommendedTracksLoading(false);
    }
  }, [recentlyPlayed]);

  useEffect(() => {
    setExploreData(null);
  }, [catalogProvider]);

  useEffect(() => {
    if (!exploreData) {
      fetchExplore();
    }
  }, [exploreData, fetchExplore]);

  // HLS video banner for artist pages
  useEffect(() => {
    if (!artistBannerVideo || !artistVideoRef.current) return;
    const video = artistVideoRef.current;
    if (artistBannerVideo.endsWith('.m3u8') && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(artistBannerVideo);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      artistHlsRef.current = hls;
    } else {
      video.src = artistBannerVideo;
      video.play().catch(() => {});
    }
    return () => {
      if (artistHlsRef.current) { artistHlsRef.current.destroy(); artistHlsRef.current = null; }
    };
  }, [artistBannerVideo]);

  useEffect(() => {
    if (activeTab === 'home' && recentlyPlayed.length > 0) {
      const lastTrack = recentlyPlayed[0];
      const seedAlbumId = lastTrack?.album?.id;
      const seedArtistId = lastTrack?.artist?.id || lastTrack?.artists?.[0]?.id;
      if (seedAlbumId && recommendedAlbums.length === 0 && !recommendedAlbumsLoading) fetchRecommendedAlbums(seedAlbumId);
      if (seedArtistId && recommendedArtists.length === 0 && !recommendedArtistsLoading) fetchRecommendedArtists(seedArtistId);
      if (recommendedTracks.length === 0 && !recommendedTracksLoading) fetchRecommendedTracks();
    }
  }, [activeTab, recentlyPlayed, fetchRecommendedAlbums, fetchRecommendedArtists, fetchRecommendedTracks]);

  useEffect(() => {
    return () => {
      resetVibrantColor();
    };
  }, []);

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

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); setSearchLoading(false); return; }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('provider', catalogProvider);
      params.set('country', appleStorefront || 'US');
      params.set('q', q);
      params.set('limit', '30');
      params.set('bundle', '1');
      const res = await fetch(`/api/metadata/search-bundle?${params}`);
      if (res.ok) {
        const data = await res.json();
        const tracks = (data.tracks || []).map(mapMetadataSearchTrack);
        const albums = (data.albums || []).map((a: any) => ({
          id: a.id,
          title: a.title || '',
          artist: a.artist || '',
          cover: a.cover,
          year: a.year,
        }));
        const artists = (data.artists || []).map((a: any) => ({
          id: a.id,
          name: a.name || '',
          image: a.image || a.cover,
        }));
        const playlists = data.playlists || [];
        setSearchResults({ tracks, albums, artists, playlists });
      } else {
        setSearchResults({ tracks: [], albums: [], artists: [], playlists: [] });
      }
    } catch {
      setSearchResults({ tracks: [], albums: [], artists: [], playlists: [] });
    } finally {
      setSearchLoading(false);
    }
  }, [catalogProvider, appleStorefront]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.trim()) {
      resetVibrantColor();
      searchDebounceRef.current = setTimeout(() => doSearch(value), 400);
    } else {
      setSearchResults(null);
      setSearchHub(null);
      setGenreHub(null);
      setCollectionHub(null);
    }
  }, [doSearch]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchHub(null);
  };

  const openSearchHub = useCallback(async (item: any, kind: 'album' | 'playlist' | 'artist') => {
    const coverUrl = item.cover || item.image || item.picture;
    setSearchHub({ title: item.title || item.name || '', subtitle: item.artist || item.description || '', tracks: [], loading: true, coverUrl });
    if (coverUrl && typeof window !== 'undefined') {
      extractVibrantColor(coverUrl).then(c => { if (c) applyVibrantColor(c); });
    }
    try {
      let tracks: Track[] = [];
      if (kind === 'artist') {
        const artistName = item.title || item.name || '';
        const sp = new URLSearchParams({
          q: artistName,
          provider: catalogProvider === 'addon' ? 'monochrome' : catalogProvider,
          country: appleStorefront || 'US', type: 'track', limit: '25',
        });
        const res = await fetch(`/api/metadata/search?${sp}`);
        if (res.ok) {
          const data = await res.json();
          tracks = (data.tracks || data.items || []).map((x: any) => mapMetadataSearchTrack(x));
        }
      } else {
        const params = new URLSearchParams({ id: item.id, provider: catalogProvider, title: item.title || item.name || '', artist: item.artist || item.name || '', country: appleStorefront || 'US', type: kind === 'artist' ? 'album' : kind });
        const res = await fetch(`/api/metadata/playlist-items?${params}`);
        if (res.ok) {
          const data = await res.json();
          tracks = (data.tracks || []).map((x: any) => mapMetadataSearchTrack(x));
        }
      }
      setSearchHub(h => h ? { ...h, tracks, loading: false } : null);
    } catch {
      setSearchHub(h => h ? { ...h, tracks: [], loading: false } : null);
    }
  }, [catalogProvider, appleStorefront]);

const renderHome = () => {
    const recentDeduped = recentlyPlayed.slice(0, 12);
    const hasActivity = recentDeduped.length > 0 || myPlaylists.length > 0;

    const yearFromDate = (dateStr: string) => dateStr?.split('-')[0] || '';

    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        {/* Jump Back In */}
        {jumpBackItems.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Jump Back In</h2>
              <button
                className="text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
                onClick={() => { clearRecentlyPlayed(); }}
                title="Clear history"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <Grid minSize="180px">
              {jumpBackItems.slice(0, 6).map((item: any, idx: number) => (
                <Card
                  key={`${item._kind}-${item.id || idx}`}
                  title={item.title || item.name}
                  subtitle={item.artist}
                  image={item.albumCover && item.albumCover.startsWith('http') ? item.albumCover : item.albumCover ? `/api/cover?id=${item.albumCover}&size=640` : ''}
                  onClick={() => play(item)}
                  type="track"
                />
              ))}
            </Grid>
          </section>
        ) : (
          !recommendedTracksLoading && (
            <section className="flex flex-col items-center justify-center py-24 space-y-4 bg-zinc-900/20 rounded-3xl border border-dashed border-white/5">
              <Music className="text-white/10" size={40} />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-white/60">You haven't listened to anything yet.</h3>
                <p className="text-sm text-white/30 max-w-xs">Search for your favorite songs to get started!</p>
              </div>
            </section>
          )
        )}

        {/* Recommended Songs */}
        {recommendedTracks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Recommended Songs</h2>
              <button
                className="text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
                onClick={() => { setRecommendedTracks([]); fetchRecommendedTracks(); }}
                title="Refresh"
              >
                <RotateCw size={16} />
              </button>
            </div>
            <div className="bg-zinc-900/20 rounded-2xl border border-white/5 p-2">
              <TrackList
                tracks={recommendedTracks.slice(0, 10).map(mapItemToTrack)}
                showAlbumArt
                showIndex
              />
            </div>
          </section>
        )}

        {recommendedTracksLoading && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Recommended Songs</h2>
            </div>
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-8 h-8 bg-zinc-900 rounded animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-48 bg-zinc-900 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommended Albums */}
        {recommendedAlbums.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Recommended Albums</h2>
              <button
                className="text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
                onClick={() => { setRecommendedAlbums([]); const id = recentlyPlayed[0]?.album?.id || recentlyPlayed[0]?.id; if (id) fetchRecommendedAlbums(id); }}
                title="Refresh"
              >
                <RotateCw size={16} />
              </button>
            </div>
            <Grid minSize="200px">
              {recommendedAlbums.slice(0, 7).map((item: any) => (
                <Card
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.artist?.name || item.artists?.[0]?.name || item.artist || ''} • ${item.releaseDate ? yearFromDate(item.releaseDate) : ''}`}
                  image={getImageUrl(item, '1280')}
                  onClick={() => loadCollection(item, 'album')}
                  onMenuPlay={() => handleQuickPlayItem(item)}
                  onMenuAddToQueue={() => handleAddItemToQueue(item)}
                  onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                  menuPlaylists={myPlaylists}
                  badges={{ explicit: item.explicit, quality: item.audioQuality }}
                />
              ))}
            </Grid>
          </section>
        ) : recommendedAlbumsLoading ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Recommended Albums</h2>
              <button
                className="text-white/40 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/5"
                onClick={() => { const lastTrack = recentlyPlayed[0]; const id = lastTrack?.album?.id || lastTrack?.id; if (id) { setRecommendedAlbums([]); fetchRecommendedAlbums(id); } }}
                title="Refresh"
              >
                <RotateCw size={16} className="animate-spin" />
              </button>
            </div>
            <Grid minSize="200px">
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square bg-zinc-900 rounded-2xl animate-pulse" />
                  <div className="h-4 w-3/4 bg-zinc-900 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-zinc-900 rounded animate-pulse" />
                </div>
              ))}
            </Grid>
          </section>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Recommended Albums</h2>
              <button
                className="text-white/40 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/5"
                onClick={() => { const lastTrack = recentlyPlayed[0]; const id = lastTrack?.album?.id || lastTrack?.id; if (id) { setRecommendedAlbums([]); fetchRecommendedAlbums(id); } else { fetchRecommendedTracks(); } }}
                title="Refresh"
              >
                <RotateCw size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-16 bg-zinc-900/20 rounded-2xl border border-white/5">
              <p className="text-white/40 text-sm">Play some tracks to get personalized album recommendations.</p>
            </div>
          </section>
        )}

        {/* Recommended Artists */}
        {recommendedArtists.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Recommended Artists</h2>
              <button
                className="text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
                onClick={() => { setRecommendedArtists([]); const id = recentlyPlayed[0]?.artist?.id || recentlyPlayed[0]?.artists?.[0]?.id; if (id) fetchRecommendedArtists(id); }}
                title="Refresh"
              >
                <RotateCw size={16} />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {recommendedArtists.slice(0, 8).map((item: any) => (
                <div key={item.id} className="shrink-0 w-32 text-center">
                  <Card
                    title={item.name}
                    image={getImageUrl(item, '160')}
                    onClick={() => loadCollection({ ...item, id: item.id }, 'artist')}
                    type="artist"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {recommendedArtistsLoading && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Recommended Artists</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="shrink-0 w-32 text-center space-y-2">
                  <div className="w-28 h-28 bg-zinc-900 rounded-full animate-pulse mx-auto" />
                  <div className="h-3 w-20 bg-zinc-900 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Editor's Picks */}
        {editorsPicks && editorsPicks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Editor's Picks</h2>
            </div>
            <Grid minSize="220px">
              {editorsPicks.slice(0, 14).map((item: any) => (
                <Card
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.artist?.name || ''} • ${item.releaseDate ? yearFromDate(item.releaseDate) : ''}`}
                  image={item.cover ? `/api/cover?id=${item.cover}&size=1280` : ''}
                  onClick={() => loadCollection(item, 'album')}
                  onMenuPlay={() => handleQuickPlayItem(item)}
                  onMenuAddToQueue={() => handleAddItemToQueue(item)}
                  onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                  menuPlaylists={myPlaylists}
                  badges={{ explicit: item.explicit, quality: item.audioQuality }}
                />
              ))}
            </Grid>
          </section>
        )}

{editorsPicksLoading && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90">Editor's Picks</h2>
            </div>
            <Grid minSize="220px">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square bg-zinc-900 rounded-2xl animate-pulse" />
                  <div className="h-4 w-3/4 bg-zinc-900 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-zinc-900 rounded animate-pulse" />
                </div>
              ))}
            </Grid>
          </section>
        )}

        {/* Recently Played (fallback if no recommendations) */}
        {!hasActivity && recentDeduped.length === 0 && (
          <section>
            <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight opacity-90 mb-6">Recently Played</h2>
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-3xl border border-white/5">
              <Music className="text-white/10 mb-4" size={48} />
              <p className="text-white/50 font-medium">Start playing music to see your history here</p>
            </div>
          </section>
        )}
      </div>
    );
  };

  const renderExplore = () => {
    if (collectionHub) {
      return (
          <div className="relative space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!collectionHub.isArtist && (
          <div className="relative z-10 flex items-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-white/5 hover:bg-white/10 shrink-0"
              onClick={() => { setCollectionHub(null); resetVibrantColor(); }}
            >
              <ChevronLeft size={20} />
            </Button>
            <div className="min-w-0">
              <h2 className="text-[1.2rem] font-semibold text-white/50">Album</h2>
            </div>
          </div>
          )}

          {collectionHub.loading ? (
            <div className="relative z-10 flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-white/20" size={40} />
              <p className="text-white/20 text-sm font-medium">Gathering {collectionHub.isArtist ? 'artist' : 'collection'} data...</p>
            </div>
          ) : collectionHub.isArtist ? (
            /* ─── ARTIST PAGE ─── */
            <>
               {/* Artist Header — full viewport hero */}
               <header style={{
                 marginTop: '-2rem',
                 marginLeft: '-2rem',
                 marginRight: '-2rem',
                 height: '100vh',
                 position: 'relative',
                 overflow: 'hidden',
                 background: '#0a0a0a',
               }}>
                  {/* Video banner — full cover */}
                  {artistBannerVideo && (
                    <video
                      ref={artistVideoRef}
                      autoPlay muted loop playsInline
                      style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        filter: 'brightness(0.6)',
                        zIndex: 0,
                      }}
                    />
                  )}
                  {/* Static fallback image */}
                  {!artistBannerVideo && collectionHub.image && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: `url(${collectionHub.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center 25%',
                      filter: 'brightness(0.5)',
                      zIndex: 0,
                    }} />
                  )}
                  {/* Dark gradient overlay — fades to black */}
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 85%, rgba(0,0,0,1) 100%)',
                  }} />

                  {/* Back button */}
                  <Button
                    variant="secondary" size="icon"
                    className="absolute top-4 left-4 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm z-[3] border border-white/10"
                    onClick={() => { setCollectionHub(null); resetVibrantColor(); }}
                  >
                    <ChevronLeft size={20} />
                  </Button>

                  {/* Artist Info — bottom left */}
                  <div style={{
                    position: 'absolute', bottom: 48, left: 48, right: 48, zIndex: 2,
                    display: 'flex', alignItems: 'flex-end', gap: 32,
                  }}>
                    {collectionHub.image && (
                      <img src={collectionHub.image} alt={collectionHub.title}
                        style={{
                          width: 180, height: 180, borderRadius: '50%', objectFit: 'cover',
                          border: '4px solid rgba(0,0,0,0.3)',
                          boxShadow: '0 0 40px rgba(0,0,0,0.6)', flexShrink: 0,
                        }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Artist</p>
                      <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 800, color: 'white', lineHeight: 1.1,
                        textShadow: '0 2px 20px rgba(0,0,0,0.8)', margin: '4px 0 12px',
                      }}>{collectionHub.title}</h1>
                      {collectionHub.artistPopularity != null && (
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{collectionHub.artistPopularity}% Popularity</p>
                      )}
                      {collectionHub.artistSocialLinks && collectionHub.artistSocialLinks.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                          {collectionHub.artistSocialLinks.slice(0, 7).map((link: any, i: number) => {
                            const url = link.url || '';
                            let emoji = '🌐';
                            if (url.includes('twitter') || url.includes('x.com')) emoji = '𝕏';
                            else if (url.includes('instagram')) emoji = '📷';
                            else if (url.includes('facebook')) emoji = 'f';
                            else if (url.includes('youtube')) emoji = '▶';
                            else if (url.includes('soundcloud')) emoji = '☁';
                            else if (url.includes('apple')) emoji = '';
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener"
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold transition-colors"
                                title={link.name || link.type || ''}>{emoji}</a>
                            );
                          })}
                        </div>
                      )}
                      {collectionHub.artistBio && (
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 500, lineHeight: 1.5, marginTop: 8 }}>
                          {collectionHub.artistBio.length > 200 && !showFullBio
                            ? collectionHub.artistBio.slice(0, 200) + '...'
                            : collectionHub.artistBio}
                          {collectionHub.artistBio.length > 200 && (
                            <button onClick={() => setShowFullBio(!showFullBio)}
                              style={{ color: '#22d3ee', cursor: 'pointer', background: 'none', border: 'none', fontSize: 13, marginLeft: 4, fontWeight: 600 }}>
                              {showFullBio ? 'Show Less' : 'Read More'}
                            </button>
                          )}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <Button className="bg-white text-black rounded-full font-bold px-6 hover:bg-white/90"
                          onClick={() => { play(collectionHub.tracks[0], collectionHub.tracks, 0); collectionHub.tracks.forEach(t => addRecentlyPlayed(t)); }}
                          disabled={!collectionHub.tracks.length}>
                          <Play size={16} className="mr-1.5" fill="currentColor" /> Play
                        </Button>
                        <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10"
                          onClick={() => collectionHub.tracks.forEach(t => addToQueue(t))}
                          disabled={!collectionHub.tracks.length}>
                          <ListPlus size={16} className="mr-1.5" /> Queue
                        </Button>
                      </div>
                    </div>
                  </div>
               </header>

              {/* Content sections */}
              <div className="space-y-10 pt-0">

               {/* Popular Tracks */}
               {collectionHub.tracks.length > 0 && (
                 <section>
                   <h2 className="text-[1.75rem] font-bold text-white mb-6">Popular Tracks</h2>
                   <div className="bg-zinc-900/20 rounded-2xl border border-white/5 p-2">
                     <TrackList tracks={collectionHub.tracks.slice(0, 20)} showAlbumArt showIndex />
                   </div>
                 </section>
               )}

               {/* Albums */}
               {collectionHub.artistAlbums && collectionHub.artistAlbums.length > 0 && (
                 <section>
                   <h2 className="text-[1.75rem] font-bold text-white mb-6">Albums</h2>
                   <Grid minSize="180px">
                     {collectionHub.artistAlbums.slice(0, 12).map((item: any) => (
                       <Card key={item.id} title={item.title}
                         subtitle={item.artist?.name || item.artist || ''}
                         image={getImageUrl(item, '640')}
                         onClick={() => loadCollection(item, 'album')}
                         onMenuPlay={() => handleQuickPlayItem(item)}
                         onMenuAddToQueue={() => handleAddItemToQueue(item)}
                         onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                         menuPlaylists={myPlaylists} />
                     ))}
                   </Grid>
                 </section>
               )}

               {/* EPs & Singles */}
               {collectionHub.artistEPs && collectionHub.artistEPs.length > 0 && (
                 <section>
                   <h2 className="text-[1.75rem] font-bold text-white mb-6">EPs &amp; Singles</h2>
                   <Grid minSize="180px">
                     {collectionHub.artistEPs.slice(0, 12).map((item: any) => (
                       <Card key={item.id} title={item.title}
                         subtitle={item.artist?.name || item.artist || ''}
                         image={getImageUrl(item, '640')}
                         onClick={() => loadCollection(item, 'album')}
                         onMenuPlay={() => handleQuickPlayItem(item)}
                         onMenuAddToQueue={() => handleAddItemToQueue(item)}
                         onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                         menuPlaylists={myPlaylists} />
                     ))}
                   </Grid>
                 </section>
               )}

               {/* Similar Artists */}
               {collectionHub.similarArtists && collectionHub.similarArtists.length > 0 && (
                 <section>
                   <h2 className="text-[1.75rem] font-bold text-white mb-6">Similar Artists</h2>
                   <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4">
                     {collectionHub.similarArtists.slice(0, 14).map((item: any) => (
                       <div key={item.id} className="text-center">
                         <Card title={item.name}
                           image={getImageUrl(item, '160')}
                           onClick={() => loadCollection({ ...item, id: item.id }, 'artist')}
                           type="artist" />
                       </div>
                     ))}
                   </div>
                 </section>
               )}
              </div>
            </>
          ) : (
            <div className="relative z-10 space-y-12">
              {/* Monochrome-style detail header: image + info side by side */}
              <header className="flex items-start gap-8">
                {collectionHub.image && (
                  <img
                    src={collectionHub.image}
                    alt={collectionHub.title}
                    className="w-[200px] h-[200px] shrink-0 rounded-lg object-cover shadow-xl"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }}
                  />
                )}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Title with dynamic sizing like Monochrome */}
                  <h1
                    className={cn(
                      "font-extrabold leading-[1.1] flex items-center gap-4 flex-wrap overflow-wrap-anywhere",
                      collectionHub.title.length > 40 ? "text-2xl" :
                      collectionHub.title.length > 25 ? "text-4xl" : "text-6xl"
                    )}
                  >
                    {collectionHub.title}
                  </h1>

                  {/* Meta: date • tracks • duration */}
                  {collectionHub.meta && (
                    <p className="text-white/40 text-sm">{collectionHub.meta}</p>
                  )}

                  {/* Producer / copyright */}
                  {collectionHub.subtitle && (
                    <p className="text-white/40 text-sm">
                      By{' '}
                      <span className="text-white/70 font-medium">{collectionHub.subtitle}</span>
                      {collectionHub.copyright ? ` • ${collectionHub.copyright}` : ''}
                    </p>
                  )}

                  {/* Action buttons: Play, Shuffle, Download, Add, Like, Menu */}
                  <div className="flex gap-2 flex-wrap items-center pt-2">
                    {collectionHub.tracks.length > 0 && (
                      <>
                        <Button
                          onClick={() => play(collectionHub.tracks[0], collectionHub.tracks, 0)}
                          className="rounded-full w-10 h-10 p-0 bg-white text-black hover:brightness-110 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                          title="Play Album"
                        >
                          <Play size={20} fill="currentColor" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-full w-10 h-10 p-0 bg-white/10 hover:bg-white/20 border border-white/5"
                          title="Shuffle"
                          onClick={() => {
                            const shuffled = [...collectionHub.tracks].sort(() => Math.random() - 0.5);
                            play(shuffled[0], shuffled, 0);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="lucide lucide-shuffle" viewBox="0 0 24 24"><path d="m18 14 4 4-4 4M18 2l4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22M2 6h1.972a4 4 0 0 1 3.6 2.2M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/></svg>
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-full w-10 h-10 p-0 bg-white/10 hover:bg-white/20 border border-white/5"
                          title="Download Album"
                          onClick={() => {
                            collectionHub.tracks.forEach((t: Track) => startDownload(t));
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 15V3M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="rounded-full w-10 h-10 p-0 bg-white/10 hover:bg-white/20 border border-white/5"
                              title="Add to Playlist"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56 bg-zinc-900 border border-white/10">
                            {myPlaylists.map((pl) => (
                              <DropdownMenuItem key={pl.id} onClick={() => collectionHub.tracks.forEach((t: Track) => addToPlaylist(pl.id, t))}>
                                {pl.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setNewPlaylistName(''); setCreatePlaylistOpen(true); }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" className="mr-2"><path d="M5 12h14M12 5v14"/></svg>
                              Create New Playlist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="secondary"
                          size="icon"
                          className={cn(
                            "rounded-full w-10 h-10 p-0 border border-white/5 text-white/70 hover:text-white",
                            collectionHub.tracks.some(t => favourites.includes(t.id))
                              ? "bg-white/15 hover:bg-white/25"
                              : "bg-white/10 hover:bg-white/20"
                          )}
                          title={collectionHub.tracks.every(t => favourites.includes(t.id)) ? "Remove from Favorites" : "Save to Favorites"}
                          onClick={() => {
                            const allLiked = collectionHub.tracks.every(t => favourites.includes(t.id));
                            collectionHub.tracks.forEach((t: Track) => {
                              if (allLiked ? favourites.includes(t.id) : !favourites.includes(t.id)) {
                                toggleFavourite(t);
                              }
                            });
                          }}
                        >
                          <Heart size={20} fill={collectionHub.tracks.every(t => favourites.includes(t.id)) ? 'currentColor' : 'none'} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="rounded-full w-10 h-10 p-0 bg-white/10 hover:bg-white/20 border border-white/5"
                              title="More options"
                            >
                              <MoreHorizontal size={20} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52 bg-zinc-900 border border-white/10">
                            <DropdownMenuItem onClick={() => play(collectionHub.tracks[0], collectionHub.tracks, 0)}>
                              <Play size={14} className="mr-2" />Play Album
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const shuffled = [...collectionHub.tracks].sort(() => Math.random() - 0.5);
                              play(shuffled[0], shuffled, 0);
                            }}>
                              Shuffle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => collectionHub.tracks.forEach((t: Track) => addToQueue(t))}>
                              Add to Queue
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(window.location.href).catch(() => {});
                            }}>
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => collectionHub.tracks.forEach((t: Track) => startDownload(t))}>
                              Download Album
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>
              </header>

              {!collectionHub.tracks.length && (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-3xl border border-white/5">
                  <Music className="text-white/10 mb-4" size={48} />
                  <p className="text-white/50 font-medium">No tracks found inside this collection</p>
                </div>
              )}

              {collectionHub.tracks.length > 0 && (
                <div className="lg:grid lg:grid-cols-[58%_1fr] lg:gap-8 lg:items-start">
                  {/* Track list — Monochrome compact grid */}
                  <div className="min-w-0">
                    <div className="grid grid-cols-[40px_1fr_80px_48px] gap-4 items-center text-[0.9rem] text-white/35 font-medium border-b border-white/5 pb-3 mb-2 px-2">
                      <span className="text-center">#</span>
                      <span>Title</span>
                      <span className="text-right tabular-nums">Duration</span>
                      <span></span>
                    </div>
                    {collectionHub.tracks.map((track, i) => {
                      const isThisTrackPlaying = currentTrack?.id === track.id && isPlaying;
                      return (
                        <div
                          key={track.id || i}
                          className={cn(
                            'group grid grid-cols-[40px_1fr_60px_auto] gap-4 items-center px-2 py-3.5 rounded-md cursor-pointer transition-colors',
                            isThisTrackPlaying
                              ? 'bg-[#1a1a1a] hover:bg-[#222] border border-white/[0.06]'
                              : 'hover:bg-white/[0.04] border border-transparent'
                          )}
                          onDoubleClick={() => { play(track, collectionHub.tracks, i); trackListenDedupeKey(track); }}
                          onClick={() => { play(track, collectionHub.tracks, i); }}
                        >
                          <span className="text-[0.9rem] text-white/40 tabular-nums text-center">
                            {isThisTrackPlaying ? <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse inline-block" /> : i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className={cn(
                              'text-[14px] font-medium truncate',
                              isThisTrackPlaying ? 'text-cyan-400 tracking-tight font-bold' : 'text-white'
                            )}>
                              {track.title}
                            </p>
                            <p className="text-[0.9rem] text-white/45 truncate mt-0.5">
                              {track.artist} {track.year ? ` • ${track.year}` : ''}
                            </p>
                          </div>
                          <span className="text-[0.9rem] text-white/45 tabular-nums text-right">
                            {typeof track.duration === 'number' ? formatDuration(track.duration) : '--:--'}
                          </span>
                          <span></span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop sidebar: all content sections */}
                  <div className="hidden lg:flex lg:flex-col lg:gap-8">
                    {collectionHub.similarAlbums && collectionHub.similarAlbums.length > 0 && (
                      <section>
                        <h3 className="text-[1.4rem] font-bold text-white mb-5">
                          More albums from {collectionHub.subtitle}
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          {collectionHub.similarAlbums.slice(0, 10).map((item: any) => (
                            <div key={item.id} className="w-[155px] shrink-0">
                              <Card
                                title={item.title}
                                subtitle={`${item.artist?.name || item.artists?.[0]?.name || ''}${item.releaseDate ? ` • ${new Date(item.releaseDate).getFullYear()}` : ''}`}
                                image={getImageUrl(item, '640')}
                                onClick={() => loadCollection(item, 'album')}
                                onMenuPlay={() => handleQuickPlayItem(item)}
                                onMenuAddToQueue={() => handleAddItemToQueue(item)}
                                onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                                menuPlaylists={myPlaylists}
                                badges={{ explicit: item.explicit, quality: item.audioQuality }}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {collectionHub.artistEPs && collectionHub.artistEPs.length > 0 && (
                      <section>
                        <h3 className="text-[1.4rem] font-bold text-white mb-5">
                          EPs &amp; Singles
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          {collectionHub.artistEPs.map((item: any) => (
                            <div key={item.id} className="w-[155px] shrink-0">
                              <Card
                                title={item.title}
                                subtitle={`${item.artist?.name || item.artists?.[0]?.name || ''}${item.releaseDate ? ` • ${new Date(item.releaseDate).getFullYear()}` : ''}`}
                                image={getImageUrl(item, '640')}
                                onClick={() => loadCollection(item, 'album')}
                                onMenuPlay={() => handleQuickPlayItem(item)}
                                onMenuAddToQueue={() => handleAddItemToQueue(item)}
                                onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                                menuPlaylists={myPlaylists}
                                badges={{ explicit: item.explicit, quality: item.audioQuality }}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              )}

              {/* Similar Artists -- always visible below tracklist */}
              {collectionHub.similarArtists && collectionHub.similarArtists.length > 0 && (
                <section>
                  <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight mb-6 opacity-90">Similar Artists</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4">
                    {collectionHub.similarArtists.slice(0, 14).map((item: any) => (
                      <div key={item.id} className="text-center">
                        <Card
                          title={item.name}
                          image={getImageUrl(item, '160')}
                          onClick={() => loadCollection({ ...item, id: item.id }, 'artist')}
                          type="artist"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Mobile: stacked sections (hidden on lg+) */}
              <div className="lg:hidden space-y-12 mt-12">
                {collectionHub.similarAlbums && collectionHub.similarAlbums.length > 0 && (
                  <section>
                    <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight mb-6 opacity-90">
                      More albums from {collectionHub.subtitle}
                    </h2>
                    <Grid minSize="200px">
                      {collectionHub.similarAlbums.slice(0, 12).map((item: any) => (
                        <Card
                          key={item.id}
                          title={item.title}
                          subtitle={`${item.artist?.name || item.artists?.[0]?.name || ''}${item.releaseDate ? ` • ${new Date(item.releaseDate).getFullYear()}` : ''}`}
                          image={getImageUrl(item, '640')}
                          onClick={() => loadCollection(item, 'album')}
                          onMenuPlay={() => handleQuickPlayItem(item)}
                          onMenuAddToQueue={() => handleAddItemToQueue(item)}
                          onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                          menuPlaylists={myPlaylists}
                          badges={{ explicit: item.explicit, quality: item.audioQuality }}
                        />
                      ))}
                    </Grid>
                  </section>
                )}

                {collectionHub.artistEPs && collectionHub.artistEPs.length > 0 && (
                  <section>
                    <h2 className="text-[2rem] font-bold text-white tracking-tight leading-tight mb-6 opacity-90">
                      EPs &amp; Singles {collectionHub.subtitle ? <span className="text-white/40 font-medium">— {collectionHub.subtitle}</span> : null}
                    </h2>
                    <Grid minSize="200px">
                      {collectionHub.artistEPs.map((item: any) => (
                        <Card
                          key={item.id}
                          title={item.title}
                          subtitle={`${item.artist?.name || item.artists?.[0]?.name || ''}${item.releaseDate ? ` • ${new Date(item.releaseDate).getFullYear()}` : ''}`}
                          image={getImageUrl(item, '640')}
                          onClick={() => loadCollection(item, 'album')}
                          onMenuPlay={() => handleQuickPlayItem(item)}
                          onMenuAddToQueue={() => handleAddItemToQueue(item)}
                          onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                          menuPlaylists={myPlaylists}
                          badges={{ explicit: item.explicit, quality: item.audioQuality }}
                        />
                      ))}
                    </Grid>
                  </section>
                )}
              </div>
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
                    <Grid minSize="220px">
                      {section.items.map((item: any, i: number) => (
                        <Card
                          key={i}
                          title={item.title || item.name}
                          subtitle={
                            section.type === 'PLAYLIST_LIST'
                              ? `${item.numberOfTracks || 0} tracks`
                              : (item.artist?.name || item.artists?.[0]?.name || item.artist)
                          }
                          image={getImageUrl(item, '1280')}
                          onClick={() => {
                            if (section.type === 'TRACK' || !section.type) {
                              play(mapItemToTrack(item));
                            } else if (section.type === 'ARTIST_LIST' || section.type === 'ARTIST') {
                              loadCollection(item, 'artist');
                            } else if (section.type === 'PLAYLIST_LIST') {
                              loadCollection(item, 'playlist');
                            } else {
                              loadCollection(item, 'album');
                            }
                          }}
                          type={section.type === 'ARTIST_LIST' || section.type === 'ARTIST' ? 'artist' : section.type === 'PLAYLIST_LIST' ? 'playlist' : 'album'}
                          onMenuPlay={section.type === 'PLAYLIST_LIST' || section.type === 'ALBUM_LIST' ? () => handleQuickPlayItem(item) : undefined}
                          onMenuAddToQueue={section.type === 'PLAYLIST_LIST' || section.type === 'ALBUM_LIST' ? () => handleAddItemToQueue(item) : undefined}
                          onMenuAddToPlaylist={section.type === 'PLAYLIST_LIST' || section.type === 'ALBUM_LIST' ? (pid) => handleAddItemToPlaylist(item, pid) : undefined}
menuPlaylists={section.type === 'PLAYLIST_LIST' || section.type === 'ALBUM_LIST' ? myPlaylists : undefined}
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
              <button
                key={g.id}
                className="bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] hover:border-white/20 transition-all rounded-lg h-10 px-4 text-sm font-semibold cursor-pointer"
                onClick={() => loadGenre(g.id, g.name)}
              >
                {g.name}
              </button>
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
                const artistObj = t.artists?.[0];
                const name = typeof a === 'string' ? a : a?.name || artistObj?.name;
                if (name && !artistMap.has(name)) {
                  const rawCover = artistObj?.picture || t.albumCover || '';
                  const isUrl = typeof rawCover === 'string' && rawCover.startsWith('http');
                  artistMap.set(name, {
                    id: artistObj?.id || name,
                    name,
                    picture: rawCover,
                    image: isUrl ? rawCover : (rawCover ? `/api/cover?id=${rawCover}&size=160` : ''),
                    artist: { name },
                  });
                }
              });
              const topArtists = [...artistMap.values()].slice(0, 10);
              return topArtists.length > 0 ? (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[50ms]">
                  <SectionHeader title="Top Artists" />
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
                    {topArtists.map((item: any) => (
                      <div key={item.id} className="shrink-0 w-32 text-center">
                        <Card
                          title={item.name}
                          image={item.image}
                          onClick={() => loadCollection(item, 'artist')}
                          type="artist"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;
            })()}

            {exploreData?.top_albums && exploreData.top_albums.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[100ms]">
                <SectionHeader title="Trending Albums" />
                <Grid minSize="200px">
                  {exploreData.top_albums.map((item: any) => (
                    <Card
                      key={item.id}
                      title={item.title}
                      subtitle={item.artist?.name || item.artists?.[0]?.name || item.artist}
                      image={getImageUrl(item, '1280')}
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
                <Grid minSize="220px">
                  {exploreData.featured_playlists.map((item: any) => (
                    <Card
                      key={item.uuid || item.id}
                      title={item.title}
                      subtitle={item.description || `${item.trackCount || item.numberOfTracks || 0} tracks`}
                      image={getImageUrl(item, '1280')}
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
                  <Grid minSize="220px">
                    {section.items.map((item: any, i: number) => (
                      <Card
                        key={item.id || item.uuid || i}
                        title={item.title || item.name}
                        subtitle={
                          section.type === 'PLAYLIST_LIST'
                            ? `${item.numberOfTracks || 0} tracks`
                            : (item.artist?.name || item.artists?.[0]?.name || item.artist || '')
                        }
                        image={getImageUrl(item, '1280')}
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
      {/* Album gradient spill — Monochrome-style blurred background */}
      {collectionHub && !collectionHub.isArtist && collectionHub.image && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] min-h-[400px] z-[1] overflow-hidden"
          style={{
            backgroundImage: `url('${collectionHub.image}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 25%',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(50px) brightness(0.4)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 100%)',
            opacity: 1,
          }}
        />
      )}
      {/* Fixed Header: Tabs + Search */}
      <div className={cn(
        "shrink-0 border-b border-white/5 backdrop-blur-xl z-20 sticky top-0 px-10 pt-8 pb-0 transition-colors duration-500",
        collectionHub ? "bg-transparent border-transparent" : "bg-black/80"
      )}>
        {/* Home / Explore Tabs with animated underline — hidden when inside a hub */}
        {!collectionHub && !genreHub && !searchHub && !searchResults && (
        <div className="flex items-center gap-10">
          <div className="relative">
            <button
              className={cn(
                "text-3xl font-black tracking-tight transition-all duration-300",
                activeTab === 'home' ? "text-white scale-100" : "text-white/25 hover:text-white/45 scale-95"
              )}
              onClick={() => { setActiveTab('home'); clearSearch(); }}
            >
              Home
            </button>
            {activeTab === 'home' && (
              <motion.div 
                layoutId="homeTabUnderline"
                className="absolute -bottom-2 left-0 right-0 h-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--highlight-rgb,255,255,255),0.5)]" 
              />
            )}
          </div>
          <div className="relative">
            <button
              className={cn(
                "text-3xl font-black tracking-tight transition-all duration-300",
                activeTab === 'explore' ? "text-white scale-100" : "text-white/25 hover:text-white/45 scale-95"
              )}
              onClick={() => { setActiveTab('explore'); clearSearch(); }}
            >
              Explore
            </button>
            {activeTab === 'explore' && (
              <motion.div 
                layoutId="homeTabUnderline"
                className="absolute -bottom-2 left-0 right-0 h-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--highlight-rgb,255,255,255),0.5)]" 
              />
            )}
          </div>
        </div>
        )}
        {/* Search Bar - below tabs */}
        <div className="pb-6 pt-5">
          <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35" />
            <Input
              type="text"
              placeholder="Search for tracks, artists, albums..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-12 pr-12 h-12 w-full bg-white/[0.06] border border-white/10 text-white placeholder:text-white/35 rounded-lg focus-visible:ring-1 focus-visible:ring-white/15 focus-visible:border-white/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-12 px-3 gap-2 bg-white/[0.06] border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-xs font-medium rounded-lg">
                <Globe size={14} className="text-white/40" />
                <span className="truncate max-w-[80px] text-[11px]">
                  {catalogProvider === 'addon' && activeAddonId
                    ? (installedAddons?.find(a => a.manifest.id === activeAddonId)?.manifest?.name?.slice(0, 12) || 'Addon')
                    : searchAddons.length > 0
                      ? (searchAddons[0]?.manifest?.name?.slice(0, 12) || 'Module')
                      : <span className="text-white/30">No module</span>}
                </span>
                <ChevronDown size={12} className="text-white/30 ml-0.5 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px] bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white z-[300] max-h-[60vh] overflow-y-auto">
              {searchAddons.length > 0 ? (
                searchAddons.map((addon, idx) => (
                  <DropdownMenuItem
                    key={addon.manifest.id}
                    onClick={() => { setCatalogProvider('addon'); useAddonStore.setState({ activeAddonId: addon.manifest.id }); }}
                    className="text-[13px] text-white/80 focus:bg-white/10 focus:text-white cursor-pointer"
                  >
                    {catalogProvider === 'addon' && activeAddonId === addon.manifest.id ? (
                      <Check size={14} className="mr-2 text-cyan-400 shrink-0" />
                    ) : (
                      <span className="text-[11px] text-white/25 w-[18px] mr-1 shrink-0 text-right">{`${idx + 1}.`}</span>
                    )}
                    <span className="truncate">{addon.manifest.name}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-3 py-2 text-[12px] text-white/30">No search addons installed</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      <ScrollArea className="h-full custom-scrollbar" style={collectionHub?.isArtist ? { overflowY: 'visible', overflowX: 'hidden' } : undefined}>
        <div className="p-8 pb-44">
          {searchHub ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary" size="icon"
                  className="rounded-full bg-white/5 hover:bg-white/10 shrink-0"
                  onClick={() => { setSearchHub(null); resetVibrantColor(); }}
                >
                  <ChevronLeft size={20} />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold truncate">{searchHub.title}</h1>
                  {searchHub.subtitle && <p className="text-sm text-white/50">{searchHub.subtitle}</p>}
                </div>
              </div>
              {searchHub.loading ? (
                <div className="flex items-center gap-3 py-16 justify-center text-white/40">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : searchHub.tracks.length === 0 ? (
                <p className="text-sm text-white/50 py-12 text-center">No tracks found.</p>
              ) : (
                <>
                  <Button
                    className="rounded-full h-11 px-5 font-bold flex items-center gap-2 bg-primary text-black hover:scale-102 transition-transform shadow-[0_0_20px_rgba(var(--primary-rgb,255,255,255),0.3)]"
                    onClick={() => { play(searchHub.tracks[0], searchHub.tracks, 0); searchHub.tracks.forEach(t => addRecentlyPlayed(t)); }}
                  >
                    <Play size={16} fill="currentColor" />
                    Play all ({searchHub.tracks.length})
                  </Button>
                  <div className="bg-zinc-900/20 rounded-2xl border border-white/5 p-2">
                    <TrackList tracks={searchHub.tracks} showAlbumArt showIndex />
                  </div>
                </>
              )}
            </div>
          ) : searchResults ? (
            <div className="space-y-6">
              <h2 className="text-[1.75rem] font-bold text-white">Results for &quot;{searchQuery}&quot;</h2>

              {/* Results Tabs — Monochrome style */}
              <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto scrollbar-none">
                {(['tracks', 'albums', 'artists', 'playlists'] as const).map(tab => (
                  <button
                    key={tab}
                    className={cn(
                      'relative py-2 px-6 text-base font-medium border-b-2 whitespace-nowrap shrink-0 rounded-t transition-all duration-150 capitalize',
                      searchTab === tab ? 'border-cyan-400 text-white' : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                    )}
                    onClick={() => setSearchTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {searchLoading ? (
                <div className="py-16 flex justify-center"><Loader2 size={32} className="animate-spin text-white/20" /></div>
              ) : (
                <>
                  {searchTab === 'tracks' && (
                    searchResults.tracks.length > 0 ? (
                      <div className="bg-zinc-900/20 rounded-2xl border border-white/5 p-2">
                        <TrackList tracks={searchResults.tracks} showAlbumArt showIndex />
                      </div>
                    ) : <p className="text-sm text-white/40 py-8 text-center">No tracks found.</p>
                  )}
                  {searchTab === 'albums' && (
                    searchResults.albums.length > 0 ? (
                      <Grid minSize="200px">
                        {searchResults.albums.map((item: any) => (
                          <Card
                            key={item.id}
                            title={item.title}
                            subtitle={item.artist}
                            image={item.cover || ''}
                            onClick={() => openSearchHub(item, 'album')}
                            onMenuPlay={() => handleQuickPlayItem(item)}
                            onMenuAddToQueue={() => handleAddItemToQueue(item)}
                            onMenuAddToPlaylist={(pid) => handleAddItemToPlaylist(item, pid)}
                            menuPlaylists={myPlaylists}
                          />
                        ))}
                      </Grid>
                    ) : <p className="text-sm text-white/40 py-8 text-center">No albums found.</p>
                  )}
                  {searchTab === 'artists' && (
                    searchResults.artists.length > 0 ? (
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {searchResults.artists.slice(0, 10).map((item: any) => (
                          <div key={item.id} className="shrink-0 w-36 text-center">
                            <Card
                              title={item.name}
                              image={item.image ? (item.image.startsWith('http') || item.image.startsWith('/') ? item.image : `/api/cover?id=${item.image}&size=160`) : ''}
                              onClick={() => openSearchHub({ ...item, name: item.name }, 'artist')}
                              type="artist"
                            />
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-white/40 py-8 text-center">No artists found.</p>
                  )}
                  {searchTab === 'playlists' && (
                    searchResults.playlists.length > 0 ? (
                      <Grid minSize="200px">
                        {searchResults.playlists.map((item: any) => (
                          <Card
                            key={item.id || item.uuid}
                            title={item.name || item.title}
                            subtitle={`${item.trackCount || 0} tracks`}
                            image={item.cover || item.image || ''}
                            onClick={() => openSearchHub(item, 'playlist')}
                            type="playlist"
                          />
                        ))}
                      </Grid>
                    ) : <p className="text-sm text-white/40 py-8 text-center">No playlists found.</p>
                  )}
                </>
              )}
            </div>
          ) : (
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
          )}
        </div>
      </ScrollArea>

      {/* Create Playlist Modal */}
      {createPlaylistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCreatePlaylistOpen(false)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-[380px] max-w-[90vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Create New Playlist</h3>
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createAndAddPlaylist(); }}
              className="w-full h-11 px-4 bg-white/[0.06] border border-white/10 rounded-lg text-white placeholder:text-white/35 focus:ring-1 focus:ring-white/15 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" className="rounded-full" onClick={() => setCreatePlaylistOpen(false)}>
                Cancel
              </Button>
              <Button className="rounded-full bg-primary text-primary-foreground" onClick={createAndAddPlaylist} disabled={!newPlaylistName.trim()}>
                Create & Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


