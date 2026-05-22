'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAddonStore } from '@/stores/addonStore';
import { demoTracks } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrackList from '@/components/shared/TrackList';
import {
  Search as SearchIcon,
  X,
  Play,
  Loader2,
  Wifi,
  WifiOff,
  ChevronDown,
  Puzzle,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Album, CatalogPodcast, Track } from '@/types/music';
import { useUIStore } from '@/stores/uiStore';
import { useMetadataStore } from '@/stores/metadataStore';
import { SEARCH_CATEGORY_TILES } from '@/lib/search-categories';
import { metadataSearchBundleUrl, metadataSearchUrl } from '@/lib/catalog-api';
import { addonTrackToTrack } from '@/lib/addon-track-map';
import { mapMetadataSearchTrack } from '@/lib/map-metadata-track';
import { addonThumbSrc } from '@/lib/addon-thumb';
import { buildMergedCatalogBundle, parseAddonHubId } from '@/lib/search-addon-catalog';
import type { AddonSearchResults } from '@/types/addon';

type CatalogArtist = { id: string; name: string; image?: string };
type CatalogPlaylistRow = {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  trackCount?: number;
};

type CatalogBundle = {
  tracks: Track[];
  albums: Album[];
  artists: CatalogArtist[];
  playlists: CatalogPlaylistRow[];
  podcasts: CatalogPodcast[];
  /** When Apple is the catalog provider, playlists may still come from Spotify (iTunes has no playlist search). */
  playlistResultsSource?: 'spotify' | 'none';
};

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [catalogTab, setCatalogTab] = useState('tracks');
  const [catalogBundle, setCatalogBundle] = useState<CatalogBundle | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogHub, setCatalogHub] = useState<{
    kind: 'playlist' | 'album' | 'artist';
    title: string;
    subtitle?: string;
    tracks: Track[];
    loading: boolean;
  } | null>(null);

  const { play } = usePlayerStore();
  const { addRecentlyPlayed } = useLibraryStore();
  const { addons, setActiveAddon, isSearching, searchWithAddon, error: addonError, clearError, getAlbumTracksForAddon, getPlaylistTracksForAddon, getArtistTracksForAddon } = useAddonStore();
  const { navigateTo, searchQuery, setSearchQuery } = useUIStore();
  const catalogProvider = useMetadataStore((s) => s.catalogProvider);
  const appleStorefront = useMetadataStore((s) => s.appleStorefront ?? 'US');
  const [addonResults, setAddonResults] = useState<Track[]>([]);
  const [addonSearchSnapshot, setAddonSearchSnapshot] = useState<AddonSearchResults | null>(null);
  const [addonSearchId, setAddonSearchId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [browseHub, setBrowseHub] = useState<{
    id: string;
    label: string;
    subtitle?: string;
    catalogQuery: string;
    tracks: Track[];
    loading: boolean;
  } | null>(null);

  const enabledAddons = useMemo(
    () => addons.filter((a) => a.enabled && a.manifest.resources?.includes('search')),
    [addons]
  );
  const hasAddons = enabledAddons.length > 0;
  const catalogLabel = catalogProvider === 'apple' ? 'Apple Music' : 'Spotify';

  useEffect(() => {
    if (!enabledAddons.length) {
      setAddonSearchId(null);
      return;
    }
    setAddonSearchId((cur) => {
      if (cur && enabledAddons.some((a) => a.manifest.id === cur)) return cur;
      return enabledAddons[0]!.manifest.id;
    });
  }, [enabledAddons]);

  useEffect(() => {
    if (addonSearchId) setActiveAddon(addonSearchId);
  }, [addonSearchId, setActiveAddon]);

  const localLibraryResults = useMemo(() => {
    if (!hasSearched || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return demoTracks.filter((t) =>
      `${t.title} ${t.artist} ${t.album || ''}`.toLowerCase().includes(q)
    );
  }, [hasSearched, query]);

  const doAddonSearch = useCallback(
    async (q: string, id: string) => {
      if (!q.trim() || !id) {
        setAddonResults([]);
        setAddonSearchSnapshot(null);
        return;
      }
      try {
        const results = await searchWithAddon(id, q);
        setAddonSearchSnapshot(results);
        setAddonResults((results.tracks || []).map(addonTrackToTrack));

        if (catalogProvider === 'addon') {
          setCatalogBundle({
            tracks: (results.tracks || []).map(addonTrackToTrack),
            albums: (results.albums || []).map((a) => ({
              id: a.id,
              title: a.title || a.name || '',
              artist: a.artistName || a.artist || '',
              cover: a.cover || a.artworkURL,
              year: a.year,
              trackCount: a.trackCount || a.numberOfTracks,
            })),
            artists: (results.artists || []).map((art) => ({
              id: art.id,
              name: art.name,
              cover: art.image || art.artworkURL,
            }) as any),
            playlists: (results.playlists || []).map((pl) => ({
              id: pl.id,
              name: pl.name || pl.title || '',
              description: pl.description,
              cover: pl.cover || pl.artworkURL || pl.image,
              trackCount: pl.trackCount,
            }) as any),
            podcasts: [],
          });
        }
      } catch {
        setAddonSearchSnapshot(null);
        setAddonResults([]);
      }
    },
    [searchWithAddon, catalogProvider]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSearchQuery(value);
      if (addonError) clearError();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim()) {
        setHasSearched(true);
        if (addonSearchId) {
          debounceRef.current = setTimeout(() => void doAddonSearch(value, addonSearchId), 400);
        }
      } else {
        setAddonResults([]);
        setAddonSearchSnapshot(null);
        setHasSearched(false);
        setCatalogBundle(null);
        setCatalogHub(null);
        setCatalogError(null);
      }
    },
    [addonSearchId, doAddonSearch, addonError, clearError, setSearchQuery]
  );

  useEffect(() => {
    if (typeof searchQuery !== 'string') return;
    if (searchQuery === query) return;
    handleQueryChange(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const lastAddonSearchRef = useRef<string | null>(null);
  useEffect(() => {
    if (!addonSearchId || !query.trim()) {
      lastAddonSearchRef.current = addonSearchId;
      return;
    }
    if (lastAddonSearchRef.current === addonSearchId) return;
    lastAddonSearchRef.current = addonSearchId;
    void doAddonSearch(query, addonSearchId);
  }, [addonSearchId, query, doAddonSearch]);

  useEffect(() => {
    const q = query.trim();
    if (!hasSearched || !q || catalogProvider === 'addon') {
      if (catalogProvider !== 'addon') {
        setCatalogBundle(null);
        setCatalogLoading(false);
      }
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(() => {
      void (async () => {
        setCatalogLoading(true);
        setCatalogError(null);
        try {
          const res = await fetch(
            metadataSearchBundleUrl({
              q,
              provider: catalogProvider,
              limit: 40,
              appleCountry: appleStorefront,
              market: appleStorefront,
            }),
            { signal: ac.signal }
          );
          if (!res.ok) {
            let detail = '';
            try { const e = await res.json(); detail = e.error || `HTTP ${res.status}`; } catch { detail = `HTTP ${res.status}`; }
            throw new Error(detail);
          }
          const data = (await res.json()) as {
            tracks?: Record<string, unknown>[];
            albums?: Record<string, unknown>[];
            artists?: CatalogArtist[];
            playlists?: CatalogPlaylistRow[];
            podcasts?: CatalogPodcast[];
            playlistResultsSource?: 'spotify' | 'none';
          };
          if (ac.signal.aborted) return;
          const tracks = (data.tracks || []).map((x) => mapMetadataSearchTrack(x));
          const albums: Album[] = (data.albums || []).map((a) => ({
            id: String(a.id ?? ''),
            title: String(a.title ?? ''),
            artist: String(a.artist ?? ''),
            cover: typeof a.cover === 'string' ? a.cover : undefined,
            year: typeof a.year === 'string' ? a.year : undefined,
            trackCount: typeof a.trackCount === 'number' ? a.trackCount : undefined,
          }));
          setCatalogBundle({
            tracks,
            albums,
            artists: data.artists || [],
            playlists: data.playlists || [],
            podcasts: data.podcasts || [],
            playlistResultsSource: data.playlistResultsSource,
          });
        } catch (err) {
          if (!ac.signal.aborted) {
            setCatalogBundle(null);
            setCatalogError(err instanceof Error ? err.message : 'Search failed');
          }
        } finally {
          if (!ac.signal.aborted) setCatalogLoading(false);
        }
      })();
    }, 400);
    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [query, hasSearched, catalogProvider, appleStorefront]);

  const displayCatalogBundle = useMemo(() => {
    if (!catalogBundle) return null;
    return buildMergedCatalogBundle(
      catalogBundle,
      addonSearchId,
      addonSearchSnapshot,
      addonResults
    );
  }, [catalogBundle, addonSearchId, addonSearchSnapshot, addonResults]);

  const trackListResults = useMemo(() => {
    if (!hasSearched || !query.trim()) return [];
    if (displayCatalogBundle?.tracks?.length) return displayCatalogBundle.tracks;
    if (addonSearchId && addonResults.length) return addonResults;
    return catalogBundle?.tracks?.length ? catalogBundle.tracks : localLibraryResults;
  }, [
    hasSearched,
    query,
    addonSearchId,
    addonResults,
    catalogBundle,
    displayCatalogBundle,
    localLibraryResults,
  ]);

  const showAddonSearching = isSearching && hasSearched && Boolean(addonSearchId);
  const showCatalogBlocking = catalogLoading && !catalogBundle && !addonSearchId;
  const showBlockingLoader =
    (addonSearchId && showAddonSearching && trackListResults.length === 0) || showCatalogBlocking;

  const catalogCount =
    (displayCatalogBundle?.tracks.length ?? 0) +
    (displayCatalogBundle?.albums.length ?? 0) +
    (displayCatalogBundle?.artists.length ?? 0) +
    (displayCatalogBundle?.playlists.length ?? 0) +
    (displayCatalogBundle?.podcasts.length ?? 0);

  const showNoResults =
    hasSearched &&
    query.trim() &&
    !catalogLoading &&
    !(addonSearchId && isSearching) &&
    trackListResults.length === 0 &&
    catalogCount === 0;

  const searchSourceLabel = useMemo(() => {
    if (addonSearchId) {
      return enabledAddons.find((x) => x.manifest.id === addonSearchId)?.manifest.name ?? 'Module';
    }
    return 'Your library';
  }, [addonSearchId, enabledAddons]);

  const openBrowseHub = async (tile: (typeof SEARCH_CATEGORY_TILES)[number]) => {
    setCatalogHub(null);
    setBrowseHub({
      id: tile.id,
      label: tile.label,
      subtitle: tile.subtitle,
      catalogQuery: tile.catalogQuery,
      tracks: [],
      loading: true,
    });
    try {
      const res = await fetch(
        metadataSearchUrl({
          q: tile.catalogQuery,
          provider: catalogProvider,
          limit: 60,
          appleCountry: appleStorefront,
        })
      );
      const data = (await res.json()) as { tracks?: Record<string, unknown>[] };
      const rows = data.tracks || [];
      setBrowseHub((h) =>
        h ? { ...h, tracks: rows.map((x) => mapMetadataSearchTrack(x)), loading: false } : null
      );
    } catch {
      setBrowseHub((h) => (h ? { ...h, tracks: [], loading: false } : null));
    }
  };

  const openCatalogTracksHub = useCallback(
    async (opts: {
      kind: 'playlist' | 'album' | 'artist';
      title: string;
      subtitle?: string;
      id?: string;
      artistName?: string;
    }) => {
    setBrowseHub(null);
    setCatalogHub({ kind: opts.kind, title: opts.title, subtitle: opts.subtitle, tracks: [], loading: true });
    try {
      let tracks: Track[] = [];
      const parsed = opts.id ? parseAddonHubId(opts.id) : null;
      if (parsed) {
        if (parsed.entity === 'artist') {
          const raw = await getArtistTracksForAddon(parsed.addonId, parsed.remoteId);
          tracks = raw.map(addonTrackToTrack);
        } else if (parsed.entity === 'album') {
          const raw = await getAlbumTracksForAddon(parsed.addonId, parsed.remoteId);
          tracks = raw.map(addonTrackToTrack);
        } else if (parsed.entity === 'playlist') {
          const raw = await getPlaylistTracksForAddon(parsed.addonId, parsed.remoteId);
          tracks = raw.map(addonTrackToTrack);
        }
      } else if (opts.kind === 'artist' && opts.artistName) {
        const res = await fetch(
          metadataSearchUrl({
            q: opts.artistName,
            provider: catalogProvider,
            limit: 60,
            appleCountry: appleStorefront,
          })
        );
        const data = (await res.json()) as { tracks?: Record<string, unknown>[] };
        tracks = (data.tracks || []).map((x) => mapMetadataSearchTrack(x));
      } else if (opts.id) {
        const params = new URLSearchParams({ id: opts.id, provider: catalogProvider });
        if (catalogProvider === 'apple') params.set('country', appleStorefront);
        else params.set('market', appleStorefront);
        const res = await fetch(`/api/metadata/playlist-items?${params}`);
        const data = (await res.json()) as { tracks?: Record<string, unknown>[] };
        tracks = (data.tracks || []).map((x) => mapMetadataSearchTrack(x));
      }
      setCatalogHub((h) => (h ? { ...h, tracks, loading: false } : null));
    } catch {
      setCatalogHub((h) => (h ? { ...h, tracks: [], loading: false } : null));
    }
  },
  [
    catalogProvider,
    appleStorefront,
    getAlbumTracksForAddon,
    getPlaylistTracksForAddon,
    getArtistTracksForAddon,
  ]
);

  const tabTriggerClass =
    'rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-white/45 data-[state=active]:text-white pb-2 px-0 text-sm font-medium';

  const hubBack = () => {
    if (catalogHub) setCatalogHub(null);
    else setBrowseHub(null);
  };

  const renderHub = (
    title: string,
    subtitle: string | undefined,
    tracks: Track[],
    loading: boolean,
    sourceNote: string,
    onBack: () => void
  ) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-white/50 truncate">{subtitle}</p>}
          <p className="text-[11px] text-white/40 mt-0.5">{sourceNote}</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-3 py-16 justify-center text-white/60">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-sm text-white/50 py-12 text-center">Nothing to play here.</p>
      ) : (
        <>
          <Button
            size="sm"
            className="rounded-full bg-white text-black hover:bg-white/90"
            onClick={() => {
              play(tracks[0], tracks, 0);
              tracks.forEach((t) => addRecentlyPlayed(t));
            }}
          >
            <Play size={16} fill="currentColor" className="mr-1.5" />
            Play all ({tracks.length})
          </Button>
          <TrackList tracks={tracks} showAlbumArt showIndex />
        </>
      )}
    </div>
  );

  return (
    <ScrollArea className="h-full custom-scrollbar bg-black">
      <div className="p-4 md:p-6 space-y-5 pb-32 text-white">
        {catalogHub ? (
          renderHub(
            catalogHub.title,
            catalogHub.subtitle,
            catalogHub.tracks,
            catalogHub.loading,
            `${catalogLabel} • ${catalogHub.kind === 'artist' ? 'Top results' : 'Track list'}`,
            () => setCatalogHub(null)
          )
        ) : browseHub ? (
          renderHub(
            browseHub.label,
            browseHub.subtitle,
            browseHub.tracks,
            browseHub.loading,
            `${catalogLabel} (Settings → Metadata provider)`,
            () => setBrowseHub(null)
          )
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Search</h1>
              {hasAddons && enabledAddons.length > 1 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 px-3 gap-1.5 rounded-full border-white/10 bg-white/5 text-sky-300 hover:bg-white/10 hover:text-sky-200"
                    >
                      <span className="text-sm font-medium max-w-[160px] truncate">{searchSourceLabel}</span>
                      <ChevronDown size={14} className="text-white/60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-72 bg-[#1c1c1e] border-white/10 p-1 max-h-[min(70vh,420px)] overflow-y-auto custom-scrollbar"
                    align="end"
                  >
                    {enabledAddons.map((addon) => {
                      const src = addonThumbSrc(addon.manifest.icon, addon.manifest.baseURL || '');
                      return (
                        <button
                          key={addon.manifest.id}
                          type="button"
                          onClick={() => setAddonSearchId(addon.manifest.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left',
                            addonSearchId === addon.manifest.id
                              ? 'bg-white/10 text-white'
                              : 'text-white/70 hover:bg-white/5'
                          )}
                        >
                          <span className="size-9 rounded-lg overflow-hidden bg-zinc-800 border border-white/10 shrink-0 flex items-center justify-center">
                            {src ? (
                              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <Puzzle className="size-4 text-zinc-500" />
                            )}
                          </span>
                          <span className="truncate">{addon.manifest.name}</span>
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              ) : hasAddons ? (
                <span className="h-9 px-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-sky-300 max-w-[200px] truncate">
                  {searchSourceLabel}
                </span>
              ) : (
                <span className="h-9 px-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white/50">
                  Local library
                </span>
              )}
            </div>

            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder={
                  addonSearchId
                    ? `Search ${searchSourceLabel}…`
                    : `Search ${catalogLabel} and your library…`
                }
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className={cn(
                  'pl-12 pr-11 h-14 bg-[#1c1c1e] border border-white/10 text-white placeholder:text-white/40 rounded-full',
                  'focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/20'
                )}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    handleQueryChange('');
                    setAddonResults([]);
                    setAddonSearchSnapshot(null);
                    setHasSearched(false);
                    setCatalogBundle(null);
                    if (addonError) clearError();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {!hasAddons && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#1c1c1e] border border-white/10 text-sm">
                <WifiOff size={20} className="text-white/50 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white/70">
                    No search modules installed. Tracks below use {catalogLabel} (Settings → Metadata provider) or
                    the demo library.
                  </p>
                  <Button
                    className="mt-3 h-9 rounded-full bg-white text-black hover:bg-white/90 text-xs font-semibold"
                    onClick={() => navigateTo('connections')}
                  >
                    Open Connections
                  </Button>
                </div>
              </div>
            )}

            {(addonError && hasSearched) && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/15 text-red-200 text-sm border border-red-500/30">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Search failed</p>
                  <p className="text-xs opacity-90 mt-1">{addonError}</p>
                </div>
              </div>
            )}

            {catalogError && hasSearched && !addonSearchId && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/15 text-amber-200 text-sm border border-amber-500/30">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Search unavailable</p>
                  <p className="text-xs opacity-90 mt-1">{catalogError}.</p>
                  <p className="text-xs opacity-70 mt-1">Check Settings → Metadata provider or try again later.</p>
                </div>
              </div>
            )}

            {!query.trim() && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-3">
                {SEARCH_CATEGORY_TILES.map((tile) => (
                  <motion.button
                    type="button"
                    key={tile.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="aspect-[4/3] rounded-2xl text-left relative overflow-hidden border border-white/10 min-h-[100px] group"
                    onClick={() => void openBrowseHub(tile)}
                  >
                    <img
                      src={tile.coverImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute inset-0" style={{ background: tile.gradient }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                      <h3 className="text-sm font-bold text-white drop-shadow-md leading-tight">{tile.label}</h3>
                      {tile.subtitle && (
                        <p className="text-[11px] text-white/75 mt-0.5 line-clamp-2">{tile.subtitle}</p>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {(hasSearched || query.trim()) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                      Search results for &quot;{query.trim() || '…'}&quot;
                    </h2>
                    <p className="text-xs text-white/40 mt-1">
                      {addonSearchId
                        ? `Results merge your module with ${catalogLabel}. Albums, playlists, and artists from the module open as playable lists.`
                        : `${catalogLabel} catalog • storefront ${appleStorefront}`}
                    </p>
                  </div>

                  <Tabs value={catalogTab} onValueChange={setCatalogTab} className="w-full">
                    <TabsList className="bg-transparent border-b border-white/10 rounded-none h-auto p-0 w-full justify-start gap-5 overflow-x-auto flex-nowrap">
                      <TabsTrigger value="tracks" className={tabTriggerClass}>
                        Tracks
                      </TabsTrigger>
                      <TabsTrigger value="albums" className={tabTriggerClass}>
                        Albums
                      </TabsTrigger>
                      <TabsTrigger value="artists" className={tabTriggerClass}>
                        Artists
                      </TabsTrigger>
                      <TabsTrigger value="playlists" className={tabTriggerClass}>
                        Playlists
                      </TabsTrigger>
                      <TabsTrigger value="podcasts" className={tabTriggerClass}>
                        Podcasts
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tracks" className="mt-4">
                      {addonSearchId && hasSearched && !isSearching && (displayCatalogBundle?.tracks?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-2 mb-4 text-xs text-white/50">
                          <Wifi size={12} className="text-emerald-400" />
                          <span>
                            {displayCatalogBundle?.tracks?.length ?? 0} tracks (module + catalog)
                          </span>
                        </div>
                      )}
                      {!addonSearchId && catalogBundle && (
                        <div className="flex items-center gap-2 mb-4 text-xs text-white/50">
                          <span className="inline-flex size-2 rounded-full bg-emerald-400" />
                          <span>
                            {catalogBundle.tracks.length} from {catalogLabel}
                          </span>
                        </div>
                      )}
                      {hasSearched && !addonSearchId && localLibraryResults.length > 0 && !catalogBundle?.tracks.length && (
                        <div className="flex items-center gap-2 mb-4 text-xs text-white/50">
                          <span className="inline-flex size-2 rounded-full bg-amber-400" />
                          <span>Demo library</span>
                        </div>
                      )}

                      {showBlockingLoader && (
                        <div className="space-y-1">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton-track">
                              <div className="skeleton skeleton-track-cover" />
                              <div className="skeleton-track-info">
                                <div className="skeleton skeleton-track-title" />
                                <div className="skeleton skeleton-track-artist" />
                              </div>
                              <div className="skeleton skeleton-track-duration" />
                            </div>
                          ))}
                        </div>
                      )}

                      {!showBlockingLoader && trackListResults.length > 0 && (
                        <div className="flex items-center gap-4 mb-4">
                          <h3 className="text-lg font-bold">Songs</h3>
                          <Button
                            size="sm"
                            onClick={() => {
                              play(trackListResults[0], trackListResults, 0);
                              trackListResults.forEach((t) => addRecentlyPlayed(t));
                            }}
                            className="w-9 h-9 rounded-full bg-white hover:bg-white/90 text-black p-0"
                          >
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </Button>
                          <span className="text-sm text-white/50">{trackListResults.length} results</span>
                        </div>
                      )}

                      {!showBlockingLoader && trackListResults.length > 0 && (
                        <TrackList tracks={trackListResults} showAlbumArt showIndex />
                      )}
                    </TabsContent>

                    <TabsContent value="albums" className="mt-4">
                      {catalogLoading && !(displayCatalogBundle?.albums?.length) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="skeleton-card">
                              <div className="skeleton skeleton-card-image" />
                              <div className="skeleton skeleton-card-title" />
                              <div className="skeleton skeleton-card-subtitle" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                          {(displayCatalogBundle?.albums || []).map((album) => (
                            <button
                              key={album.id}
                              type="button"
                              className="text-left group"
                              onClick={() =>
                                void openCatalogTracksHub({
                                  kind: 'album',
                                  title: album.title,
                                  subtitle: `${album.artist}${album.year ? ` • ${album.year}` : ''}`,
                                  id: album.id,
                                })
                              }
                            >
                              <div className="aspect-square rounded-xl overflow-hidden bg-white/10 border border-white/10 shadow-lg">
                                {album.cover ? (
                                  <img src={album.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm font-semibold line-clamp-2 group-hover:text-red-400 transition-colors">
                                {album.title}
                              </p>
                              <p className="text-xs text-white/45 line-clamp-1">
                                {album.artist}
                                {album.year ? ` • ${album.year}` : ''}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="artists" className="mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {(displayCatalogBundle?.artists || []).map((artist) => (
                          <button
                            key={artist.id}
                            type="button"
                            className="flex items-center gap-3 p-3 rounded-xl bg-[#141414] border border-white/10 hover:bg-white/5 text-left min-w-0"
                            onClick={() =>
                              void openCatalogTracksHub({
                                kind: 'artist',
                                title: artist.name,
                                subtitle: 'Top tracks',
                                artistName: artist.name,
                                id: artist.id,
                              })
                            }
                          >
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 shrink-0">
                              {artist.image ? (
                                <img src={artist.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/35">
                                  {artist.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium truncate">{artist.name}</span>
                          </button>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="playlists" className="mt-4">
                      {catalogProvider === 'apple' &&
                        catalogBundle?.playlistResultsSource === 'spotify' &&
                        !(addonSearchId && (displayCatalogBundle?.playlists?.length ?? 0) > 0) && (
                        <p className="text-xs text-white/45 mb-3 max-w-xl">
                          Playlist search uses Spotify while your catalog region is Apple (the iTunes Search API has no
                          playlist entity). Albums and songs still use Apple.
                        </p>
                      )}
                      {catalogProvider === 'apple' &&
                        catalogBundle?.playlistResultsSource === 'none' &&
                        (displayCatalogBundle?.playlists?.length ?? 0) === 0 && (
                          <p className="text-xs text-amber-200/80 mb-3 max-w-xl">
                            No playlists: add Spotify client credentials on the server so we can search Spotify
                            playlists alongside Apple results.
                          </p>
                        )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                        {(displayCatalogBundle?.playlists || []).map((pl) => (
                          <button
                            key={pl.id}
                            type="button"
                            className="text-left group"
                            onClick={() =>
                              void openCatalogTracksHub({
                                kind: 'playlist',
                                title: pl.name,
                                subtitle: pl.description,
                                id: pl.id,
                              })
                            }
                          >
                            <div className="aspect-square rounded-xl overflow-hidden bg-white/10 border border-white/10">
                              {pl.cover ? (
                                <img src={pl.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm font-semibold line-clamp-2">{pl.name}</p>
                            <p className="text-xs text-white/45">
                              {typeof pl.trackCount === 'number' ? `${pl.trackCount} tracks` : pl.description || ''}
                            </p>
                          </button>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="podcasts" className="mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(displayCatalogBundle?.podcasts || []).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="text-left rounded-2xl border border-white/10 bg-[#141414] p-4 hover:bg-white/5 transition-colors"
                            onClick={() => {
                              if (p.externalUrl) {
                                window.open(p.externalUrl, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <div className="flex gap-3">
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/10 shrink-0">
                                {p.cover ? (
                                  <img src={p.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold line-clamp-2">{p.title}</p>
                                <p className="text-xs text-white/45 mt-1 line-clamp-1">{p.author}</p>
                                {typeof p.episodeCount === 'number' && (
                                  <p className="text-[11px] text-white/35 mt-2">{p.episodeCount} episodes</p>
                                )}
                              </div>
                            </div>
                            {p.description ? (
                              <p className="text-xs text-white/40 mt-3 line-clamp-3">{p.description}</p>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>

            {showNoResults && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <p className="text-xl font-bold mb-2">No results found for &quot;{query}&quot;</p>
                <p className="text-sm text-white/50">
                  Try another keyword, switch metadata provider in Settings, or connect a search module.
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
