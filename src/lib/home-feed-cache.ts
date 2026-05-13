import type { Track } from '@/types/music';

export type HomeFeaturedArtist = { name: string; image?: string } | null;
export type HomePopArtist = { id: string; name: string; image?: string };

export type HomeFeedSlice = {
  freshTracks: Track[];
  popArtists: HomePopArtist[];
  featuredArtist: HomeFeaturedArtist;
};

/** Client-side cache so switching away from Home and back does not re-hit APIs (helps Render cold starts). */
const TTL_MS = 10 * 60 * 1000;

type CacheEntry = {
  key: string;
  updatedAt: number;
  feed?: HomeFeedSlice;
  rails?: Record<string, Track[]>;
};

let memory: CacheEntry | null = null;

export function homeFeedCacheKey(
  browseAddonId: string | null,
  catalogProvider: string,
  appleStorefront: string
) {
  return `v2|${browseAddonId ?? 'metadata'}|${catalogProvider}|${String(appleStorefront).toUpperCase()}`;
}

export function homeFeedCacheGet(key: string): CacheEntry | null {
  if (!memory || memory.key !== key) return null;
  if (Date.now() - memory.updatedAt > TTL_MS) {
    memory = null;
    return null;
  }
  return memory;
}

export function homeFeedCachePutFeed(key: string, feed: HomeFeedSlice) {
  if (!memory || memory.key !== key) {
    memory = { key, updatedAt: Date.now(), feed };
    return;
  }
  memory = { ...memory, feed, updatedAt: Date.now() };
}

export function homeFeedCachePutRails(key: string, rails: Record<string, Track[]>) {
  if (!memory || memory.key !== key) {
    memory = { key, updatedAt: Date.now(), rails };
    return;
  }
  memory = { ...memory, rails, updatedAt: Date.now() };
}
