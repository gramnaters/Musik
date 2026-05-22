import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0';

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
    const songsRes = await fetch(
      `https://itunes.apple.com/${cc}/rss/topsongs/limit=${limit}/json`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 3600 } }
    );

    const topTracks: any[] = [];

    if (songsRes.ok) {
      const data = await songsRes.json() as any;
      const entries = data?.feed?.entry || [];
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

    return { top_tracks: topTracks, top_albums: [], featured_playlists: [], sections: [] };
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
  const country = /^[a-z]{2}$/i.test(countryParam) ? countryParam.toUpperCase() : 'US';

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
