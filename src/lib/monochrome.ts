const INSTANCES_URL = 'https://tidal-uptime.geeked.wtf';

const FALLBACK_API_INSTANCES = [
  { url: 'https://monochrome-api.samidy.com', version: '2.3' },
  { url: 'https://hifi-api-workers.anothermoumen4.workers.dev', version: '2.6' },
];

let cachedInstances: { api: { url: string; version: string }[] } | null = null;
let lastFetch = 0;

async function fetchInstances(): Promise<{ url: string; version: string }[]> {
  if (cachedInstances && Date.now() - lastFetch < 15 * 60 * 1000) {
    return cachedInstances.api;
  }
  try {
      const ac = new AbortController();
      setTimeout(() => ac.abort(), 5000);
      const res = await fetch(INSTANCES_URL, { signal: ac.signal });
    if (res.ok) {
      const data = await res.json();
      const api = (data.api || []).filter((i: any) => i.url && !/\.squid\.wtf/i.test(i.url));
      if (api.length > 0) {
        cachedInstances = { api };
        lastFetch = Date.now();
        return api;
      }
    }
  } catch {}
  cachedInstances = { api: FALLBACK_API_INSTANCES };
  lastFetch = Date.now();
  return FALLBACK_API_INSTANCES;
}

async function query<T = any>(relativePath: string, options?: { type?: string; signal?: AbortSignal }): Promise<T> {
  const type = options?.type || 'api';
  const instances = await fetchInstances();
  const maxAttempts = instances.length * 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const instance = instances[(attempt - 1) % instances.length];
    const baseUrl = typeof instance === 'string' ? instance : instance.url;
    const url = baseUrl.endsWith('/')
      ? `${baseUrl}${relativePath.substring(1)}`
      : `${baseUrl}${relativePath}`;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(url, { signal: options?.signal ?? ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return res.json();
      if (res.status === 429 || res.status >= 500) continue;
      lastError = new Error(`Monochrome API error: ${res.status}`);
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError || new Error(`All monochrome instances failed for: ${relativePath}`);
}

export function getCoverUrl(id: string, size = '1280'): string {
  return `/api/cover?id=${id}&size=${size}`;
}

export function searchTracks(query: string, limit = 20) {
  return query<{ tracks: any[]; albums: any[]; artists: any[]; playlists: any[] }>(
    `/search/?q=${encodeURIComponent(query)}&limit=${limit}`
  );
}

export function searchTracksExplicit(query: string, limit = 20) {
  return query<{ tracks: any[]; albums: any[]; artists: any[]; playlists: any[] }>(
    `/search/?s=${encodeURIComponent(query)}&limit=${limit}`
  );
}

export function searchArtists(query: string) {
  return query<{ artists: any[] }>(`/search/?a=${encodeURIComponent(query)}`);
}

export function searchAlbums(query: string) {
  return query<{ albums: any[] }>(`/search/?al=${encodeURIComponent(query)}`);
}

export function searchPlaylists(query: string) {
  return query<{ playlists: any[] }>(`/search/?p=${encodeURIComponent(query)}`);
}

export function getTrackInfo(id: string) {
  return query<any>(`/info/?id=${id}`);
}

export function getAlbumInfo(id: string) {
  return query<any>(`/album/?id=${id}`);
}

export function getArtistInfo(id: string) {
  return query<any>(`/artist/?id=${id}`);
}

export function getPlaylistInfo(id: string) {
  return query<any>(`/playlist/?id=${id}`);
}

export function getArtistDiscography(id: string, offset = 0, limit = 100) {
  return query<any>(`/artist/?f=${id}&offset=${offset}&limit=${limit}`);
}

export function getLyrics(id: string) {
  return query<any>(`/lyrics/?id=${id}`);
}

export function getSimilarArtists(id: string) {
  return query<any>(`/artist/similar/?id=${id}`);
}

export function getSimilarAlbums(id: string) {
  return query<any>(`/album/similar/?id=${id}`);
}

export function getRecommendations(id: string) {
  return query<any>(`/recommendations/?id=${id}`);
}

function extractUUID(obj: any): string | null {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  if (obj.uuid) return obj.uuid;
  if (obj.id) return obj.id;
  if (obj.cover) return obj.cover;
  return null;
}

export function mapMonochromeTrack(item: any): any {
  const coverId = extractUUID(item.album?.cover || item.cover || item.image);
  const albumCover = coverId ? getCoverUrl(coverId) : '';
  const id = item.id || item.trackId || item.productId || '';
  return {
    id: `mono_${id}`,
    title: item.title || item.name || '',
    artist: item.artist?.name || item.artistName || item.artists?.[0]?.name || '',
    album: item.album?.title || item.albumName || '',
    albumCover,
    albumId: item.album?.id || item.albumId || '',
    artistId: item.artist?.id || item.artistId || '',
    duration: item.duration || item.durationMs ? Math.round(item.durationMs / 1000) : 0,
    isrc: item.isrc || '',
    explicit: item.explicit || false,
    quality: (item.audioQuality || item.quality || 'LOW').toLowerCase(),
  };
}

export function mapMonochromeAlbum(item: any): any {
  const coverId = extractUUID(item.cover || item.image);
  return {
    id: `mono_${item.id}`,
    title: item.title || item.name || '',
    artist: item.artist?.name || item.artistName || item.artists?.[0]?.name || '',
    cover: coverId ? getCoverUrl(coverId) : '',
    coverId: coverId || '',
    trackCount: item.numberOfTracks || item.trackCount || item.tracks?.length || 0,
    year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
  };
}

export function mapMonochromeArtist(item: any): any {
  const imageId = extractUUID(item.picture || item.image || item.cover);
  return {
    id: `mono_${item.id}`,
    name: item.name || '',
    image: imageId ? getCoverUrl(imageId) : '',
    genres: item.genres || [],
  };
}

export function mapMonochromePlaylist(item: any): any {
  const coverId = extractUUID(item.cover || item.image || item.picture);
  return {
    id: `mono_${item.uuid || item.id}`,
    name: item.title || item.name || '',
    description: item.description || '',
    cover: coverId ? getCoverUrl(coverId) : '',
    trackCount: item.numberOfTracks || item.trackCount || item.tracks?.length || 0,
  };
}
