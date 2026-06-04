const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0';

function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseFloat(match[3] || '0');
  return h * 3600 + m * 60 + Math.round(s);
}

async function query<T = any>(relativePath: string, options?: { type?: string; signal?: AbortSignal }): Promise<T> {
  const baseUrl = 'https://api.monochrome.tf';
  const url = `${baseUrl}${relativePath}`;
  const res = await fetch(url, { 
    signal: options?.signal ?? AbortSignal.timeout(15000),
    headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'en-US' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function stripPrefix(id: string): string {
  if (!id) return '';
  return id.replace(/^(mono_|tidal_)/, '');
}

export function getCoverUrl(coverUuid: string, size = '1920'): string {
  if (!coverUuid) return '';
  const uuid = stripPrefix(coverUuid);
  return uuid.length >= 32 ? `/api/cover?id=${uuid}&size=${size}` : `https://resources.tidal.com/images/${uuid.replace(/-/g, '/')}/${size}x${size}.jpg`;
}

function extractUUID(obj: any): string | null {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  if (obj.uuid) return obj.uuid;
  if (obj.id) return obj.id;
  if (obj.cover) return obj.cover;
  return null;
}

export async function getTrack(id: string) {
  const raw = await query<any>(`/track/?id=${stripPrefix(id)}`);
  return raw?.track || raw?.data || raw;
}

export async function getTracks(ids: string[]) {
  const results = await Promise.allSettled(
    ids.map((id) => getTrack(id))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map((r) => r.value);
}

export async function getStreamUrl(id: string, quality = 'HI_RES') {
  const raw = await query<any>(`/stream/?id=${stripPrefix(id)}&quality=${quality}`);
  const url = raw?.url || raw?.streamURL || raw?.data?.url || '';
  if (!url) return null;
  return url;
}

export async function getAlbumInfo(id: string) {
  const raw = await query<any>(`/album/?id=${stripPrefix(id)}`);
  const album = raw?.album || raw?.data || raw;
  let tracks = raw?.tracks || album?.tracks || album?.items || raw?.data?.items || [];
  // Unwrap nested items: { item: {...}, type: "track" } → extract the item
  if (tracks.length > 0 && tracks[0].item && !tracks[0].title) {
    tracks = tracks.map((t: any) => t.item || t);
  }
  return { album, tracks };
}

export async function getArtist(id: string) {
  const raw = await query<any>(`/artist/?id=${stripPrefix(id)}`);
  return raw?.artist || raw?.data || raw;
}

export async function getArtistBio(id: string) {
  try {
    const raw = await query<any>(`/artist/bio/?id=${stripPrefix(id)}`);
    return raw?.bio || raw?.text || raw?.data || '';
  } catch {
    return '';
  }
}

export async function search(query: string, limit = 25) {
  const raw = await query<any>(`/search/?s=${encodeURIComponent(query)}&limit=${limit}`);
  return raw?.data || raw;
}

export async function searchTracks(query: string, limit = 25) {
  const raw = await query<any>(`/search/?s=${encodeURIComponent(query)}&limit=${limit}`);
  if (!raw) return [];
  const data = raw?.data || raw;
  const items = data?.items || data?.tracks || [];
  const result = Array.isArray(items) ? items : [];
  console.log('[monochrome] searchTracks got', result.length, 'tracks for', query);
  return result;
}

export async function searchAlbums(query: string, limit = 25) {
  const raw = await query<any>(`/search/?a=${encodeURIComponent(query)}&limit=${limit}`);
  const data = raw?.data || raw;
  const items = data?.items || data?.albums || [];
  return Array.isArray(items) ? items : [];
}

export async function searchArtists(query: string, limit = 25) {
  const raw = await query<any>(`/search/?ar=${encodeURIComponent(query)}&limit=${limit}`);
  const data = raw?.data || raw;
  const items = data?.items || data?.artists || [];
  return Array.isArray(items) ? items : [];
}

export async function searchPlaylists(query: string, limit = 25) {
  const raw = await query<any>(`/search/?p=${encodeURIComponent(query)}&limit=${limit}`);
  const data = raw?.data || raw;
  const items = data?.items || data?.playlists || [];
  return Array.isArray(items) ? items : [];
}

export async function getArtistAlbums(id: string): Promise<{ albums: any[]; eps: any[] }> {
  try {
    const raw = await query<any>(`/artist/?id=${stripPrefix(id)}`);
    const artist = raw?.artist || raw?.data || raw;
    const artistName = artist?.name || '';

    if (!artistName) return { albums: [], eps: [] };

    // Try Monochrome's album-specific search (matches Monochrome's searchAlbums())
    try {
      const searchRaw = await query<any>(`/search/?al=${encodeURIComponent(artistName)}&limit=100`);
      const items = searchRaw?.data?.albums?.items || searchRaw?.data?.albums || searchRaw?.albums?.items || searchRaw?.albums || searchRaw?.items || [];
      if (Array.isArray(items) && items.length > 0) {
        const all = items.filter((x: any) =>
          (!x.type) || x.type === 'ALBUM' || x.type === 'EP' || x.type === 'SINGLE'
        );
        // Deduplicate by id
        const seen = new Set<string>();
        const deduped = all.filter((a: any) => {
          const key = a.id || `${a.title}-${a.artist?.name || a.artist}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const albums = deduped.filter((a: any) => !a.type || (a.type !== 'EP' && a.type !== 'SINGLE'));
        const eps = deduped.filter((a: any) => a.type === 'EP' || a.type === 'SINGLE');
        return { albums: albums.slice(0, 24), eps: eps.slice(0, 24) };
      }
    } catch {}

    // Fallback: general search with `a=` (artist name)
    try {
      const searchRaw = await query<any>(`/search/?a=${encodeURIComponent(artistName)}&limit=100`);
      const items = searchRaw?.data?.albums?.items || searchRaw?.data?.albums || searchRaw?.albums?.items || searchRaw?.albums || searchRaw?.items || [];
      if (Array.isArray(items) && items.length > 0) {
        const all = items.filter((x: any) =>
          (!x.type) || x.type === 'ALBUM' || x.type === 'EP' || x.type === 'SINGLE'
        );
        const seen = new Set<string>();
        const deduped = all.filter((a: any) => {
          const key = a.id || `${a.title}-${a.artist?.name || a.artist}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const albums = deduped.filter((a: any) => !a.type || (a.type !== 'EP' && a.type !== 'SINGLE'));
        const eps = deduped.filter((a: any) => a.type === 'EP' || a.type === 'SINGLE');
        return { albums: albums.slice(0, 24), eps: eps.slice(0, 24) };
      }
    } catch {}

    // Fallback: search for artist name via tracks endpoint to find their albums
    try {
      const trackRaw = await query<any>(`/search/?s=${encodeURIComponent(artistName)}&limit=100`);
      const tracks = trackRaw?.data?.tracks?.items || trackRaw?.data?.tracks || trackRaw?.tracks || trackRaw?.items || [];
      const albumMap = new Map<string, any>();
      for (const t of tracks) {
        const alb = t.album;
        if (alb && alb.id && !albumMap.has(alb.id)) {
          albumMap.set(alb.id, { id: alb.id, title: alb.title || '', artist: alb.artist?.name || artistName, cover: alb.cover, releaseDate: alb.releaseDate, type: alb.type });
        }
      }
      const found = [...albumMap.values()];
      return { albums: found.slice(0, 12), eps: [] };
    } catch {}

    return { albums: [], eps: [] };
  } catch {
    return { albums: [], eps: [] };
  }
}

export function getLyrics(id: string) {
  return query<any>(`/lyrics/?id=${stripPrefix(id)}`);
}

export function getSimilarArtists(id: string) {
  return query<any>(`/artist/similar/?id=${stripPrefix(id)}`);
}

export function getSimilarAlbums(id: string) {
  return query<any>(`/album/similar/?id=${stripPrefix(id)}`);
}

export function getRecommendations(id: string) {
  return query<any>(`/recommendations/?id=${stripPrefix(id)}`);
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
    duration: typeof item.duration === 'number' ? item.duration 
      : (typeof item.durationMs === 'number' ? Math.round(item.durationMs / 1000) 
        : (typeof item.duration === 'string' ? parseIsoDuration(item.duration) : 0)),
    isrc: item.isrc || '',
    explicit: item.explicit || false,
    quality: (item.audioQuality || item.quality || 'LOW').toLowerCase(),
  };
}

export function mapMonochromeAlbum(item: any): any {
  const coverId = extractUUID(item.cover || item.image);
  const totalDuration = item.duration || (item.tracks || []).reduce((s: number, t: any) => s + (t.duration || 0), 0);
  return {
    id: `mono_${item.id}`,
    title: item.title || item.name || '',
    artist: (typeof item.artist === 'string' ? item.artist : item.artist?.name || item.artistName || item.artists?.[0]?.name || ''),
    artistId: item.artistId || item.artist?.id || '',
    cover: coverId ? getCoverUrl(coverId) : '',
    coverId: coverId || '',
    trackCount: item.numberOfTracks || item.trackCount || item.tracks?.length || 0,
    numberOfTracks: item.numberOfTracks || item.trackCount || 0,
    year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
    releaseDate: item.releaseDate || '',
    duration: totalDuration || 0,
    copyright: item.copyright || '',
    explicit: item.explicit || false,
    audioQuality: item.audioQuality || '',
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
  const coverId = extractUUID(item.image || item.squareImage || item.cover);
  return {
    id: `mono_${item.uuid}`,
    title: item.title || item.name || '',
    description: item.description || '',
    cover: coverId ? getCoverUrl(coverId) : '',
    trackCount: item.numberOfTracks || item.trackCount || 0,
    image: coverId || item.image || item.squareImage || item.cover || '',
    squareImage: item.squareImage || coverId || '',
  };
}

export async function resolveMonochromeSearch(query: string, limit = 25) {
  try {
    const raw = await query<any>(`/search/?s=${encodeURIComponent(query)}&limit=${limit}`);
    const data = raw?.data || raw;
    const tracks = (data?.tracks || data?.items || []).map(mapMonochromeTrack);
    const albums = (data?.albums || []).map(mapMonochromeAlbum);
    const artists = (data?.artists || []).map(mapMonochromeArtist);
    const playlists = (data?.playlists || []).map(mapMonochromePlaylist);
    return { tracks, albums, artists, playlists };
  } catch {
    return { tracks: [], albums: [], artists: [], playlists: [] };
  }
}
