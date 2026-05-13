import type { Track } from '@/types/music';

/**
 * Identity for "same song" in recently played: ISRC when present, else addon id pair,
 * else normalized title + primary artist (so catalog vs addon rows collapse).
 */
export function trackListenDedupeKey(
  t: Pick<Track, 'title' | 'artist' | 'isrc' | 'addonId' | 'addonTrackId'>
): string {
  const isrc = t.isrc?.trim().toLowerCase();
  if (isrc) return `isrc:${isrc}`;
  if (t.addonId?.trim() && t.addonTrackId?.trim()) {
    return `addon:${t.addonId.trim()}:${String(t.addonTrackId).trim()}`;
  }
  const title = String(t.title || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const artist = String(t.artist || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `ta:${title}|${artist}`;
}
