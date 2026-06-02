import { appleArtworkUrl } from './apple-proxy';

const AMP_API = 'https://amp-api.music.apple.com/v1/catalog';

interface CachedToken {
  value: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return decoded;
  } catch {
    return null;
  }
}

async function scrapeWebPlayKitToken(): Promise<string | null> {
  const html = await fetch('https://music.apple.com/us/browse', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
  });
  if (!html.ok) return null;
  const text = await html.text();

  const jsMatch = text.match(/crossorigin src="(\/assets\/index.+?\.js)"/);
  if (!jsMatch) return null;

  const js = await fetch(`https://music.apple.com${jsMatch[1]}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
  });
  if (!js.ok) return null;
  const jsText = await js.text();

  const jwtMatch = jsText.match(/(eyJhbGc[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+)/);
  return jwtMatch ? jwtMatch[1] : null;
}

async function getValidToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  const token = await scrapeWebPlayKitToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp * 1000 : Date.now() + 3600000;
  tokenCache = { value: token, expiresAt: exp - 60000 };
  return token;
}

async function ampFetch(path: string): Promise<Response> {
  const token = await getValidToken();
  if (!token) return new Response(null, { status: 401 });

  const res = await fetch(`${AMP_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'https://music.apple.com',
    },
  });

  if (res.status === 401) {
    tokenCache = null;
    const newToken = await getValidToken();
    if (!newToken) return new Response(null, { status: 401 });
    return fetch(`${AMP_API}${path}`, {
      headers: {
        Authorization: `Bearer ${newToken}`,
        Origin: 'https://music.apple.com',
      },
    });
  }

  return res;
}

async function ampJson(path: string) {
  const res = await ampFetch(path);
  if (!res.ok) return null;
  return res.json();
}

function storefront(country?: string) {
  return (country || 'us').toLowerCase().slice(0, 2);
}

function ampImageUrl(attrs: Record<string, unknown>): string {
  const artwork = attrs.artwork as Record<string, unknown> | undefined;
  if (artwork?.url) return String(artwork.url).replace(/\{w\}x\{h\}(bb)?/g, '3000x3000bb');
  if (typeof artwork?.url === 'string') return String(artwork.url);
  return '';
}

function formatDuration(ms: number): number {
  return Math.round((ms || 0) / 1000);
}

function extractDateParts(dateStr?: string) {
  if (!dateStr) return { year: undefined, releaseDate: '' };
  const d = new Date(dateStr);
  return { year: d.getFullYear(), releaseDate: dateStr };
}

// ─── Mappers ───

function mapAmpTrack(item: Record<string, unknown>, albumArt?: string): Record<string, unknown> {
  const attrs = (item.attributes || {}) as Record<string, unknown>;
  return {
    id: `apple_${item.id}`,
    title: String(attrs.name || ''),
    artist: String(attrs.artistName || ''),
    album: String(attrs.albumName || ''),
    albumCover: albumArt || ampImageUrl(attrs),
    albumId: String(attrs.playParams?.albumId || ''),
    duration: formatDuration(Number(attrs.durationInMillis || 0)),
    explicit: attrs.contentRating === 'explicit' || false,
    quality: 'APPLE_LOSSLESS',
  };
}

function mapAmpAlbum(item: Record<string, unknown>): Record<string, unknown> {
  const attrs = (item.attributes || {}) as Record<string, unknown>;
  const { year, releaseDate } = extractDateParts(String(attrs.releaseDate || ''));
  return {
    id: `apple_album_${item.id}`,
    title: String(attrs.name || ''),
    artist: String(attrs.artistName || ''),
    artistId: '',
    cover: ampImageUrl(attrs),
    coverId: String(item.id || ''),
    trackCount: Number(attrs.trackCount || 0),
    numberOfTracks: Number(attrs.trackCount || 0),
    year,
    releaseDate,
    duration: 0,
    copyright: String(attrs.copyright || ''),
    explicit: attrs.contentRating === 'explicit' || false,
    audioQuality: 'APPLE_LOSSLESS',
  };
}

function mapAmpArtist(item: Record<string, unknown>): Record<string, unknown> {
  const attrs = (item.attributes || {}) as Record<string, unknown>;
  return {
    id: `apple_${item.id}`,
    name: String(attrs.name || ''),
    picture: ampImageUrl(attrs),
    image: ampImageUrl(attrs),
  };
}

function mapAmpSimpleAlbum(item: Record<string, unknown>): Record<string, unknown> {
  const attrs = (item.attributes || {}) as Record<string, unknown>;
  const { year } = extractDateParts(String(attrs.releaseDate || ''));
  const artistName = String(attrs.artistName || '');
  return {
    id: `apple_album_${item.id}`,
    title: String(attrs.name || ''),
    artist: { id: '', name: artistName },
    cover: ampImageUrl(attrs),
    year,
    releaseDate: attrs.releaseDate || '',
    explicit: attrs.contentRating === 'explicit' || false,
    audioQuality: 'APPLE_LOSSLESS',
  };
}

function mapAmpPlaylist(item: Record<string, unknown>): Record<string, unknown> {
  const attrs = (item.attributes || {}) as Record<string, unknown>;
  return {
    id: `apple_${item.id}`,
    title: String(attrs.name || ''),
    description: String(attrs.description?.standard || attrs.description || ''),
    cover: ampImageUrl(attrs),
    trackCount: 0,
  };
}

// ─── Search ───

export async function searchAppleCatalog(q: string, types = 'songs,albums,artists,playlists', country = 'us', limit = 25) {
  const data = await ampJson(`/${storefront(country)}/search?term=${encodeURIComponent(q)}&types=${types}&limit=${limit}&l=en-US`);
  if (!data?.results) return { tracks: [], albums: [], artists: [], playlists: [] };

  const results = data.results as Record<string, { data?: Record<string, unknown>[] }>;
  return {
    tracks: (results.songs?.data || []).map(t => mapAmpTrack(t)),
    albums: (results.albums?.data || []).map(a => mapAmpAlbum(a)),
    artists: (results.artists?.data || []).map(a => mapAmpArtist(a)),
    playlists: (results.playlists?.data || []).map(p => mapAmpPlaylist(p)),
  };
}

// ─── Album ───

export async function getAppleAlbum(albumId: string, country = 'us'): Promise<{ album: Record<string, unknown> | null; tracks: Record<string, unknown>[] }> {
  const cleanId = albumId.replace(/^apple_album_/, '').replace(/^apple_/, '');
  const data = await ampJson(`/${storefront(country)}/albums/${cleanId}?include=tracks,artists`);
  if (!data?.data?.length) return { album: null, tracks: [] };

  const item = data.data[0] as Record<string, unknown>;
  const attrs = (item.attributes || {}) as Record<string, unknown>;
  const rels = (item.relationships || {}) as Record<string, unknown>;
  const artistData = (rels.artists as Record<string, unknown>)?.data as Record<string, unknown>[] | undefined;
  const trackData = (rels.tracks as Record<string, unknown>)?.data as Record<string, unknown>[] | undefined;

  const albumArt = ampImageUrl(attrs);
  const { year, releaseDate } = extractDateParts(String(attrs.releaseDate || ''));
  const totalDuration = (trackData || []).reduce((sum, t) => {
    const a = (t.attributes || {}) as Record<string, unknown>;
    return sum + Number(a.durationInMillis || 0);
  }, 0);

  const album = {
    id: `apple_album_${item.id}`,
    title: String(attrs.name || ''),
    artist: String(attrs.artistName || ''),
    artistId: artistData?.[0]?.id ? `apple_${artistData[0].id}` : '',
    cover: albumArt,
    coverId: String(item.id || ''),
    trackCount: Number(attrs.trackCount || 0),
    numberOfTracks: Number(attrs.trackCount || 0),
    year,
    releaseDate,
    duration: formatDuration(totalDuration),
    copyright: String(attrs.copyright || ''),
    explicit: attrs.contentRating === 'explicit' || false,
    audioQuality: 'APPLE_LOSSLESS',
  };

  const tracks = (trackData || []).map(t => ({
    ...mapAmpTrack(t, albumArt),
    album: String(attrs.name || ''),
    albumId: `apple_album_${item.id}`,
  }));

  return { album, tracks };
}

// ─── Artist endpoints ───

export async function getAppleArtistAlbums(artistId: string, country = 'us') {
  const cleanId = artistId.replace(/^apple_/, '');
  const data = await ampJson(`/${storefront(country)}/artists/${cleanId}/albums`);
  const albumItems = (data?.data || []) as Record<string, unknown>[];

  const albums = albumItems.filter(a => {
    const attrs = (a.attributes || {}) as Record<string, unknown>;
    return attrs.isSingle !== true && attrs.isEP !== true;
  }).map(mapAmpSimpleAlbum);

  const eps = albumItems.filter(a => {
    const attrs = (a.attributes || {}) as Record<string, unknown>;
    return attrs.isSingle === true || attrs.isEP === true;
  }).map(mapAmpSimpleAlbum);

  // Also try singles view
  try {
    const singlesData = await ampJson(`/${storefront(country)}/artists/${cleanId}/view/singles`);
    if (singlesData?.data) {
      for (const s of singlesData.data) eps.push(mapAmpSimpleAlbum(s));
    }
  } catch {}

  return { albums, eps };
}

export async function getAppleSimilarArtists(artistId: string, country = 'us') {
  const cleanId = artistId.replace(/^apple_/, '');
  const data = await ampJson(`/${storefront(country)}/artists/${cleanId}/view/similar-artists`);
  if (!data?.data) return [];
  return (data.data as Record<string, unknown>[]).map(mapAmpArtist);
}

// ─── Album-related endpoints ───

export async function getAppleMoreByArtist(albumId: string, country = 'us') {
  const cleanId = albumId.replace(/^apple_album_/, '').replace(/^apple_/, '');
  const data = await ampJson(`/${storefront(country)}/albums/${cleanId}/view/more-by-artist`);
  if (!data?.data) return [];
  return (data.data as Record<string, unknown>[]).map(mapAmpSimpleAlbum);
}

export async function getAppleAppearsOn(albumId: string, country = 'us') {
  const cleanId = albumId.replace(/^apple_album_/, '').replace(/^apple_/, '');
  const data = await ampJson(`/${storefront(country)}/albums/${cleanId}/view/appears-on`);
  if (!data?.data) return [];
  return (data.data as Record<string, unknown>[]).map(mapAmpSimpleAlbum);
}

export async function getAppleRelatedForAlbum(albumId: string, country = 'us') {
  const cleanId = albumId.replace(/^apple_album_/, '').replace(/^apple_/, '');

  const [moreByArtist, appearsOn] = await Promise.allSettled([
    ampJson(`/${storefront(country)}/albums/${cleanId}/view/more-by-artist`),
    ampJson(`/${storefront(country)}/albums/${cleanId}/view/appears-on`),
  ]);

  const moreAlbums = moreByArtist.status === 'fulfilled' && moreByArtist.value?.data
    ? (moreByArtist.value.data as Record<string, unknown>[]).map(mapAmpSimpleAlbum)
    : [];

  const compilations = appearsOn.status === 'fulfilled' && appearsOn.value?.data
    ? (appearsOn.value.data as Record<string, unknown>[]).map(mapAmpSimpleAlbum)
    : [];

  return { moreByArtist: moreAlbums, appearsOn: compilations };
}

// ─── Charts ───

export async function getAppleCharts(country = 'us', types = 'songs,albums,playlists', limit = 25) {
  const data = await ampJson(`/${storefront(country)}/charts?types=${types}&limit=${limit}`);
  if (!data?.results) return { top_tracks: [], top_albums: [], featured_playlists: [] };

  const results = data.results as Record<string, { data?: Record<string, unknown>[] }>;
  return {
    top_tracks: (results.songs?.data || []).map(t => mapAmpTrack(t)),
    top_albums: (results.albums?.data || []).map(a => mapAmpSimpleAlbum(a)),
    featured_playlists: (results.playlists?.data || []).map(p => mapAmpPlaylist(p)),
  };
}

// ─── Playlist ───

export async function getApplePlaylist(id: string, country = 'us') {
  const cleanId = id.replace(/^apple_/, '');
  const data = await ampJson(`/${storefront(country)}/playlists/${cleanId}?include=tracks`);
  if (!data?.data?.length) return null;

  const item = data.data[0] as Record<string, unknown>;
  const attrs = (item.attributes || {}) as Record<string, unknown>;
  const rels = (item.relationships || {}) as Record<string, unknown>;
  const trackData = (rels.tracks as Record<string, unknown>)?.data as Record<string, unknown>[] | undefined;

  return {
    ...mapAmpPlaylist(item),
    cover: ampImageUrl(attrs),
    trackCount: (trackData || []).length,
    tracks: (trackData || []).map(t => mapAmpTrack(t, ampImageUrl(attrs))),
  };
}

// ─── Artist Top Songs ───

export async function getAppleArtistTopSongs(artistId: string, country = 'us') {
  const cleanId = artistId.replace(/^apple_/, '');
  const data = await ampJson(`/${storefront(country)}/artists/${cleanId}/view/top-songs`);
  if (!data?.data) return [];
  return (data.data as Record<string, unknown>[]).map(t => mapAmpTrack(t));
}
