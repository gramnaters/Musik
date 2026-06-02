import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0';

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
  } catch { return null; }
}

async function scrapeWebPlayKitToken(): Promise<string | null> {
  const html = await fetch('https://music.apple.com/us/browse', {
    headers: { 'User-Agent': UA },
  });
  if (!html.ok) return null;
  const text = await html.text();
  const jsMatch = text.match(/crossorigin src="(\/assets\/index.+?\.js)"/);
  if (!jsMatch) return null;
  const js = await fetch(`https://music.apple.com${jsMatch[1]}`, { headers: { 'User-Agent': UA } });
  if (!js.ok) return null;
  const jsText = await js.text();
  const jwtMatch = jsText.match(/(eyJhbGc[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+)/);
  return jwtMatch ? jwtMatch[1] : null;
}

async function getValidToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  const token = await scrapeWebPlayKitToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp * 1000 : Date.now() + 3600000;
  tokenCache = { value: token, expiresAt: exp - 60000 };
  return token;
}

async function ampCharts(country: string): Promise<{ tracks: any[]; albums: any[]; playlists: any[] }> {
  try {
    const token = await getValidToken();
    if (!token) throw new Error('No Apple Music token');
    const cc = country.toLowerCase().slice(0, 2) || 'us';
    const res = await fetch(`${AMP_API}/${cc}/charts?types=songs,albums,playlists&limit=25`, {
      headers: { Authorization: `Bearer ${token}`, Origin: 'https://music.apple.com' },
    });
    if (!res.ok) throw new Error(`AMP charts returned ${res.status}`);
    const data = await res.json();
    const results = data?.results || {};
    const rawTracks = results.songs?.data || [];
    const rawAlbums = results.albums?.data || [];
    const rawPlaylists = results.playlists?.data || [];
    return {
      tracks: rawTracks.map((t: any) => {
        const a = t.attributes || {};
        const artUrl = (a.artwork?.url || '').replace(/\{w\}x\{h\}(bb)?/g, '3000x3000bb');
        return {
          id: `apple_${t.id}`,
          title: String(a.name || ''),
          artist: String(a.artistName || ''),
          album: String(a.albumName || ''),
          albumCover: artUrl,
          duration: Math.round(Number(a.durationInMillis || 0) / 1000),
          source: 'apple',
          explicit: a.contentRating === 'explicit' || false,
        };
      }),
      albums: rawAlbums.map((a: any) => {
        const attrs = a.attributes || {};
        const artUrl = (attrs.artwork?.url || '').replace(/\{w\}x\{h\}(bb)?/g, '3000x3000bb');
        return {
          id: `apple_${a.id}`,
          title: String(attrs.name || ''),
          artist: { name: String(attrs.artistName || '') },
          cover: artUrl,
          source: 'apple',
          year: attrs.releaseDate ? String(attrs.releaseDate).slice(0, 4) : undefined,
        };
      }),
      playlists: rawPlaylists.map((p: any) => {
        const attrs = p.attributes || {};
        const artUrl = (attrs.artwork?.url || '').replace(/\{w\}x\{h\}(bb)?/g, '3000x3000bb');
        return {
          id: `apple_${p.id}`,
          title: String(attrs.name || ''),
          description: String(attrs.description?.standard || ''),
          cover: artUrl,
          source: 'apple',
        };
      }),
    };
  } catch (e) {
    console.error('Apple Music charts failed:', e);
    return { tracks: [], albums: [], playlists: [] };
  }
}

async function getSpotifyToken() {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body,
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({})) as { access_token?: string };
  return json.access_token || null;
}

function mapAppleImage(images: { label: string; attributes?: { height: string } }[]): string {
  if (!images?.length) return '';
  const best = images.reduce((a, b) => {
    const ah = parseInt(a.attributes?.height || '0', 10);
    const bh = parseInt(b.attributes?.height || '0', 10);
    return bh > ah ? b : a;
  });
  return best.label.replace(/\/\d+x\d+bb\.(png|jpg)/, '/3000x3000bb.jpg');
}

async function fetchAppleTop(country: string) {
  const cc = country.toLowerCase().slice(0, 2) || 'us';
  const limit = 25;
  try {
    const [chartsData, songsRes] = await Promise.all([
      ampCharts(cc),
      fetch(
        `https://itunes.apple.com/${cc}/rss/topsongs/limit=${limit}/json`,
        { headers: { 'User-Agent': UA }, next: { revalidate: 3600 } }
      ).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const topTracks = chartsData.tracks;
    const topAlbums = chartsData.albums;
    const featuredPlaylists = chartsData.playlists;

    // Fall back to iTunes RSS if AMP charts returned no tracks
    if (topTracks.length === 0 && songsRes) {
      const entries = songsRes?.feed?.entry || [];
      for (const item of entries) {
        const id = item.id?.label || '';
        topTracks.push({
          id: id.split('/').pop() || id,
          title: item['im:name']?.label || '',
          artist: item['im:artist']?.label || '',
          album: item['im:collection']?.['im:name']?.label || '',
          albumCover: mapAppleImage(item['im:image'] || []),
          duration: 0,
          source: 'apple',
          explicit: false,
        });
      }
    }

    return { top_tracks: topTracks, top_albums: topAlbums, featured_playlists: featuredPlaylists, sections: [] };
  } catch {
    return { top_tracks: [], top_albums: [], featured_playlists: [], sections: [] };
  }
}

async function fetchSpotifyTrending(market: string) {
  const token = await getSpotifyToken();
  if (!token) return null;

  const m = market.toUpperCase().slice(0, 2) || 'US';
  const limit = 10;
  const year = new Date().getFullYear();

  try {
    const [tracksRes, albumsRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(`year:${year}`)}&type=track&market=${m}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
      fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(`year:${year}`)}&type=album&market=${m}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
    ]);

    const topTracks: any[] = [];
    const topAlbums: any[] = [];

    if (tracksRes.ok) {
      const data = await tracksRes.json() as any;
      const items = data?.tracks?.items || [];
      for (const item of items) {
        const album = item.album as Record<string, unknown> | undefined;
        const images = (album?.images as { url?: string }[]) || [];
        const artists = (item.artists as { name?: string }[]) || [];
        topTracks.push({
          id: `spotify_${String(item.id)}`,
          title: String(item.name || ''),
          artist: artists.map((a) => a.name).filter(Boolean).join(', '),
          album: String(album?.name || ''),
          albumCover: images[0]?.url || '',
          duration: Math.round(((item.duration_ms as number) || 0) / 1000),
          source: 'spotify',
          explicit: item.explicit === true,
        });
      }
    }

    if (albumsRes.ok) {
      const data = await albumsRes.json() as any;
      const items = data?.albums?.items || [];
      for (const item of items) {
        const images = (item.images || []) as { url?: string }[];
        const artists = (item.artists || []) as { name?: string }[];
        topAlbums.push({
          id: `spotify_${String(item.id)}`,
          title: String(item.name || ''),
          artist: { name: artists.map((a) => a.name).filter(Boolean).join(', ') },
          cover: images[0]?.url || '',
          source: 'spotify',
        });
      }
    }

    return { top_tracks: topTracks, top_albums: topAlbums, featured_playlists: [], sections: [] };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get('provider') || '').toLowerCase();
  const countryParam = (req.nextUrl.searchParams.get('country') || 'US').trim();
  const country = /^[a-z]{2}$/i.test(countryParam) ? countryParam.toLowerCase() : 'us';

  try {
    if (provider === 'apple') {
      const data = await fetchAppleTop(country);
      return NextResponse.json(data);
    }

    if (provider === 'spotify') {
      const spotifyData = await fetchSpotifyTrending(country);
      if (spotifyData) {
        return NextResponse.json(spotifyData);
      }
    }

    const response = await fetch('https://hot.monochrome.tf/', {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Hot API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Hot API proxy failed:', error);
    return NextResponse.json({ error: 'Failed to fetch trending data' }, { status: 500 });
  }
}
