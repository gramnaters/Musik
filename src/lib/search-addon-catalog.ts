import type { AddonAlbum, AddonArtist, AddonPlaylist, AddonSearchResults } from '@/types/addon';
import type { Album, CatalogPodcast, Track } from '@/types/music';
import { mergeTracksDedupe } from '@/lib/home-catalog-fetch';

/** Stable id for rows that should load tracks from a specific module. */
export function addonHubId(addonId: string, remoteId: string, entity: 'album' | 'playlist' | 'artist') {
  return `addon|${addonId}|${encodeURIComponent(remoteId)}|${entity}`;
}

export function parseAddonHubId(
  id: string | undefined
): { addonId: string; remoteId: string; entity: 'album' | 'playlist' | 'artist' } | null {
  if (!id || !id.startsWith('addon|')) return null;
  const parts = id.split('|');
  if (parts.length !== 4) return null;
  const entity = parts[3];
  if (entity !== 'album' && entity !== 'playlist' && entity !== 'artist') return null;
  try {
    return { addonId: parts[1], remoteId: decodeURIComponent(parts[2]), entity };
  } catch {
    return null;
  }
}

export function addonAlbumsToAlbums(rows: AddonAlbum[] | undefined, addonId: string): Album[] {
  return (rows || []).map((a) => ({
    id: addonHubId(addonId, String(a.id), 'album'),
    title: String(a.title ?? a.name ?? 'Album'),
    artist: String(a.artist ?? a.artistName ?? ''),
    cover: a.artworkURL || a.cover || a.image,
    year: a.year,
    trackCount: a.trackCount ?? a.numberOfTracks,
  }));
}

export function addonPlaylistsToRows(
  rows: AddonPlaylist[] | undefined,
  addonId: string
): {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  trackCount?: number;
}[] {
  return (rows || []).map((p) => ({
    id: addonHubId(addonId, String(p.id), 'playlist'),
    name: String(p.title ?? p.name ?? 'Playlist'),
    description: p.description,
    cover: p.artworkURL || p.cover || p.image,
    trackCount: p.trackCount,
  }));
}

export function addonArtistsToCatalog(
  rows: AddonArtist[] | undefined,
  addonId: string
): { id: string; name: string; image?: string }[] {
  return (rows || []).map((a) => ({
    id: addonHubId(addonId, String(a.id), 'artist'),
    name: String(a.name || 'Artist'),
    image: a.image || a.artworkURL,
  }));
}

function albumKey(a: Pick<Album, 'title' | 'artist'>) {
  return `${a.title.toLowerCase().trim()}|${a.artist.toLowerCase().trim()}`;
}

function artistKey(a: { name: string }) {
  return a.name.toLowerCase().trim();
}

function playlistKey(p: { name: string }) {
  return p.name.toLowerCase().trim();
}

export function mergeAlbumLists(addonFirst: Album[], catalog: Album[], cap = 40): Album[] {
  const seen = new Set<string>();
  const out: Album[] = [];
  for (const a of addonFirst) {
    const k = albumKey(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= cap) return out;
  }
  for (const a of catalog) {
    const k = albumKey(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= cap) return out;
  }
  return out;
}

export function mergeArtistLists<T extends { id: string; name: string; image?: string }>(
  addonFirst: T[],
  catalog: T[],
  cap = 36
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const a of addonFirst) {
    const k = artistKey(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= cap) return out;
  }
  for (const a of catalog) {
    const k = artistKey(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= cap) return out;
  }
  return out;
}

export function mergePlaylistRows(
  addonFirst: { id: string; name: string; description?: string; cover?: string; trackCount?: number }[],
  catalog: { id: string; name: string; description?: string; cover?: string; trackCount?: number }[],
  cap = 40
) {
  const seen = new Set<string>();
  const out: typeof addonFirst = [];
  for (const p of addonFirst) {
    const k = playlistKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length >= cap) return out;
  }
  for (const p of catalog) {
    const k = playlistKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length >= cap) return out;
  }
  return out;
}

export function mergeSearchTracks(
  addonTracks: Track[],
  catalogTracks: Track[] | undefined,
  cap = 80
): Track[] {
  return mergeTracksDedupe(addonTracks, catalogTracks || [], cap);
}

export function buildMergedCatalogBundle(
  catalog: {
    tracks: Track[];
    albums: Album[];
    artists: { id: string; name: string; image?: string }[];
    playlists: {
      id: string;
      name: string;
      description?: string;
      cover?: string;
      trackCount?: number;
    }[];
    podcasts: CatalogPodcast[];
    playlistResultsSource?: 'spotify' | 'none';
  },
  addonId: string | null,
  addonSnap: AddonSearchResults | null,
  addonTracksAsList: Track[]
) {
  if (!addonId || !addonSnap) return catalog;
  const aAlbums = addonAlbumsToAlbums(addonSnap.albums, addonId);
  const aPlaylists = addonPlaylistsToRows(addonSnap.playlists, addonId);
  const aArtists = addonArtistsToCatalog(addonSnap.artists, addonId);
  return {
    tracks: mergeSearchTracks(addonTracksAsList, catalog.tracks, 80),
    albums: mergeAlbumLists(aAlbums, catalog.albums, 40),
    artists: mergeArtistLists(aArtists, catalog.artists, 36),
    playlists: mergePlaylistRows(aPlaylists, catalog.playlists, 40),
    podcasts: catalog.podcasts,
    playlistResultsSource: aPlaylists.length ? ('spotify' as const) : catalog.playlistResultsSource,
  };
}
