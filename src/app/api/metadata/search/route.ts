import { NextRequest, NextResponse } from 'next/server';

type Provider = 'spotify' | 'apple';

function appleArtworkUrl(item: Record<string, unknown>): string {
  const raw =
    (typeof item.artworkUrl100 === 'string' && item.artworkUrl100) ||
    (typeof item.artworkUrl600 === 'string' && item.artworkUrl600) ||
    (typeof item.artworkUrl60 === 'string' && item.artworkUrl60) ||
    '';
  if (!raw) return '';
  return raw
    .replace(/100x100bb/gi, '600x600bb')
    .replace(/60x60bb/gi, '600x600bb')
    .replace(/100x100/gi, '600x600')
    .replace(/60x60/gi, '600x600');
}

function mapAppleTrack(item: Record<string, unknown>) {
  const preview =
    (typeof item.previewUrl === 'string' && item.previewUrl) ||
    (typeof item.trackPreviewUrl === 'string' && item.trackPreviewUrl) ||
    '';
  const id = String(item.trackId ?? item.collectionId ?? Math.random());
  return {
    id: `apple_${id}`,
    title: String(item.trackName ?? ''),
    artist: String(item.artistName ?? ''),
    album: String(item.collectionName ?? ''),
    albumCover: appleArtworkUrl(item),
    duration: typeof item.trackTimeMillis === 'number' ? Math.round(item.trackTimeMillis / 1000) : 0,
    streamURL: preview || undefined,
    source: 'apple' as const,
    explicit: item.trackExplicitness === 'explicit' || item.trackExplicitness === 'explicit_edited',
  };
}

const ITUNES_UA =
  'Mozilla/5.0 (compatible; BeatBossPlayer/1.0; +https://example.invalid) AppleWebKit/537.36';

async function searchApple(q: string, limit: number, country: string) {
  const cc = country.length === 2 ? country.toUpperCase() : 'US';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=${limit}&country=${encodeURIComponent(cc)}`;
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json', 'User-Agent': ITUNES_UA },
  });
  if (!res.ok) throw new Error(`Apple search HTTP ${res.status}`);
  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  const results = data.results || [];
  return results.map(mapAppleTrack).filter((t) => t.title);
}

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
  const preview = item.preview_url as string | null | undefined;
  return {
    id: `spotify_${String(item.id)}`,
    title: String(item.name ?? ''),
    artist: artists.map((a) => a.name).filter(Boolean).join(', '),
    album: String(album?.name ?? ''),
    albumCover: bySize[0]?.url || images[0]?.url || '',
    duration: Math.round(((item.duration_ms as number) || 0) / 1000),
    streamURL: preview || undefined,
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
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=${cap}&market=${encodeURIComponent(m)}`,
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

function mapAppleArtist(item: Record<string, unknown>) {
  const id = String(item.artistId ?? item.amgArtistId ?? Math.random());
  return {
    id: `apple_${id}`,
    name: String(item.artistName ?? ''),
    image: appleArtworkUrl(item),
  };
}

async function searchAppleArtists(q: string, limit: number, country: string) {
  const cc = country.length === 2 ? country.toUpperCase() : 'US';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicArtist&limit=${limit}&country=${encodeURIComponent(cc)}`;
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json', 'User-Agent': ITUNES_UA },
  });
  if (!res.ok) throw new Error(`Apple artist search HTTP ${res.status}`);
  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  const results = data.results || [];
  return results.map(mapAppleArtist).filter((a) => a.name);
}

/** iTunes artist rows often omit artwork; use the first matching track’s art as a portrait fallback. */
async function enrichAppleArtistArtwork(
  artists: { id: string; name: string; image?: string }[],
  country: string,
  batchSize = 5
): Promise<{ id: string; name: string; image?: string }[]> {
  const out: { id: string; name: string; image?: string }[] = [];
  for (let i = 0; i < artists.length; i += batchSize) {
    const slice = artists.slice(i, i + batchSize);
    const batch = await Promise.all(
      slice.map(async (a) => {
        if (a.image) return a;
        try {
          const tracks = await searchApple(a.name, 1, country);
          const img = tracks[0]?.albumCover;
          return img ? { ...a, image: img } : a;
        } catch {
          return a;
        }
      })
    );
    out.push(...batch);
  }
  return out;
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

function mapAppleAlbumAsPlaylistRow(item: Record<string, unknown>): CatalogPlaylistRow | null {
  const cid = item.collectionId;
  if (cid == null) return null;
  return {
    id: `apple_album_${String(cid)}`,
    name: String(item.collectionName ?? ''),
    description: 'Apple album',
    cover: appleArtworkUrl(item),
    trackCount: typeof item.trackCount === 'number' ? item.trackCount : undefined,
    source: 'apple',
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

async function searchAppleAlbumPlaylists(q: string, limit: number, country: string) {
  const cc = country.length === 2 ? country.toUpperCase() : 'US';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=${limit}&country=${encodeURIComponent(cc)}`;
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json', 'User-Agent': ITUNES_UA },
  });
  if (!res.ok) throw new Error(`Apple album search HTTP ${res.status}`);
  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  const results = data.results || [];
  const playlists = results
    .filter((r) => r.wrapperType === 'collection')
    .map(mapAppleAlbumAsPlaylistRow)
    .filter((p): p is CatalogPlaylistRow => p != null && !!p.name);
  return playlists;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const provider = (req.nextUrl.searchParams.get('provider') || 'apple') as Provider;
  const entity = (req.nextUrl.searchParams.get('entity') || 'track').toLowerCase();
  const limitRaw = req.nextUrl.searchParams.get('limit');
  const parsed = Number.parseInt(limitRaw || '25', 10);
  const limit = Number.isFinite(parsed) ? Math.min(200, Math.max(1, parsed)) : 25;
  const appleLimit = Math.min(200, limit);
  const spotifyLimit = Math.min(50, limit);
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
    if (entity === 'artist') {
      if (provider === 'apple') {
        const raw = await searchAppleArtists(q, appleLimit, appleCountry);
        const artists = await enrichAppleArtistArtwork(raw, appleCountry);
        return NextResponse.json({
          tracks: [],
          artists,
          playlists: [],
          provider: 'apple',
          country: appleCountry,
        });
      }
      const { artists, error, detail } = await searchSpotifyArtists(q, spotifyLimit, market);
      return NextResponse.json({ tracks: [], artists, playlists: [], provider: 'spotify', error, detail });
    }

    if (entity === 'playlist') {
      if (provider === 'apple') {
        const playlists = await searchAppleAlbumPlaylists(q, appleLimit, appleCountry);
        return NextResponse.json({
          tracks: [],
          artists: [],
          playlists,
          provider: 'apple',
          country: appleCountry,
        });
      }
      const { playlists, error, detail } = await searchSpotifyPlaylists(q, spotifyLimit, market);
      return NextResponse.json({ tracks: [], artists: [], playlists, provider: 'spotify', error, detail });
    }

    if (provider === 'apple') {
      const tracks = await searchApple(q, appleLimit, appleCountry);
      return NextResponse.json({ tracks, artists: [], playlists: [], provider: 'apple', country: appleCountry });
    }
    const { tracks, error, detail } = await searchSpotify(q, spotifyLimit, market);
    return NextResponse.json({ tracks, artists: [], playlists: [], provider: 'spotify', error, detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search_failed';
    return NextResponse.json({ tracks: [], artists: [], playlists: [], error: message }, { status: 500 });
  }
}
