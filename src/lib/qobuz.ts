import { createHash } from 'crypto';

const QOBUZ_BASE = 'https://www.qobuz.com/api.json/0.2';
const APP_ID = '798273057';
const USER_TOKEN = 'qNL0eKjXhz6rSvrMOo4JtXym1AOTQa5mSMEc9hSD_dlN5mJ0WDQ7UZDEc5LpYh5KEUd43f_SszgKmM_nn4AONg';
const APP_SECRET = 'abb21364945c0583309667d13ca3d93a';

async function qobuzFetch(endpoint: string, params: Record<string, string | number>) {
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    searchParams.set(k, String(v));
  }
  searchParams.set('app_id', APP_ID);
  searchParams.set('user_auth_token', USER_TOKEN);

  const url = `${QOBUZ_BASE}/${endpoint}?${searchParams.toString()}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  return res.json() as Promise<Record<string, unknown>>;
}

export interface QobuzTrack {
  id: number;
  title: string;
  duration: number;
  track_number: number;
  media_number: number;
  maximum_bit_depth: number;
  maximum_sampling_rate: number;
  copyright?: string;
  performer?: { name: string; id: number };
  album?: {
    id: string;
    title: string;
    image?: { large?: string; small?: string; thumbnail?: string };
    artist?: { name: string };
  };
}

export interface QobuzAlbum {
  id: string;
  title: string;
  image?: { large?: string; small?: string; thumbnail?: string };
  artist?: { name: string; id: number };
  release_date?: string;
  track_count?: number;
  maximum_bit_depth?: number;
  maximum_sampling_rate?: number;
  genre?: { name: string }[];
}

export interface QobuzArtist {
  id: number;
  name: string;
  image?: { large?: string; medium?: string; small?: string };
  picture?: string;
  albums_count?: number;
}

export function qobuzArtworkUrl(item: { image?: { large?: string }; picture?: string }): string {
  if (item.image?.large) return item.image.large.replace('_600.jpg', '_max.jpg');
  if (item.picture) {
    return item.picture
      .replace('/covers/small/', '/covers/large/')
      .replace('/artists/covers/small/', '/artists/covers/large/');
  }
  return '';
}

function qobuzDuration(item: { duration?: number }): number {
  return typeof item.duration === 'number' ? item.duration : 0;
}

export async function searchQobuzTracks(q: string, limit = 25): Promise<QobuzTrack[]> {
  const data = await qobuzFetch('catalog/search', { query: q, type: 'tracks', limit });
  return (data as any)?.tracks?.items || [];
}

export async function searchQobuzAlbums(q: string, limit = 25): Promise<QobuzAlbum[]> {
  const data = await qobuzFetch('catalog/search', { query: q, type: 'albums', limit });
  return (data as any)?.albums?.items || [];
}

export async function searchQobuzArtists(q: string, limit = 25): Promise<QobuzArtist[]> {
  const data = await qobuzFetch('catalog/search', { query: q, type: 'artists', limit });
  return (data as any)?.artists?.items || [];
}

export async function getQobuzAlbum(albumId: string) {
  const data = await qobuzFetch('album/get', { album_id: albumId });
  return data as Record<string, unknown> | null;
}

export async function getQobuzArtist(artistId: number) {
  const data = await qobuzFetch('artist/get', { artist_id: artistId, extra: 'albums', limit: 50 });
  return data as Record<string, unknown> | null;
}

export function mapQobuzTrack(item: QobuzTrack) {
  const artist = item.performer?.name || item.album?.artist?.name || 'Unknown Artist';
  const albumCover = qobuzArtworkUrl(item.album || {});
  return {
    id: `qobuz_${item.id}`,
    title: String(item.title ?? ''),
    artist: String(artist),
    album: String(item.album?.title ?? ''),
    albumCover,
    duration: qobuzDuration(item),
    streamURL: undefined,
    source: 'qobuz' as const,
    explicit: false,
  };
}

export function mapQobuzAlbum(item: QobuzAlbum) {
  const artistName = item.artist?.name || 'Unknown Artist';
  return {
    id: `qobuz_album_${item.id}`,
    title: String(item.title ?? ''),
    artist: String(artistName),
    cover: qobuzArtworkUrl(item),
    year: typeof item.release_date === 'string' ? item.release_date.slice(0, 4) : undefined,
    trackCount: typeof item.track_count === 'number' ? item.track_count : undefined,
    source: 'qobuz' as const,
    explicit: false,
  };
}

export function mapQobuzArtist(item: QobuzArtist) {
  return {
    id: `qobuz_${item.id}`,
    name: String(item.name ?? ''),
    image: qobuzArtworkUrl(item),
  };
}

export function mapQobuzPlaylistFromAlbum(album: ReturnType<typeof mapQobuzAlbum>) {
  return {
    id: album.id,
    name: album.title,
    description: `${album.artist} • Album`,
    cover: album.cover,
    trackCount: album.trackCount,
    source: 'qobuz' as const,
  };
}

export function getQobuzTrackStreamUrl(trackId: number, quality: 'MP3' | 'CD' | 'HIRES_96' | 'HIRES' = 'HIRES') {
  const qualityMap: Record<string, number> = { MP3: 5, CD: 6, HIRES_96: 7, HIRES: 27 };
  const formatId = qualityMap[quality] || 27;
  const unixTs = Math.floor(Date.now() / 1000);
  const sigStr = `trackgetFileUrlformat_id${formatId}intentstreamtrack_id${trackId}${unixTs}${APP_SECRET}`;
  const sig = createHash('md5').update(sigStr).digest('hex');

  const params = new URLSearchParams({
    track_id: String(trackId),
    format_id: String(formatId),
    intent: 'stream',
    request_ts: String(unixTs),
    request_sig: sig,
    app_id: APP_ID,
    user_auth_token: USER_TOKEN,
  });

  return `${QOBUZ_BASE}/track/getFileUrl?${params.toString()}`;
}
