import { NextRequest, NextResponse } from 'next/server';
import { searchTracks, searchTracksExplicit, searchArtists as mcSearchArtists, searchPlaylists as mcSearchPlaylists, getTrackInfo, mapMonochromeTrack, mapMonochromeArtist, mapMonochromePlaylist } from '@/lib/monochrome';
import { searchAppleProxy, appleArtworkUrl, mapAppleTrack, mapAppleArtist, mapApplePlaylistFromAlbum, mapAppleAlbum } from '@/lib/apple-proxy';
import { searchQobuzTracks, searchQobuzAlbums, searchQobuzArtists, mapQobuzTrack, mapQobuzArtist, mapQobuzPlaylistFromAlbum, mapQobuzAlbum } from '@/lib/qobuz';

function parseIsoDurationString(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseFloat(match[3] || '0');
  return Math.round(h * 3600 + m * 60 + s);
}

const tidalClientId = process.env.TIDAL_CLIENT_ID?.trim() || 'txNoH4kkV41MfH25';
const tidalClientSecret = process.env.TIDAL_CLIENT_SECRET?.trim() || 'dQjy0MinCEvxi1O4UmxvxWnDjt4cgHBPw8ll6nYBk98=';
try {
  initTidal(tidalClientId, tidalClientSecret);
} catch (e) {
  console.error('Tidal initialization failed:', e);
}

type Provider = 'spotify' | 'apple' | 'monochrome' | 'qobuz' | 'tidal';

type TokenResult =
  | { ok: true; token: string }
  | { ok: false; error: 'missing_spotify_credentials' | 'spotify_token_http'; detail?: string };

async function getSpotifyToken(): Promise<TokenResult> {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    return { ok: false, error: 'missing_spotify_credentials' };
  }
  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body,
  });
  const raw = await res.text();
  if (!res.ok) {
    let detail = raw.slice(0, 180);
    try {
      const j = JSON.parse(raw) as { error_description?: string; error?: string };
      detail = j.error_description || j.error || detail;
    } catch {
      /* ignore */
    }
    return { ok: false, error: 'spotify_token_http', detail: detail || `HTTP ${res.status}` };
  }
  try {
    const json = JSON.parse(raw) as { access_token?: string };
    if (!json.access_token) {
      return { ok: false, error: 'spotify_token_http', detail: 'No access_token in token response' };
    }
    return { ok: true, token: json.access_token };
  } catch {
    return { ok: false, error: 'spotify_token_http', detail: 'Invalid token JSON' };
  }
}

function mapSpotifyTrack(item: Record<string, unknown>) {
  const album = item.album as Record<string, unknown> | undefined;
  const images = (album?.images as { url?: string; width?: number }[]) || [];
  const bySize = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const artists = (item.artists as { name?: string }[]) || [];
  return {
    id: `spotify_${String(item.id)}`,
    title: String(item.name ?? ''),
    artist: artists.map((a) => a.name).filter(Boolean).join(', '),
    album: String(album?.name ?? ''),
    albumCover: bySize[0]?.url || images[0]?.url || '',
    duration: Math.round(((item.duration_ms as number) || 0) / 1000),
    streamURL: undefined,
    source: 'spotify' as const,
    explicit: item.explicit === true,
  };
}

async function searchSpotify(q: string, limit: number, market: string) {
  const tokenRes = await getSpotifyToken();
  if (!tokenRes.ok) {
    return {
      tracks: [] as ReturnType<typeof mapAppleTrack>[],
      artists: [] as { id: string; name: string; image?: string }[],
      error: tokenRes.error,
      detail: tokenRes.detail,
    };
  }
  const token = tokenRes.token;
  const cap = Math.min(limit, 50);
  const m = market.trim() || 'US';
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=${cap}&market=${encodeURIComponent(m)}`;
  console.log('Spotify URL:', url, 'limit passed:', limit);
  const res = await fetch(
    url,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return {
      tracks: [] as ReturnType<typeof mapAppleTrack>[],
      artists: [] as { id: string; name: string; image?: string }[],
      error: 'spotify_http' as const,
      detail: t.slice(0, 200) || `HTTP ${res.status}`,
    };
  }
  const data = (await res.json()) as {
    tracks?: { items?: Record<string, unknown>[] };
  };
  const items = data.tracks?.items || [];
  const tracks = items.map(mapSpotifyTrack);
  return { tracks, artists: [] as { id: string; name: string; image?: string }[], error: undefined as undefined, detail: undefined as undefined };
}

async function searchSpotifyArtists(q: string, limit: number, market: string) {
  const tokenRes = await getSpotifyToken();
  if (!tokenRes.ok) {
    return {
      artists: [] as { id: string; name: string; image?: string }[],
      error: tokenRes.error,
      detail: tokenRes.detail,
    };
  }
  const cap = Math.min(limit, 50);
  const m = market.trim() || 'US';
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=${cap}&market=${encodeURIComponent(m)}`,
    {
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return { artists: [] as { id: string; name: string; image?: string }[], error: 'spotify_http' as const, detail: t.slice(0, 200) };
  }
  const data = (await res.json()) as {
    artists?: { items?: Record<string, unknown>[] };
  };
  const items = data.artists?.items || [];
  const artists = items.map((item) => {
    const images = (item.images as { url?: string; width?: number }[]) || [];
    const bySize = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    return {
      id: `spotify_${String(item.id)}`,
      name: String(item.name ?? ''),
      image: bySize[0]?.url || images[0]?.url || '',
    };
  });
  return { artists, error: undefined as undefined, detail: undefined as undefined };
}
                              

type CatalogPlaylistRow = {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  trackCount?: number;
  source: Provider;
};

function mapSpotifyPlaylistRow(item: Record<string, unknown>): CatalogPlaylistRow | null {
  const id = item.id;
  if (typeof id !== 'string' && typeof id !== 'number') return null;
  const images = (item.images as { url?: string }[]) || [];
  const owner = item.owner as { display_name?: string } | undefined;
  const tracksMeta = item.tracks as { total?: number } | undefined;
  return {
    id: `spotify_pl_${String(id)}`,
    name: String(item.name ?? ''),
    description: owner?.display_name ? `By ${owner.display_name}` : 'Spotify playlist',
    cover: images[0]?.url || '',
    trackCount: typeof tracksMeta?.total === 'number' ? tracksMeta.total : undefined,
    source: 'spotify',
  };
}

async function searchSpotifyPlaylists(q: string, limit: number, market: string) {
  const tokenRes = await getSpotifyToken();
  if (!tokenRes.ok) {
    return {
      playlists: [] as CatalogPlaylistRow[],
      error: tokenRes.error,
      detail: tokenRes.detail,
    };
  }
  const cap = Math.min(limit, 50);
  const m = market.trim() || 'US';
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=playlist&limit=${cap}&market=${encodeURIComponent(m)}`,
    {
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return {
      playlists: [] as CatalogPlaylistRow[],
      error: 'spotify_http' as const,
      detail: t.slice(0, 200) || `HTTP ${res.status}`,
    };
  }
  const data = (await res.json()) as {
    playlists?: { items?: Record<string, unknown>[] };
  };
  const items = data.playlists?.items || [];
  const playlists = items.map(mapSpotifyPlaylistRow).filter((p): p is CatalogPlaylistRow => p != null);
  return { playlists, error: undefined as undefined, detail: undefined as undefined };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const provider = (req.nextUrl.searchParams.get('provider') || 'apple') as Provider;
  const entity = (req.nextUrl.searchParams.get('entity') || 'track').toLowerCase();
  const limitRaw = req.nextUrl.searchParams.get('limit');
  const parsed = Number.parseInt(limitRaw || '25', 10);
  const limit = Number.isFinite(parsed) ? Math.min(200, Math.max(1, parsed)) : 25;
  const spotifyLimit = Math.min(10, limit);
  const countryParam = req.nextUrl.searchParams.get('country')?.trim() || 'US';
  const appleCountry = /^[a-z]{2}$/i.test(countryParam) ? countryParam.toUpperCase() : 'US';
  const marketParam = req.nextUrl.searchParams.get('market')?.trim() || '';
  const market = /^[a-z]{2}$/i.test(marketParam)
    ? marketParam.toUpperCase()
    : appleCountry;
  if (!q) {
    return NextResponse.json({ tracks: [], artists: [], playlists: [], error: 'empty_query' });
  }
  try {
    if (provider === 'apple') {
      const proxyResult = await searchAppleProxy(q);
      if (!proxyResult) {
        return NextResponse.json({ tracks: [], artists: [], playlists: [], provider: 'apple', error: 'apple_proxy_failed' });
      }
      const tracks = (proxyResult.results.songs?.data || []).map(d => mapAppleTrack(d.attributes, d.id)).filter(t => t.title);
      const artists = (proxyResult.results.artists?.data || []).map(d => mapAppleArtist(d.attributes, d.id)).filter(a => a.name);
      const albums = (proxyResult.results.albums?.data || []).map(d => mapAppleAlbum(d.attributes, d.id)).filter(a => a.title);
      const playlists = albums.map(mapApplePlaylistFromAlbum);
      return NextResponse.json({ tracks, artists, playlists, provider: 'apple', country: appleCountry });
    }
    if (entity === 'artist') {
      if (provider === 'monochrome') {
        try {
          const data = await mcSearchArtists(q);
          const artists = (data.artists || []).map(mapMonochromeArtist);
          return NextResponse.json({ tracks: [], artists, playlists: [], provider: 'monochrome' });
        } catch {
          try {
            const client = TidalClient.getInstance();
            const tidalData = await client.search(q, limit);
            const artists = (tidalData.artists?.items || []).map((a: any) => ({
              id: `tidal_${a.id}`,
              name: a.name,
              image: a.picture ? `/api/cover?id=${a.picture}&size=1920` : '',
            }));
            return NextResponse.json({ tracks: [], artists, playlists: [], provider: 'monochrome', fallback: 'tidal' });
          } catch {
            return NextResponse.json({ tracks: [], artists: [], playlists: [], provider: 'monochrome', fallback: 'tidal' });
          }
        }
      }
      const { artists, error, detail } = await searchSpotifyArtists(q, spotifyLimit, market);
      return NextResponse.json({ tracks: [], artists, playlists: [], provider: 'spotify', error, detail });
    }

    if (entity === 'playlist') {
      if (provider === 'monochrome') {
        try {
          const data = await mcSearchPlaylists(q);
          const playlists = (data.playlists || []).map(mapMonochromePlaylist);
          return NextResponse.json({ tracks: [], artists: [], playlists, provider: 'monochrome' });
        } catch {
          return NextResponse.json({ tracks: [], artists: [], playlists: [], provider: 'monochrome', fallback: 'tidal' });
        }
      }
      const { playlists, error, detail } = await searchSpotifyPlaylists(q, spotifyLimit, market);
      return NextResponse.json({ tracks: [], artists: [], playlists, provider: 'spotify', error, detail });
    }

    if (provider === 'qobuz') {
      const qobuzCap = Math.min(limit, 50);
      const searchTracks = await searchQobuzTracks(q, qobuzCap);
      const searchArtists = await searchQobuzArtists(q, qobuzCap);
      const searchAlbums = await searchQobuzAlbums(q, qobuzCap);
      const tracks = searchTracks.map(mapQobuzTrack).filter(t => t.title);
      const albums = searchAlbums.map(mapQobuzAlbum).filter(a => a.title);
      const artists = searchArtists.map(mapQobuzArtist).filter(a => a.name);
      const playlists = albums.map(mapQobuzPlaylistFromAlbum);
      return NextResponse.json({ tracks, artists, playlists, provider: 'qobuz' });
    }
    if (provider === 'monochrome' || provider === 'tidal') {
      try {
        const raw = await searchTracks(q, limit);
        const tracks = (Array.isArray(raw) ? raw : []).map(mapMonochromeTrack);
        if (tracks.length > 0) {
          return NextResponse.json({ tracks, artists: [], playlists: [], provider: 'monochrome' });
        }
      } catch (e) {
        console.error('[Monochrome search] error:', e);
      }
      return NextResponse.json({ tracks: [], artists: [], playlists: [], provider: 'monochrome' });
    }
    const { tracks, error, detail } = await searchSpotify(q, spotifyLimit, market);
    return NextResponse.json({ tracks, artists: [], playlists: [], provider: 'spotify', error, detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search_failed';
    return NextResponse.json({ tracks: [], artists: [], playlists: [], error: message }, { status: 500 });
  }
}
