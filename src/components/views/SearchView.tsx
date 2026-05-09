'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAddonStore } from '@/stores/addonStore';
import { browseCategories, formatDuration } from '@/lib/demo-data';
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
  Music,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Track } from '@/types/music';
import type { AddonTrack } from '@/types/addon';
import { useUIStore } from '@/stores/uiStore';

function addonTrackToTrack(t: AddonTrack): Track {
  return {
    id: `addon_${t.addonId}_${t.id}`,
    title: t.title,
    artist: t.artist,
    album: t.album,
    albumCover: t.artworkURL || t.cover,
    duration: t.duration,
    streamURL: t.streamURL,
    albumId: t.albumId,
    artistId: t.artistId,
    addonId: t.addonId,
    addonTrackId: t.id,
  };
}

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { play } = usePlayerStore();
  const { addRecentlyPlayed } = useLibraryStore();
  const { addons, activeAddonId, setActiveAddon, isSearching, search, searchResults, error: addonError, clearError } = useAddonStore();
  const { navigateTo } = useUIStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addonResults, setAddonResults] = useState<Track[]>([]);

  const activeAddon = addons.find((a) => a.manifest.id === activeAddonId);
  const hasAddons = addons.filter((a) => a.enabled).length > 0;
  const enabledAddons = addons.filter((a) => a.enabled && a.manifest.resources?.includes('search'));

  // Addon search (debounced)
  const doAddonSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !activeAddonId) {
        setAddonResults([]);
        return;
      }
      try {
        const results = await search(q);
        const tracks = (results.tracks || []).map(addonTrackToTrack);
        setAddonResults(tracks);
      } catch {
        setAddonResults([]);
      }
    },
    [activeAddonId, search]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (addonError) clearError();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim()) {
        setHasSearched(true);
        if (activeAddonId) {
          debounceRef.current = setTimeout(() => doAddonSearch(value), 400);
        } else {
          setAddonResults([]);
        }
      } else {
        setAddonResults([]);
        setHasSearched(false);
      }
    },
    [activeAddonId, doAddonSearch, addonError, clearError]
  );

  const allResults = useMemo(() => {
    if (!hasSearched) return [];
    if (!activeAddonId) return addonResults;
    return addonResults;
  }, [addonResults, hasSearched, activeAddonId]);

  const showAddonsSearching = isSearching && hasSearched;
  const showNoResults = hasSearched && !isSearching && allResults.length === 0 && query.trim();

  const artistResults = useMemo(() => {
    const map = new Map<string, { id: string; name: string; image?: string }>();
    allResults.forEach((t) => {
      if (!map.has(t.artistId || t.artist)) {
        map.set(t.artistId || t.artist, {
          id: t.artistId || t.artist,
          name: t.artist,
          image: t.albumCover,
        });
      }
    });
    return Array.from(map.values());
  }, [allResults]);

  return (
    <ScrollArea className="h-full custom-scrollbar">
      <div className="p-4 md:p-8 space-y-6 pb-32">
        {/* Search Input + Addon Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="What do you want to listen to?"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="pl-10 pr-10 h-12 bg-foreground/5 border-none rounded-full text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground/20"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setAddonResults([]);
                    setHasSearched(false);
                    if (addonError) clearError();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/20"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Addon Selector */}
            {enabledAddons.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 px-3 gap-2 border-border/50 text-foreground bg-foreground/5 hover:bg-foreground/10 rounded-full">
                    <Music size={16} className="text-spotify-green" />
                    <span className="text-sm max-w-[120px] truncate">{activeAddon?.manifest.name || 'Select Addon'}</span>
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 bg-popover border-border p-1" align="start">
                  {enabledAddons.map((addon) => (
                    <button
                      key={addon.manifest.id}
                      onClick={() => setActiveAddon(addon.manifest.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors',
                        addon.manifest.id === activeAddonId
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )}
                    >
                      <Music size={14} className={addon.manifest.id === activeAddonId ? 'text-spotify-green' : ''} />
                      <span className="truncate">{addon.manifest.name}</span>
                      {addon.manifest.id === activeAddonId && (
                        <span className="ml-auto text-spotify-green text-xs">Active</span>
                      )}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Single active addon indicator */}
          {enabledAddons.length === 1 && activeAddon && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wifi size={12} className="text-spotify-green" />
              <span>Searching via {activeAddon.manifest.name}</span>
            </div>
          )}
        </div>

        {/* No addons warning */}
        {!hasAddons && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/20 border border-border/20 text-sm">
            <WifiOff size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground">
                No addons installed yet. Install an Eclipse addon to search and stream real music.
              </p>
              <Button
                className="mt-3 bg-spotify-green hover:bg-spotify-green-hover text-white text-xs h-8"
                onClick={() => navigateTo('addons')}
              >
                Browse Addon Store
              </Button>
            </div>
          </div>
        )}

        {/* Has addons but none active */}
        {hasAddons && !activeAddonId && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
            <AlertCircle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-200">
                You have addons installed but none is set as active. Select one from the dropdown or go to Addons to activate one.
              </p>
              <Button
                className="mt-3 bg-spotify-green hover:bg-spotify-green-hover text-white text-xs h-8"
                onClick={() => navigateTo('addons')}
              >
                Manage Addons
              </Button>
            </div>
          </div>
        )}

        {/* Search error */}
        {addonError && hasSearched && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Search failed</p>
              <p className="text-xs opacity-80 mt-1">{addonError}</p>
            </div>
          </div>
        )}

        {/* Categories (show when no search) */}
        {!query.trim() && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {browseCategories.map((cat) => (
              <motion.div
                key={cat.id}
                whileHover={{ scale: 1.03 }}
                className="aspect-square rounded-lg p-4 cursor-pointer relative overflow-hidden"
                style={{ backgroundColor: cat.color }}
                onClick={() => setQuery(cat.name.toLowerCase())}
              >
                <h3 className="text-lg font-bold text-white relative z-10">{cat.name}</h3>
              </motion.div>
            ))}
          </div>
        )}

        {/* Search Results */}
        <AnimatePresence mode="wait">
          {(hasSearched || query.trim()) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Tabs defaultValue="tracks" className="w-full">
                <TabsList className="bg-transparent border-b border-border/30 rounded-none h-auto p-0 w-full justify-start gap-6">
                  <TabsTrigger
                    value="tracks"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-2 px-0"
                  >
                    Tracks
                  </TabsTrigger>
                  <TabsTrigger
                    value="artists"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground pb-2 px-0"
                  >
                    Artists
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tracks" className="mt-4">
                  {/* Addon source indicator */}
                  {activeAddonId && hasSearched && !isSearching && addonResults.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                      <Wifi size={12} className="text-spotify-green" />
                      <span>{addonResults.length} results from {activeAddon?.manifest.name || 'addon'}</span>
                    </div>
                  )}

                  {/* Loading */}
                  {showAddonsSearching && (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <Loader2 size={20} className="animate-spin text-spotify-green" />
                      <span className="text-sm text-muted-foreground">Searching {activeAddon?.manifest.name || 'addons'}...</span>
                    </div>
                  )}

                  {/* Play all button */}
                  {!isSearching && allResults.length > 0 && (
                    <div className="flex items-center gap-4 mb-4">
                      <h2 className="text-xl font-bold text-foreground">Songs</h2>
                      <Button
                        size="sm"
                        onClick={() => {
                          play(allResults[0], allResults, 0);
                          allResults.forEach((t) => addRecentlyPlayed(t));
                        }}
                        className="w-8 h-8 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-white"
                      >
                        <Play size={14} fill="white" className="ml-0.5" />
                      </Button>
                      <span className="text-sm text-muted-foreground">{allResults.length} results</span>
                    </div>
                  )}

                  {/* Results */}
                  {!isSearching && allResults.length > 0 && (
                    <TrackList
                      tracks={allResults}
                      showAlbumArt={true}
                      showIndex={true}
                    />
                  )}
                </TabsContent>

                <TabsContent value="artists" className="mt-4">
                  {!isSearching && artistResults.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {artistResults.map((artist) => (
                        <div
                          key={artist.id}
                          className="flex flex-col items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => {
                            const artistTracks = allResults.filter(
                              (t) => t.artistId === artist.id || t.artist === artist.name
                            );
                            if (artistTracks.length > 0) {
                              play(artistTracks[0], artistTracks, 0);
                            }
                          }}
                        >
                          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-accent shadow-lg shadow-black/40">
                            {artist.image ? (
                              <img
                                src={artist.image}
                                alt={artist.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-accent flex items-center justify-center">
                                <span className="text-2xl font-bold text-muted-foreground">
                                  {artist.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground">{artist.name}</span>
                          <span className="text-xs text-muted-foreground">Artist</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No results */}
        {showNoResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-xl font-bold text-foreground mb-2">
              No results found for &quot;{query}&quot;
            </p>
            <p className="text-sm text-muted-foreground">
              Please make sure your words are spelled correctly, or use fewer or different keywords.
            </p>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
}
