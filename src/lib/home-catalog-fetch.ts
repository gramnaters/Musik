import type { CatalogMetadataProvider } from '@/stores/metadataStore';
import { metadataSearchUrl } from '@/lib/catalog-api';
import { mapMetadataSearchTrack } from '@/lib/map-metadata-track';
import type { Track } from '@/types/music';

function trackDedupeKey(t: Pick<Track, 'title' | 'artist'>) {
  return `${String(t.title).toLowerCase().trim()}|${String(t.artist).toLowerCase().trim()}`;
}

/** Merge two track lists, preferring `primary` order, deduped by title+artist, capped. */
export function mergeTracksDedupe(primary: Track[], secondary: Track[], cap: number): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  const push = (t: Track) => {
    const k = trackDedupeKey(t);
    if (seen.has(k) || out.length >= cap) return;
    seen.add(k);
    out.push(t);
  };
  for (const t of primary) push(t);
  for (const t of secondary) push(t);
  return out;
}

export type HomeArtist = { id: string; name: string; image?: string };

function normName(n: string) {
  return n.trim().toLowerCase();
}

/** Drop merged noise that is clearly a playlist or compilation title, not a person. */
export function isLikelyArtistCatalogName(name: string): boolean {
  const t = name.trim();
  if (t.length < 2 || t.length > 72) return false;
  const lower = t.toLowerCase();
  if (/\b(hits?|songs?|playlist|mixtape|compilation|karaoke|instrumental|charts?|top\s+\d+)\b/.test(lower)) {
    return false;
  }
  if (/\b(best of|greatest hits|full album|deluxe|remastered)\b/.test(lower)) return false;
  return true;
}

/** Prefer tracks whose primary artist matches the tapped name (reduces playlist pollution in hubs). */
export function filterTracksByArtistName(tracks: Track[], artistName: string): Track[] {
  const needle = normName(artistName);
  if (!needle || !tracks.length) return tracks;
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .split(/\s*(?:,|&|;|\/|\||feat\.|featuring|ft\.|vs\.)\s*/i)
      .map((x) => x.trim())
      .filter(Boolean);

  const picked = tracks.filter((t) => {
    const parts = tokenize(t.artist);
    return parts.some((p) => p === needle || p.startsWith(`${needle} `) || needle.startsWith(`${p} `));
  });
  return picked.length >= 4 ? picked : tracks;
}

/** Merge artist lists by normalized name; prefer rows that already have artwork. */
export function mergeArtistsDedupe(a: HomeArtist[], b: HomeArtist[], cap: number): HomeArtist[] {
  const map = new Map<string, HomeArtist>();
  const add = (x: HomeArtist) => {
    const k = normName(x.name);
    if (!k) return;
    const cur = map.get(k);
    if (!cur) {
      map.set(k, { ...x, id: x.id || k });
      return;
    }
    const img = cur.image?.trim() ? cur.image : x.image;
    map.set(k, { ...cur, image: img || cur.image });
  };
  for (const x of a) add(x);
  for (const x of b) add(x);
  return Array.from(map.values()).slice(0, cap);
}

async function parseTracks(res: Response): Promise<Track[]> {
  if (!res.ok) return [];
  const data = (await res.json()) as { tracks?: Record<string, unknown>[] };
  const list = Array.isArray(data.tracks) ? data.tracks : [];
  return list.map((x) => mapMetadataSearchTrack(x));
}

async function parseArtists(res: Response): Promise<HomeArtist[]> {
  if (!res.ok) return [];
  const data = (await res.json()) as { artists?: { id: string; name: string; image?: string }[] };
  const list = Array.isArray(data.artists) ? data.artists : [];
  return list.map((a) => ({
    id: String(a.id ?? a.name),
    name: a.name,
    image: a.image?.trim() || undefined,
  }));
}

export async function fetchHomeTracksDual(
  q: string,
  appleCountry: string,
  primary: CatalogMetadataProvider,
  limit: number
): Promise<Track[]> {
  const secondary: CatalogMetadataProvider = primary === 'spotify' ? 'apple' : 'spotify';
  const cap = Math.min(50, limit);
  const [rP, rS] = await Promise.all([
    fetch(metadataSearchUrl({ q, provider: primary, limit: cap, appleCountry })),
    fetch(metadataSearchUrl({ q, provider: secondary, limit: cap, appleCountry })),
  ]);
  const [primaryTracks, secondaryTracks] = await Promise.all([parseTracks(rP), parseTracks(rS)]);
  return mergeTracksDedupe(primaryTracks, secondaryTracks, cap);
}

export async function fetchHomeArtistsDual(
  q: string,
  appleCountry: string,
  primary: CatalogMetadataProvider,
  limit: number
): Promise<HomeArtist[]> {
  const secondary: CatalogMetadataProvider = primary === 'spotify' ? 'apple' : 'spotify';
  const cap = Math.min(50, limit);
  const [rP, rS] = await Promise.all([
    fetch(
      metadataSearchUrl({ q, provider: primary, entity: 'artist', limit: cap, appleCountry })
    ),
    fetch(
      metadataSearchUrl({ q, provider: secondary, entity: 'artist', limit: cap, appleCountry })
    ),
  ]);
  const [aP, aS] = await Promise.all([parseArtists(rP), parseArtists(rS)]);
  return mergeArtistsDedupe(aP, aS, cap);
}

/** Fill missing `image` using a one-hit track search (same region as home). */
export async function enrichArtistImagesFromTrackSearch(
  artists: HomeArtist[],
  appleCountry: string,
  primary: CatalogMetadataProvider,
  concurrency = 4
): Promise<HomeArtist[]> {
  const need = artists.filter((a) => !a.image?.trim());
  if (need.length === 0) return artists;
  const imgByName = new Map<string, string>();
  let i = 0;
  const worker = async () => {
    while (i < need.length) {
      const idx = i++;
      const a = need[idx];
      if (!a) continue;
      try {
        const res = await fetch(
          metadataSearchUrl({
            q: a.name,
            provider: primary,
            limit: 1,
            appleCountry,
          })
        );
        const tracks = await parseTracks(res);
        const cover = tracks[0]?.albumCover?.trim();
        if (cover) imgByName.set(normName(a.name), cover);
      } catch {
        /* ignore */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, need.length) }, () => worker()));
  return artists.map((a) => {
    const k = normName(a.name);
    const fill = imgByName.get(k);
    if (a.image?.trim() || !fill) return a;
    return { ...a, image: fill };
  });
}
