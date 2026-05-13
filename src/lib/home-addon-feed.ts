import type { AddonSearchResults } from '@/types/addon';
import type { Track } from '@/types/music';
import { addonTrackToTrack } from '@/lib/addon-track-map';
import type { HomeArtist } from '@/lib/home-catalog-fetch';
import { isLikelyArtistCatalogName, mergeArtistsDedupe } from '@/lib/home-catalog-fetch';

function normArtistName(n: string) {
  return n.trim().toLowerCase();
}

/** First module in `orderedAddonIds` that returns any tracks for `query`. */
export async function fetchAddonTracksFirstHit(
  searchWithAddon: (addonId: string, query: string) => Promise<AddonSearchResults>,
  orderedAddonIds: string[],
  query: string,
  cap: number
): Promise<Track[]> {
  if (!orderedAddonIds.length) return [];
  for (const addonId of orderedAddonIds) {
    try {
      const r = await searchWithAddon(addonId, query);
      const rows = r.tracks || [];
      if (rows.length > 0) return rows.slice(0, cap).map(addonTrackToTrack);
    } catch {
      /* next */
    }
  }
  return [];
}

/**
 * Walk modules (in priority order) and search queries until we collect enough **artist** rows.
 * Modules vary: some return rich `artists[]`, others only tracks (ignored here).
 */
export async function fetchAddonArtistsMerged(
  searchWithAddon: (addonId: string, query: string) => Promise<AddonSearchResults>,
  orderedAddonIds: string[],
  cap: number
): Promise<HomeArtist[]> {
  if (!orderedAddonIds.length) return [];
  const queries = [
    'billboard artists',
    'popular artists',
    'top charts',
    'grammy winners',
    'viral artists',
  ];
  const buckets: HomeArtist[][] = [];

  for (const q of queries) {
    for (const addonId of orderedAddonIds) {
      try {
        const r = await searchWithAddon(addonId, q);
        const chunk: HomeArtist[] = [];
        for (const a of r.artists || []) {
          const name = String(a.name || '').trim();
          if (!name || !isLikelyArtistCatalogName(name)) continue;
          chunk.push({
            id: String(a.id || name),
            name,
            image: (a.image || a.artworkURL)?.trim() || undefined,
          });
        }
        if (chunk.length) buckets.push(chunk);
      } catch {
        /* next */
      }
    }
  }

  let merged: HomeArtist[] = [];
  for (const b of buckets) {
    merged = mergeArtistsDedupe(merged, b, cap);
    if (merged.length >= cap) return merged.slice(0, cap);
  }
  return merged.slice(0, cap);
}

/** Dedupe track artists from addon search (when API returns no `artists` array). */
export async function fetchAddonArtistsFromTrackSearches(
  searchWithAddon: (addonId: string, query: string) => Promise<AddonSearchResults>,
  orderedAddonIds: string[],
  cap: number
): Promise<HomeArtist[]> {
  if (!orderedAddonIds.length) return [];
  const queries = ['billboard hits', 'top charts', 'viral songs', 'popular songs'];
  const seen = new Set<string>();
  const out: HomeArtist[] = [];

  for (const q of queries) {
    for (const addonId of orderedAddonIds) {
      try {
        const r = await searchWithAddon(addonId, q);
        for (const t of r.tracks || []) {
          const name = String(t.artist || '').trim();
          if (!name || !isLikelyArtistCatalogName(name)) continue;
          const k = normArtistName(name);
          if (seen.has(k)) continue;
          seen.add(k);
          out.push({
            id: String(t.artistId || k),
            name,
            image: (t.artworkURL || t.cover)?.trim() || undefined,
          });
          if (out.length >= cap) return out;
        }
      } catch {
        /* next */
      }
    }
  }
  for (const q of queries) {
    for (const addonId of orderedAddonIds) {
      try {
        const r = await searchWithAddon(addonId, q);
        for (const t of r.tracks || []) {
          const name = String(t.artist || '').trim();
          if (!name || name.length > 80) continue;
          const k = normArtistName(name);
          if (seen.has(k)) continue;
          seen.add(k);
          out.push({
            id: String(t.artistId || k),
            name,
            image: (t.artworkURL || t.cover)?.trim() || undefined,
          });
          if (out.length >= cap) return out;
        }
      } catch {
        /* next */
      }
    }
  }
  return out;
}
