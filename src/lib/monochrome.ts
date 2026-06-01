const INSTANCES_URL = 'https://tidal-uptime.geeked.wtf';

const FALLBACK_API_INSTANCES = [
  { url: 'https://monochrome-api.samidy.com', version: '2.3' },
  { url: 'https://api.monochrome.tf', version: '2.5' },
  { url: 'https://hifi.geeked.wtf', version: '2.7' },
  { url: 'https://hifi-api-workers.anothermoumen4.workers.dev', version: '2.6' },
  { url: 'https://wolf.qqdl.site', version: '2.4' },
  { url: 'https://maus.qqdl.site', version: '2.4' },
  { url: 'https://vogel.qqdl.site', version: '2.4' },
  { url: 'https://katze.qqdl.site', version: '2.4' },
  { url: 'https://hund.qqdl.site', version: '2.4' },
  { url: 'https://tidal.kinoplus.online', version: '2.3' },
  { url: 'https://eu-central.monochrome.tf', version: '2.7' },
  { url: 'https://us-west.monochrome.tf', version: '2.7' },
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

let tidalApiFallback: ((path: string) => Promise<any>) | null = null;

export function setTidalFallback(fn: (path: string) => Promise<any>) {
  tidalApiFallback = fn;
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
      if (res.ok) {
        const json = await res.json();
        if (json && json.detail) {
          lastError = new Error(json.detail);
          continue;
        }
        return json;
      }
      if (res.status === 429 || res.status >= 500) continue;
      lastError = new Error(`Monochrome API error: ${res.status}`);
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }

  if (tidalApiFallback) {
    try {
      const result = await tidalApiFallback(relativePath);
      if (result) return result as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError || new Error(`All monochrome instances failed for: ${relativePath}`);
}

export function getCoverUrl(id: string, size = '1280'): string {
  return `/api/cover?id=${id}&size=${size}`;
}

export function searchTracks(q: string, limit = 20) {
  return query<{ data: { items: any[] } }>(
    `/search/?s=${encodeURIComponent(q)}&limit=${limit}`
  ).then(r => {
    if (!r || r.detail) return { tracks: [] };
    return { tracks: r.data?.items || [] };
  });
}

export function searchTracksExplicit(q: string, limit = 20) {
  return query<{ data: { items: any[] } }>(
    `/search/?s=${encodeURIComponent(q)}&limit=${limit}`
  ).then(r => {
    if (!r || r.detail) return { tracks: [] };
    return { tracks: r.data?.items || [] };
  });
}

export function searchArtists(q: string) {
  return query<{ data: { artists: { items: any[] } } }>(
    `/search/?a=${encodeURIComponent(q)}`
  ).then(r => {
    if (!r || r.detail) return { artists: [] };
    return { artists: r.data?.artists?.items || [] };
  });
}

export function searchAlbums(q: string) {
  return query<{ data: { albums: { items: any[] } } }>(
    `/search/?al=${encodeURIComponent(q)}`
  ).then(r => {
    if (!r || r.detail) return { albums: [] };
    return { albums: r.data?.albums?.items || [] };
  });
}

export function searchPlaylists(q: string) {
  return query<{ data: { playlists: { items: any[] } } }>(
    `/search/?p=${encodeURIComponent(q)}`
  ).then(r => {
    if (!r || r.detail) return { playlists: [] };
    return { playlists: r.data?.playlists?.items || [] };
  });
}

export function getTrackInfo(id: string) {
  return query<any>(`/info/?id=${id}`);
}

export async function getAlbumInfo(id: string) {
  const raw = await query<any>(`/album/?id=${id}`);
  if (!raw || !raw.data) {
    throw new Error(raw?.detail || 'Album not found');
  }
  const d = raw.data;
  // Album props are directly in `data`, tracks in `data.items[]` as { item: trackObj, type: "track" }
  const tracks = (d.items || []).filter((x: any) => x.type === 'track').map((x: any) => x.item).filter(Boolean);
  const album = {
    id: d.id,
    title: d.title,
    cover: d.cover,
    artist: d.artist?.name || '',
    artistId: d.artist?.id || '',
    numberOfTracks: d.numberOfTracks || d.trackCount || tracks.length,
    releaseDate: d.releaseDate,
    explicit: d.explicit,
    audioQuality: d.audioQuality,
  };
  return { album, tracks };
}

export async function getArtistInfo(id: string) {
  const raw = await query<any>(`/artist/?id=${id}`);
  if (!raw) {
    throw new Error('Artist not found');
  }
  // Artist props are at top level (NOT inside `data`)
  const a = raw.artist;
  if (!a) {
    throw new Error(raw.detail || 'Artist not found');
  }
  return {
    artist: {
      id: a.id,
      name: a.name,
      picture: a.picture || raw.cover?.id,
      popularity: a.popularity,
      artistTypes: a.artistTypes,
    },
    cover: raw.cover,
  };
}

export async function getPlaylistInfo(id: string) {
  const raw = await query<any>(`/playlist/?id=${id}`);
  if (!raw) {
    throw new Error('Playlist not found');
  }
  // Playlist props are at top level, tracks in `items[]` as { item: trackObj, type: "track" }
  const p = raw.playlist;
  if (!p) {
    throw new Error(raw.detail || 'Playlist not found');
  }
  const tracks = (raw.items || []).filter((x: any) => x.type === 'track').map((x: any) => x.item).filter(Boolean);
  return {
    playlist: {
      uuid: p.uuid,
      title: p.title,
      description: p.description,
      numberOfTracks: p.numberOfTracks,
      image: p.image || p.squareImage,
      url: p.url,
      type: p.type,
    },
    tracks,
  };
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
    artist: (typeof item.artist === 'string' ? item.artist : item.artist?.name || item.artistName || item.artists?.[0]?.name || ''),
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

const PODCASTINDEX_API_KEY = 'YU5HMSDYBQQVYDF6QN4P';
const PODCASTINDEX_API_SECRET = '8hCvpjSL7T$S7^5ftnf5MhqQwYUYVjM^fmUL3Ld$';

function podcastIndexAuth() {
  const apiHeaderTime = Math.floor(Date.now() / 1000);
  const hash = require('crypto').createHash('sha1')
    .update(PODCASTINDEX_API_KEY + PODCASTINDEX_API_SECRET + apiHeaderTime)
    .digest('hex');
  return {
    'X-Auth-Key': PODCASTINDEX_API_KEY,
    'X-Auth-Date': String(apiHeaderTime),
    'Authorization': hash,
    'User-Agent': 'beatboss-player/1.0',
  };
}

export type PodcastFeed = {
  id: number;
  podcastGuid: string;
  title: string;
  author: string;
  description: string;
  image: string;
  link: string;
  feedUrl: string;
  language: string;
  categories: Record<string, string>;
  explicit: boolean;
  episodeCount: number;
  newestItemPublishTime: number;
};

export async function searchPodcasts(query: string, max = 10): Promise<PodcastFeed[]> {
  try {
    const headers = podcastIndexAuth();
    const res = await fetch(
      `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(query)}&max=${max}&pretty`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.feeds || []).map((f: any) => ({
      id: f.id,
      podcastGuid: f.podcastGuid,
      title: f.title,
      author: f.author || f.ownerName || '',
      description: f.description || '',
      image: f.image || f.artwork || '',
      link: f.link || '',
      feedUrl: f.url || f.feedUrl || '',
      language: f.language || '',
      categories: f.categories || {},
      explicit: f.explicit || false,
      episodeCount: f.episodeCount || 0,
      newestItemPublishTime: f.newestItemPublishTime || 0,
    }));
  } catch {
    return [];
  }
}
