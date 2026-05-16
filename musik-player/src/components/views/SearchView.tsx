'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAddonStore } from '@/stores/addonStore';
import { demoTracks, browseCategories, formatDuration } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrackList from '@/components/shared/TrackList';
import { Search as SearchIcon, X, Play, Loader2, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Track } from '@/types/music';
import type { AddonTrack } from '@/types/addon';

function addonTrackToTrack(t: AddonTrack): Track {
  return {
    id: `addon_${t.addonId}_${t.id}`,
    title: t.title,
    artist: t.artist,
    album: t.album,
    albumCover: t.cover,
    duration: t.duration,
    streamURL: t.streamURL,
    albumId: t.albumId,
    artistId: t.artistId,
  };
}

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { play } = usePlayerStore();
  const { addRecentlyPlayed } = useLibraryStore();
  const { addons, isSearching, search, getStreamUrl } = useAddonStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addonResults, setAddonResults] = useState<Track[]>([]);
  const hasAddons = addons.filter((a) => a.enabled).length > 0;

  // Local demo search
  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return demoTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q)
    );
  }, [query]);

  // Addon search (debounced)
  const doAddonSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !hasAddons) {
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
    [hasAddons, search]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim() && hasAddons) {
        setHasSearched(true);
        debounceRef.current = setTimeout(() => doAddonSearch(value), 500);
      } else {
        setAddonResults([]);
        setHasSearched(false);
      }
    },
    [hasAddons, doAddonSearch]
  );

  const allResults = useMemo(() => {
    if (!hasSearched) return localResults;
    // Merge: addon results first, then local (deduplicate by title+artist)
    const seen = new Set<string>();
    const merged: Track[] = [];
    for (const t of addonResults) {
      const key = `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(t);
      }
    }
    for (const t of localResults) {
      const key = `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(t);
      }
    }
    return merged;
  }, [localResults, addonResults, hasSearched]);

  const showAddonsSearching = isSearching && hasSearched;
  const showNoResults = hasSearched && !isSearching && allResults.length === 0 && query.trim();

  // Derive unique artists/albums from all results
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
        {/* Search Input */}
        <div className="relative max-w-md">
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
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/20"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Addon status */}
        {!hasAddons && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/20 border border-border/20 text-sm">
            <WifiOff size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              No addons installed.{' '}
              <span className="text-spotify-green cursor-pointer hover:underline">
                Install addons
              </span>{' '}
              to stream real music from online sources.
            </span>
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
                  {hasAddons && hasSearched && !isSearching && addonResults.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                      <Wifi size={12} className="text-spotify-green" />
                      <span>{addonResults.length} results from addons</span>
                      {localResults.length > 0 && (
                        <span>• {localResults.length} from library</span>
                      )}
                    </div>
                  )}

                  {/* Loading */}
                  {showAddonsSearching && (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <Loader2 size={20} className="animate-spin text-spotify-green" />
                      <span className="text-sm text-muted-foreground">Searching addons...</span>
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
