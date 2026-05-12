'use client';

import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUIStore } from '@/stores/uiStore';
import { useHomeLayoutStore } from '@/stores/homeLayoutStore';
import { useAddonStore } from '@/stores/addonStore';
import { useMetadataStore } from '@/stores/metadataStore';
import { demoPlaylists, browseCategories, demoTracks } from '@/lib/demo-data';
import { HOME_MOOD_MIXES, HOME_CATALOG_RAILS } from '@/lib/home-feed';
import { metadataSearchUrl } from '@/lib/catalog-api';
import { addonTrackToTrack } from '@/lib/addon-track-map';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlayButton from '@/components/shared/PlayButton';
import TrackList from '@/components/shared/TrackList';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { ChevronRight, ChevronLeft, Loader2, MoreHorizontal } from 'lucide-react';
import type { Track } from '@/types/music';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadCurrentTrack } from '@/lib/download-track';
import { mapMetadataSearchTrack } from '@/lib/map-metadata-track';

/** Home row preview count; full list opens in the side hub via See all. */
const RECENT_HOME_PREVIEW = 5;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Mobile: horizontal scroll. Desktop: auto-fill grid so rows span full width without a trailing gap. */
const homeResponsiveRail =
  'flex gap-3 pb-2 -mx-4 px-4 pr-7 md:-mx-8 md:px-8 md:pr-8 max-md:overflow-x-auto max-md:flex-nowrap max-md:custom-scrollbar-x md:grid md:overflow-x-visible md:[grid-template-columns:repeat(auto-fill,minmax(min(128px,100%),1fr))]';

function AllInOneBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-sky-500/35 bg-sky-950/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
      All in one
    </span>
  );
}

function PlaylistCard({
  playlist,
  onClick,
  playerTheme,
}: {
  playlist: (typeof demoPlaylists)[0];
  onClick: () => void;
  playerTheme: string;
}) {
  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      className={cn(
        'flex items-center rounded-xl overflow-hidden cursor-pointer group transition-colors border border-white/5',
        playerTheme === 'tidal' ? 'bg-white/5 hover:bg-white/10' : 'bg-white/5 hover:bg-white/10'
      )}
      onClick={onClick}
    >
      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
        {playlist.cover ? (
          <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-white/10" />
        )}
      </div>
      <div className="flex-1 px-3 py-2 min-w-0">
        <p className="text-sm font-bold text-white truncate">{playlist.name}</p>
        <p className="text-xs text-white/50 truncate hidden sm:block">
          Playlist • {playlist.tracks?.length || 0} songs
        </p>
      </div>
      <div className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <PlayButton size="sm" onClick={onClick} />
      </div>
    </motion.div>
  );
}

function FreshDropCard({
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
      whileHover={{ y: -3 }}
      className="max-md:flex-shrink-0 w-[min(42vw,168px)] md:min-w-0 md:w-full p-1.5 rounded-xl bg-transparent hover:bg-white/5 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2.5 shadow-lg shadow-black/50 border border-white/5">
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-white/10" />
        )}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <PlayButton size="md" onClick={onClick} />
        </div>
      </div>
      <p className="text-sm font-bold text-white truncate">{title}</p>
      {subtitle && <p className="text-xs text-white/50 mt-0.5 truncate">{subtitle}</p>}
    </motion.div>
  );
}

function HomeTrackCardMenu({ track }: { track: Track }) {
  const { play, addToQueue } = usePlayerStore();
  const { toggleFavourite, isFavourite, playlists, addToPlaylist, removeFromRecentlyPlayed } = useLibraryStore();
  const fav = isFavourite(track.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-1 right-1 h-8 w-8 rounded-full bg-black/55 text-white border-0 hover:bg-black/75 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 z-10"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Track options"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => play(track)}>Play</DropdownMenuItem>
        <DropdownMenuItem onClick={() => addToQueue(track)}>Add to queue</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Add to playlist</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-56 overflow-y-auto custom-scrollbar">
            {playlists.map((pl) => (
              <DropdownMenuItem key={pl.id} onClick={() => addToPlaylist(pl.id, track)}>
                {pl.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toggleFavourite(track)}>
          {fav ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => removeFromRecentlyPlayed(track.id)}>Remove from Recently played</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void downloadCurrentTrack(track)}>Download</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HomeTrackCard({ track, playerTheme }: { track: Track; playerTheme: string }) {
  const { play } = usePlayerStore();

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      className={cn(
        'relative flex items-center rounded-xl overflow-hidden cursor-pointer group transition-colors text-left border border-white/5',
        playerTheme === 'tidal' ? 'bg-white/5 hover:bg-white/10' : 'bg-white/5 hover:bg-white/10'
      )}
      onClick={() => play(track)}
    >
      <HomeTrackCardMenu track={track} />
      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
        {track.albumCover ? (
          <img src={track.albumCover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-white/10" />
        )}
      </div>
      <div className="flex-1 px-3 py-2 min-w-0">
        <p className="text-sm font-bold text-white truncate">{track.title}</p>
        <p className="text-xs text-white/50 truncate hidden sm:block">{track.artist}</p>
      </div>
      <div className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <PlayButton size="sm" onClick={() => play(track)} />
      </div>
    </motion.div>
  );
}

function HomeRecentCard({ track }: { track: Track }) {
  const { play } = usePlayerStore();

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative max-md:flex-shrink-0 w-[min(45vw,180px)] md:min-w-0 md:w-full p-2 rounded-xl bg-transparent hover:bg-white/5 cursor-pointer group"
      onClick={() => play(track)}
    >
      <HomeTrackCardMenu track={track} />
      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 shadow-lg shadow-black/40 border border-white/5">
        {track.albumCover ? (
          <img src={track.albumCover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-white/10" />
        )}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <PlayButton size="md" onClick={() => play(track)} />
        </div>
      </div>
      <p className="text-sm font-bold text-white truncate">{track.title}</p>
      <p className="text-xs text-white/50 mt-1 truncate">{track.artist}</p>
    </motion.div>
  );
}

function SectionHeader({
  title,
  subtitle,
  badge,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  onSeeAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-white/45 truncate">{subtitle}</p>}
      </div>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-semibold text-white/50 hover:text-white inline-flex items-center gap-1 shrink-0 self-start mt-1"
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
  const { addons, searchWithAddon } = useAddonStore();
  const catalogProvider = useMetadataStore((s) => s.catalogProvider);
  const appleStorefront = useMetadataStore((s) => s.appleStorefront ?? 'US');
  const {
    showQuickPicks,
    showDiscover,
    showTopTen,
    showRecentlyPlayed,
    showRecommendedArtists,
    showBrowseAll,
  } = useHomeLayoutStore();

  const browseAddonId = useMemo(
    () => addons.find((a) => a.enabled && a.manifest.resources?.includes('search'))?.manifest.id ?? null,
    [addons]
  );

  const [mounted, setMounted] = useState(false);
  const [freshTracks, setFreshTracks] = useState<Track[]>([]);
  const [popArtists, setPopArtists] = useState<{ id: string; name: string; image?: string }[]>([]);
  const [featuredArtist, setFeaturedArtist] = useState<{ name: string; image?: string } | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [moodLoadingId, setMoodLoadingId] = useState<string | null>(null);
  const [hubOverlay, setHubOverlay] = useState<{
    kind: 'genre' | 'mood' | 'fresh' | 'artist' | 'recent';
    title: string;
    subtitle?: string;
    tracks: Track[];
    loading: boolean;
  } | null>(null);
  const [catalogRails, setCatalogRails] = useState<Record<string, Track[]>>({});
  const [catalogRailsLoading, setCatalogRailsLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  const greeting = useMemo(() => {
    if (!mounted) return 'Welcome';
    return getGreeting();
  }, [mounted]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeedLoading(true);
      try {
        if (browseAddonId) {
          const rFresh = await searchWithAddon(browseAddonId, 'new music trending');
          if (cancelled) return;
          setFreshTracks(rFresh.tracks.slice(0, 16).map(addonTrackToTrack));
          const rPop = await searchWithAddon(browseAddonId, 'popular hits');
          if (cancelled) return;
          const artists = rPop.artists ?? [];
          if (artists.length > 0) {
            const list = artists.slice(0, 14).map((a) => ({
              id: String(a.id ?? a.name),
              name: a.name,
              image: a.image || a.artworkURL,
            }));
            setPopArtists(list);
            setFeaturedArtist({ name: list[0].name, image: list[0].image });
          } else {
            const map = new Map<string, { id: string; name: string; image?: string }>();
            rPop.tracks.forEach((t) => {
              const k = t.artistId || t.artist;
              if (!map.has(k)) map.set(k, { id: k, name: t.artist, image: t.artworkURL || t.cover });
            });
            const list = Array.from(map.values()).slice(0, 14);
            setPopArtists(list);
            setFeaturedArtist(list[0] ? { name: list[0].name, image: list[0].image } : null);
          }
        } else {
          const freshUrl = metadataSearchUrl({
            q: 'new music trending',
            provider: catalogProvider,
            appleCountry: appleStorefront,
          });
          const artUrl = metadataSearchUrl({
            q: 'popular artists',
            provider: catalogProvider,
            entity: 'artist',
            appleCountry: appleStorefront,
          });
          const [rFresh, rArt] = await Promise.all([fetch(freshUrl), fetch(artUrl)]);
          const jFresh = (await rFresh.json()) as { tracks?: Record<string, unknown>[] };
          const jArt = (await rArt.json()) as {
            artists?: { id: string; name: string; image?: string }[];
          };
          if (cancelled) return;
          const ft = Array.isArray(jFresh.tracks) ? jFresh.tracks : [];
          setFreshTracks(
            ft.length > 0 ? ft.slice(0, 16).map((x) => mapMetadataSearchTrack(x)) : demoTracks.slice(0, 12)
          );
          const arts = Array.isArray(jArt.artists) ? jArt.artists : [];
          if (arts.length > 0) {
            const list = arts.slice(0, 14).map((a) => ({
              id: a.id,
              name: a.name,
              image: a.image,
            }));
            setPopArtists(list);
            setFeaturedArtist(list[0] ? { name: list[0].name, image: list[0].image } : null);
          } else if (ft.length > 0) {
            const map = new Map<string, { id: string; name: string; image?: string }>();
            ft.forEach((raw) => {
              const t = mapMetadataSearchTrack(raw as Record<string, unknown>);
              const k = t.artist;
              if (!map.has(k)) map.set(k, { id: k, name: t.artist, image: t.albumCover });
            });
            const list = Array.from(map.values()).slice(0, 14);
            setPopArtists(list);
            setFeaturedArtist(list[0] ? { name: list[0].name, image: list[0].image } : null);
          } else {
            const map = new Map<string, { id: string; name: string; image?: string }>();
            demoTracks.forEach((t) => {
              const k = t.artistId || t.artist;
              if (!map.has(k)) map.set(k, { id: k, name: t.artist, image: t.albumCover });
            });
            const list = Array.from(map.values()).slice(0, 14);
            setPopArtists(list);
            setFeaturedArtist(list[0] ? { name: list[0].name, image: list[0].image } : null);
          }
        }
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [browseAddonId, searchWithAddon, catalogProvider, appleStorefront]);

  const handlePlayPlaylist = (playlist: (typeof demoPlaylists)[0]) => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      play(playlist.tracks[0], playlist.tracks, 0);
    }
  };

  const handleOpenPlaylist = (id: string) => {
    setSelectedPlaylistId(id);
  };

  useEffect(() => {
    if (browseAddonId || !showDiscover) {
      setCatalogRails({});
      setCatalogRailsLoading(false);
      return;
    }
    let cancelled = false;
    setCatalogRailsLoading(true);
    (async () => {
      const next: Record<string, Track[]> = {};
      await Promise.all(
        HOME_CATALOG_RAILS.map(async (r) => {
          try {
            const res = await fetch(
              metadataSearchUrl({
                q: r.query,
                provider: catalogProvider,
                limit: 16,
                appleCountry: appleStorefront,
              })
            );
            const data = (await res.json()) as { tracks?: Record<string, unknown>[] };
            const list = Array.isArray(data.tracks) ? data.tracks : [];
            next[r.id] = list.map((x) => mapMetadataSearchTrack(x));
          } catch {
            next[r.id] = [];
          }
        })
      );
      if (!cancelled) {
        setCatalogRails(next);
        setCatalogRailsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [browseAddonId, showDiscover, catalogProvider, appleStorefront]);

  const loadMood = useCallback(
    async (m: (typeof HOME_MOOD_MIXES)[0]) => {
      setHubOverlay({ kind: 'mood', title: m.label, subtitle: m.subtitle, tracks: [], loading: true });
      setMoodLoadingId(m.id);
      try {
        let tracks: Track[] = [];
        if (browseAddonId) {
          const r = await searchWithAddon(browseAddonId, m.query);
          tracks = r.tracks.map(addonTrackToTrack);
        } else {
          const res = await fetch(
            metadataSearchUrl({
              q: m.query,
              provider: catalogProvider,
              limit: 60,
              appleCountry: appleStorefront,
            })
          );
          const data = (await res.json()) as { tracks?: Record<string, unknown>[] };
          tracks = (Array.isArray(data.tracks) ? data.tracks : []).map((x) => mapMetadataSearchTrack(x));
        }
        setHubOverlay({ kind: 'mood', title: m.label, subtitle: m.subtitle, tracks, loading: false });
      } catch {
        setHubOverlay({ kind: 'mood', title: m.label, subtitle: m.subtitle, tracks: [], loading: false });
      } finally {
        setMoodLoadingId(null);
      }
    },
    [browseAddonId, searchWithAddon, catalogProvider, appleStorefront]
  );

  const openGenreHub = useCallback(
    async (cat: (typeof browseCategories)[number]) => {
      setHubOverlay({ kind: 'genre', title: cat.name, subtitle: cat.hubSubtitle, tracks: [], loading: true });
      try {
        let tracks: Track[] = [];
        if (browseAddonId) {
          const r = await searchWithAddon(browseAddonId, cat.hubQuery);
          tracks = r.tracks.map(addonTrackToTrack);
        } else {
          const res = await fetch(
            metadataSearchUrl({
              q: cat.hubQuery,
              provider: catalogProvider,
              limit: 60,
              appleCountry: appleStorefront,
            })
          );
          const data = (await res.json()) as { tracks?: Record<string, unknown>[] };
          tracks = (Array.isArray(data.tracks) ? data.tracks : []).map((x) => mapMetadataSearchTrack(x));
        }
        setHubOverlay({ kind: 'genre', title: cat.name, subtitle: cat.hubSubtitle, tracks, loading: false });
      } catch {
        setHubOverlay({ kind: 'genre', title: cat.name, subtitle: cat.hubSubtitle, tracks: [], loading: false });
      }
    },
    [browseAddonId, searchWithAddon, catalogProvider, appleStorefront]
  );

  const openArtistHubByName = useCallback(
    async (name: string) => {
      setHubOverlay({
        kind: 'artist',
        title: name,
        subtitle: 'Songs from catalog',
        tracks: [],
        loading: true,
      });
      try {
        let tracks: Track[] = [];
        if (browseAddonId) {
          const r = await searchWithAddon(browseAddonId, `${name} top songs`);
          tracks = r.tracks.map(addonTrackToTrack);
        } else {
          const res = await fetch(
            metadataSearchUrl({
              q: name,
              provider: catalogProvider,
              limit: 60,
              appleCountry: appleStorefront,
            })
          );
          const data = (await res.json()) as { tracks?: Record<string, unknown>[] };
          tracks = (Array.isArray(data.tracks) ? data.tracks : []).map((x) => mapMetadataSearchTrack(x));
        }
        setHubOverlay({
          kind: 'artist',
          title: name,
          subtitle: 'Songs from catalog',
          tracks,
          loading: false,
        });
      } catch {
        setHubOverlay({
          kind: 'artist',
          title: name,
          subtitle: 'Songs from catalog',
          tracks: [],
          loading: false,
        });
      }
    },
    [browseAddonId, searchWithAddon, catalogProvider, appleStorefront]
  );

  const openFeaturedArtistHub = useCallback(() => {
    if (!featuredArtist) return;
    void openArtistHubByName(featuredArtist.name);
  }, [featuredArtist, openArtistHubByName]);

  const quickAccess = useMemo(() => playlists.slice(0, 6), [playlists]);
  const quickTracks = useMemo(() => recentlyPlayed.slice(0, 4), [recentlyPlayed]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-black md:flex-row">
      <ScrollArea
        className={cn(
          'h-full min-h-0 min-w-0 flex-1 custom-scrollbar bg-black',
          hubOverlay && 'max-md:hidden'
        )}
      >
        <div className="p-4 md:p-8 space-y-8 pb-32">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">Home</h1>
            <p className="text-sm text-white/55">
              {greeting} —{' '}
              {browseAddonId
                ? 'Rails load from your connected module.'
                : `Discovery from Spotify (${appleStorefront}).`}
            </p>
          </div>

          {showRecentlyPlayed && recentlyPlayed.length > 0 && (
            <section>
              <SectionHeader
                title="Recently played"
                onSeeAll={
                  recentlyPlayed.length > RECENT_HOME_PREVIEW
                    ? () =>
                        setHubOverlay({
                          kind: 'recent',
                          title: 'Recently played',
                          subtitle: `${recentlyPlayed.length} tracks`,
                          tracks: recentlyPlayed,
                          loading: false,
                        })
                    : undefined
                }
              />
              <div className={cn(homeResponsiveRail)}>
                {recentlyPlayed.slice(0, RECENT_HOME_PREVIEW).map((track) => (
                  <HomeRecentCard key={track.id} track={track} />
                ))}
              </div>
            </section>
          )}

        {showQuickPicks && (
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
              <HomeTrackCard key={track.id} track={track} playerTheme={playerTheme} />
            ))}
          </section>
        )}

        {showTopTen && (
          <section>
            <SectionHeader
              title="Fresh Drops"
              badge={<AllInOneBadge />}
              onSeeAll={() => {
                if (freshTracks.length === 0) return;
                setHubOverlay({
                  kind: 'fresh',
                  title: 'Fresh Drops',
                  subtitle: 'From your latest home feed',
                  tracks: freshTracks,
                  loading: false,
                });
              }}
            />
            {feedLoading ? (
              <div className="flex items-center gap-2 py-8 text-white/50 text-sm">
                <Loader2 className="size-5 animate-spin" />
                Loading picks…
              </div>
            ) : (
              <div className={homeResponsiveRail}>
                {freshTracks.map((t) => (
                  <FreshDropCard
                    key={t.id}
                    title={t.title}
                    subtitle={t.artist}
                    cover={t.albumCover}
                    onClick={() => play(t)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {showDiscover && !browseAddonId && (
          <section className="space-y-6">
            {HOME_CATALOG_RAILS.map((r) => {
              const tracks = catalogRails[r.id] ?? [];
              return (
                <div key={r.id}>
                  <SectionHeader title={r.title} subtitle={r.subtitle} />
                  {catalogRailsLoading ? (
                    <div className="flex items-center gap-2 py-6 text-white/45 text-sm">
                      <Loader2 className="size-5 animate-spin" />
                      Loading…
                    </div>
                  ) : tracks.length === 0 ? (
                    <p className="text-xs text-white/40 py-2">No results for this rail.</p>
                  ) : (
                    <div className={homeResponsiveRail}>
                      {tracks.map((t) => (
                        <FreshDropCard
                          key={`${r.id}-${t.id}`}
                          title={t.title}
                          subtitle={t.artist}
                          cover={t.albumCover}
                          onClick={() => play(t)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {showDiscover && (
          <section>
            <SectionHeader title="Mood Mixes" badge={<AllInOneBadge />} />
            <div className={homeResponsiveRail}>
              {HOME_MOOD_MIXES.map((m) => (
                <motion.button
                  key={m.id}
                  type="button"
                  whileHover={{ y: -2 }}
                  disabled={moodLoadingId === m.id}
                  className="relative max-md:flex-shrink-0 w-[min(52vw,220px)] md:min-w-0 md:w-full aspect-[4/3] rounded-2xl overflow-hidden text-left border border-white/10 disabled:opacity-60"
                  style={{ background: m.gradient }}
                  onClick={() => void loadMood(m)}
                >
                  <span className="absolute inset-0 bg-black/25" />
                  {moodLoadingId === m.id && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="size-7 animate-spin text-white" />
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    <p className="text-lg font-bold text-white drop-shadow-md">{m.label}</p>
                    <p className="text-xs text-white/80 mt-0.5">{m.subtitle}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {showRecommendedArtists && (
          <section>
            <SectionHeader title="Popular Artists" badge={<AllInOneBadge />} />
            <div className={homeResponsiveRail}>
              {(popArtists.length > 0 ? popArtists : []).map((a) => (
                <motion.button
                  key={a.id}
                  type="button"
                  whileHover={{ y: -3 }}
                  className="max-md:flex-shrink-0 w-[min(38vw,150px)] md:min-w-0 md:w-full p-2 rounded-2xl text-left bg-white/5 hover:bg-white/10 border border-white/10"
                  onClick={() => void openArtistHubByName(a.name)}
                >
                  <div className="w-full aspect-square rounded-full overflow-hidden bg-white/10 shadow-lg mb-2.5 border border-white/10">
                    {a.image ? (
                      <img src={a.image} alt={a.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white/35">
                        {a.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white truncate px-0.5">{a.name}</div>
                  <div className="text-[11px] text-white/45 px-0.5">Artist</div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {showBrowseAll && featuredArtist && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl min-h-[180px] border border-white/10"
          >
            {featuredArtist.image ? (
              <img
                src={featuredArtist.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-sky-900 via-violet-900 to-black"
                aria-hidden
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
            <div className="relative z-10 p-6 md:p-8 flex flex-col justify-end min-h-[180px]">
              <span className="text-sky-400 text-xs font-semibold uppercase tracking-wide">Featured Artist</span>
              <h2 className="text-3xl md:text-4xl font-black text-white mt-1">{featuredArtist.name}</h2>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 w-fit rounded-full bg-white text-black hover:bg-white/90"
                onClick={() => openFeaturedArtistHub()}
              >
                Explore
              </Button>
            </div>
          </motion.section>
        )}

        {showBrowseAll && (
          <section>
            <SectionHeader
              title="Browse all"
              onSeeAll={() => {
                setSearchQuery('');
                setActiveView('search');
              }}
            />
            <div className={homeResponsiveRail}>
              {browseCategories.map((cat) => (
                <motion.button
                  key={cat.id}
                  type="button"
                  whileHover={{ y: -2 }}
                  className="relative max-md:flex-shrink-0 w-[min(52vw,220px)] md:min-w-0 md:w-full aspect-[4/3] rounded-2xl overflow-hidden text-left border border-white/10 group"
                  onClick={() => void openGenreHub(cat)}
                >
                  <img
                    src={cat.coverImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute inset-0" style={{ backgroundColor: cat.color, opacity: 0.4 }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    <h3 className="text-lg font-bold text-white drop-shadow-md leading-tight">{cat.name}</h3>
                    {cat.hubSubtitle && (
                      <p className="text-xs text-white/80 mt-0.5 line-clamp-2">{cat.hubSubtitle}</p>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>

    {hubOverlay && (
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col bg-[#050505] animate-in fade-in duration-200',
          'max-md:absolute max-md:inset-0 max-md:z-[70]',
          'md:relative md:h-full md:w-[min(520px,46%)] md:min-w-[300px] md:flex-shrink-0 md:border-l md:border-white/10'
        )}
        role="dialog"
        aria-modal
        aria-labelledby="home-hub-title"
      >
        <header className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setHubOverlay(null)}
            className="h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 shrink-0"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="home-hub-title" className="text-lg font-bold text-white truncate">
              {hubOverlay.title}
            </h2>
            {hubOverlay.subtitle && (
              <p className="text-xs text-white/45 truncate mt-0.5">{hubOverlay.subtitle}</p>
            )}
          </div>
        </header>
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <div className="p-4 pb-32 space-y-4">
            {hubOverlay.loading ? (
              <div className="flex items-center gap-2 py-16 text-white/50 text-sm justify-center">
                <Loader2 className="size-6 animate-spin" />
                Loading…
              </div>
            ) : hubOverlay.tracks.length === 0 ? (
              <p className="text-sm text-white/50 text-center py-12">No tracks found. Try another tile.</p>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-white text-black hover:bg-white/90"
                  onClick={() => play(hubOverlay.tracks[0], hubOverlay.tracks, 0)}
                >
                  Play all ({hubOverlay.tracks.length})
                </Button>
                <TrackList tracks={hubOverlay.tracks.slice(0, 60)} showAlbumArt showIndex />
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    )}
    </div>
  );
}
