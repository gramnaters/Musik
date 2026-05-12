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
import type { Track } from '@/types/music';
import { useUIStore } from '@/stores/uiStore';
import { useMetadataStore } from '@/stores/metadataStore';
import { SEARCH_CATEGORY_TILES } from '@/lib/search-categories';
import { metadataSearchUrl } from '@/lib/catalog-api';
import { addonTrackToTrack } from '@/lib/addon-track-map';
import { mapMetadataSearchTrack } from '@/lib/map-metadata-track';
import { addonThumbSrc } from '@/lib/addon-thumb';

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { play } = usePlayerStore();
  const { addRecentlyPlayed } = useLibraryStore();
  const { addons, setActiveAddon, isSearching, searchWithAddon, error: addonError, clearError } = useAddonStore();
  const { navigateTo, searchQuery, setSearchQuery } = useUIStore();
  const { catalogProvider } = useMetadataStore();
  const appleStorefront = useMetadataStore((s) => s.appleStorefront ?? 'US');
  const [addonResults, setAddonResults] = useState<Track[]>([]);
  /** Selected search module; `null` when no search-capable addons are installed. */
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
  const activeAddon = addons.find((a) => a.manifest.id === addonSearchId);

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
        return;
      }
      try {
        const results = await searchWithAddon(id, q);
        setAddonResults((results.tracks || []).map(addonTrackToTrack));
      } catch {
        setAddonResults([]);
      }
    },
    [searchWithAddon]
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
        setHasSearched(false);
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

  const allResults = useMemo(() => {
    if (!hasSearched || !query.trim()) return [];
    if (addonSearchId) return addonResults;
    return localLibraryResults;
  }, [hasSearched, query, addonSearchId, addonResults, localLibraryResults]);

  const showAddonSearching = isSearching && hasSearched && Boolean(addonSearchId);
  const showBlockingLoader =
    allResults.length === 0 && hasSearched && showAddonSearching;
  const showNoResults =
    hasSearched && !isSearching && allResults.length === 0 && query.trim();

  const searchSourceLabel = useMemo(() => {
    if (addonSearchId) {
      return enabledAddons.find((x) => x.manifest.id === addonSearchId)?.manifest.name ?? 'Module';
    }
    return 'Your library';
  }, [addonSearchId, enabledAddons]);

  const openBrowseHub = async (tile: (typeof SEARCH_CATEGORY_TILES)[number]) => {
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
        h
          ? { ...h, tracks: rows.map((x) => mapMetadataSearchTrack(x)), loading: false }
          : null
      );
    } catch {
      setBrowseHub((h) => (h ? { ...h, tracks: [], loading: false } : null));
    }
  };

  const artistResults = useMemo(() => {
    const map = new Map<string, { id: string; name: string; image?: string }>();
    allResults.forEach((t) => {
      const k = t.artistId || t.artist;
      if (!map.has(k)) {
        map.set(k, { id: k, name: t.artist, image: t.albumCover });
      }
    });
    return Array.from(map.values());
  }, [allResults]);

  return (
    <ScrollArea className="h-full custom-scrollbar bg-black">
      <div className="p-4 md:p-6 space-y-5 pb-32 text-white">
        {browseHub ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBrowseHub(null)}
                className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white"
                aria-label="Back"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight truncate">{browseHub.label}</h1>
                {browseHub.subtitle && <p className="text-sm text-white/50 truncate">{browseHub.subtitle}</p>}
                <p className="text-[11px] text-white/40 mt-0.5">From Spotify (Settings → Metadata)</p>
              </div>
            </div>
            {browseHub.loading ? (
              <div className="flex items-center gap-3 py-16 justify-center text-white/60">
                <Loader2 size={22} className="animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : browseHub.tracks.length === 0 ? (
              <p className="text-sm text-white/50 py-12 text-center">No tracks for this category.</p>
            ) : (
              <>
                <Button
                  size="sm"
                  className="rounded-full bg-white text-black hover:bg-white/90"
                  onClick={() => {
                    play(browseHub.tracks[0], browseHub.tracks, 0);
                    browseHub.tracks.forEach((t) => addRecentlyPlayed(t));
                  }}
                >
                  <Play size={16} fill="currentColor" className="mr-1.5" />
                  Play all ({browseHub.tracks.length})
                </Button>
                <TrackList tracks={browseHub.tracks} showAlbumArt showIndex />
              </>
            )}
          </div>
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
                  addonSearchId ? `Search ${searchSourceLabel}…` : 'Search songs in your library…'
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
                    setHasSearched(false);
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
                    No search modules installed. Search matches tracks from the built-in demo library, or install a
                    search module in Connections.
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

            {addonError && hasSearched && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/15 text-red-200 text-sm border border-red-500/30">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Search failed</p>
                  <p className="text-xs opacity-90 mt-1">{addonError}</p>
                </div>
              </div>
            )}

            {!query.trim() && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
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
                  className="space-y-6"
                >
                  <Tabs defaultValue="tracks" className="w-full">
                    <TabsList className="bg-transparent border-b border-white/10 rounded-none h-auto p-0 w-full justify-start gap-6">
                      <TabsTrigger
                        value="tracks"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:shadow-none text-white/50 data-[state=active]:text-white pb-2 px-0"
                      >
                        Tracks
                      </TabsTrigger>
                      <TabsTrigger
                        value="artists"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:shadow-none text-white/50 data-[state=active]:text-white pb-2 px-0"
                      >
                        Artists
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tracks" className="mt-4">
                      {hasSearched && addonSearchId && !isSearching && addonResults.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 text-xs text-white/50">
                          <Wifi size={12} className="text-emerald-400" />
                          <span>
                            {addonResults.length} from {activeAddon?.manifest.name || 'module'}
                          </span>
                        </div>
                      )}
                      {hasSearched &&
                        !isSearching &&
                        !addonSearchId &&
                        localLibraryResults.length > 0 && (
                          <div className="flex items-center gap-2 mb-4 text-xs text-white/50">
                            <span className="inline-flex size-2 rounded-full bg-emerald-400" />
                            <span>Demo library matches</span>
                          </div>
                        )}

                      {showBlockingLoader && (
                        <div className="flex items-center gap-3 py-8 justify-center">
                          <Loader2 size={20} className="animate-spin text-white" />
                          <span className="text-sm text-white/60">Searching…</span>
                        </div>
                      )}

                      {!showBlockingLoader && allResults.length > 0 && (
                        <div className="flex items-center gap-4 mb-4">
                          <h2 className="text-xl font-bold">Songs</h2>
                          <Button
                            size="sm"
                            onClick={() => {
                              play(allResults[0], allResults, 0);
                              allResults.forEach((t) => addRecentlyPlayed(t));
                            }}
                            className="w-9 h-9 rounded-full bg-white hover:bg-white/90 text-black p-0"
                          >
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </Button>
                          <span className="text-sm text-white/50">{allResults.length} results</span>
                        </div>
                      )}

                      {!showBlockingLoader && allResults.length > 0 && (
                        <TrackList tracks={allResults} showAlbumArt showIndex />
                      )}
                    </TabsContent>

                    <TabsContent value="artists" className="mt-4">
                      {!showBlockingLoader && artistResults.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {artistResults.map((artist) => (
                            <div
                              key={artist.id}
                              role="button"
                              tabIndex={0}
                              className="flex flex-col items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                              onClick={() => {
                                const artistTracks = allResults.filter(
                                  (t) => t.artistId === artist.id || t.artist === artist.name
                                );
                                if (artistTracks.length > 0) play(artistTracks[0], artistTracks, 0);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  const artistTracks = allResults.filter(
                                    (t) => t.artistId === artist.id || t.artist === artist.name
                                  );
                                  if (artistTracks.length > 0) play(artistTracks[0], artistTracks, 0);
                                }
                              }}
                            >
                              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-white/10 shadow-lg shadow-black/40">
                                {artist.image ? (
                                  <img
                                    src={artist.image}
                                    alt={artist.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white/40">{artist.name.charAt(0)}</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-medium text-center">{artist.name}</span>
                              <span className="text-xs text-white/45">Artist</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>

            {showNoResults && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <p className="text-xl font-bold mb-2">No results found for &quot;{query}&quot;</p>
                <p className="text-sm text-white/50">Try another keyword, or connect a search module in Connections.</p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
