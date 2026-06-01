const APPLE_PROXY = 'https://apple-backend.alessandro-geolier2-1a5.workers.dev/apple/search';

export function appleArtworkUrl(attrs: Record<string, unknown>): string {
  const artwork = attrs.artwork as Record<string, unknown> | undefined;
  if (!artwork?.url) return '';
  const template = String(artwork.url);
  return template.replace(/\{w\}x\{h\}bb/g, '3000x3000bb');
}

function extractAlbumId(attrs: Record<string, unknown>): string | undefined {
  const trackUrl = String(attrs.url ?? '');
  // e.g. https://music.apple.com/us/album/song-name/1234567890?i=9876543210
  const match = trackUrl.match(/\/album\/[^/]+\/(\d+)/);
  return match ? match[1] : undefined;
}

export function mapAppleTrack(attrs: Record<string, unknown>, id: string) {
  return {
    id: `apple_${id}`,
    title: String(attrs.name ?? attrs.trackName ?? ''),
    artist: String(attrs.artistName ?? ''),
    album: String(attrs.albumName ?? attrs.collectionName ?? ''),
    albumCover: appleArtworkUrl(attrs),
    albumId: extractAlbumId(attrs),
    isrc: attrs.isrc ? String(attrs.isrc) : undefined,
    duration: typeof attrs.durationInMillis === 'number'
      ? Math.round(attrs.durationInMillis / 1000)
      : typeof attrs.trackTimeMillis === 'number'
        ? Math.round(attrs.trackTimeMillis / 1000)
        : 0,
    streamURL: undefined,
    source: 'apple' as const,
    explicit: attrs.trackExplicitness === 'explicit' || attrs.trackExplicitness === 'explicit_edited' || false,
  };
}

export function mapAppleAlbum(attrs: Record<string, unknown>, id: string) {
  return {
    id: `apple_album_${id}`,
    title: String(attrs.name ?? attrs.collectionName ?? ''),
    artist: String(attrs.artistName ?? ''),
    cover: appleArtworkUrl(attrs),
    year: typeof attrs.releaseDate === 'string' ? attrs.releaseDate.slice(0, 4) : undefined,
    trackCount: typeof attrs.trackCount === 'number' ? attrs.trackCount : undefined,
    source: 'apple' as const,
    explicit: false,
  };
}

export function mapAppleArtist(attrs: Record<string, unknown>, id: string) {
  return {
    id: `apple_${id}`,
    name: String(attrs.name ?? attrs.artistName ?? ''),
    image: appleArtworkUrl(attrs),
  };
}

export function mapApplePlaylistFromAlbum(album: ReturnType<typeof mapAppleAlbum>) {
  return {
    id: album.id,
    name: album.title,
    description: `${album.artist} • Album`,
    cover: album.cover,
    trackCount: album.trackCount,
    source: 'apple' as const,
  };
}

interface AppleSearchResult {
  results: {
    songs?: { data?: { id: string; attributes: Record<string, unknown> }[] };
    albums?: { data?: { id: string; attributes: Record<string, unknown> }[] };
    artists?: { data?: { id: string; attributes: Record<string, unknown> }[] };
    'music-videos'?: { data?: unknown[] };
  };
}

export async function searchAppleProxy(q: string): Promise<AppleSearchResult | null> {
  try {
    const url = `${APPLE_PROXY}?term=${encodeURIComponent(q)}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.warn(`Apple proxy HTTP ${res.status}`);
      return null;
    }
    return await res.json() as AppleSearchResult;
  } catch (e) {
    console.error('Apple proxy search failed:', e);
    return null;
  }
}
