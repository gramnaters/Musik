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
  const exp = item.trackExplicitness === 'explicit' || item.trackExplicitness === 'explicit_edited';
  return {
    id: `apple_${id}`,
    title: String(item.trackName ?? ''),
    artist: String(item.artistName ?? ''),
    album: String(item.collectionName ?? ''),
    albumCover: appleArtworkUrl(item),
    duration: typeof item.trackTimeMillis === 'number' ? Math.round(item.trackTimeMillis / 1000) : 0,
    streamURL: preview || undefined,
    source: 'apple' as const,
    explicit: Boolean(exp),
  };
}

function mapSpotifyTrackFromPlaylistItem(tr: Record<string, unknown>) {
  const album = tr.album as Record<string, unknown> | undefined;
  const images = (album?.images as { url?: string; width?: number }[]) || [];
  const bySize = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const artists = (tr.artists as { name?: string }[]) || [];
  const preview = tr.preview_url as string | null | undefined;
  return {
    id: `spotify_${String(tr.id)}`,
    title: String(tr.name ?? ''),
    artist: artists.map((a) => a.name).filter(Boolean).join(', '),
    album: String(album?.name ?? ''),
    albumCover: bySize[0]?.url || images[0]?.url || '',
    duration: Math.round(((tr.duration_ms as number) || 0) / 1000),
    streamURL: preview || undefined,
    source: 'spotify' as const,
    explicit: tr.explicit === true,
  };
}

async function getSpotifyToken(): Promise<string | null> {
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
  const json = (await res.json()) as { access_token?: string };
  return json.access_token || null;
}

async function spotifyPlaylistTracks(playlistId: string, market: string) {
  const token = await getSpotifyToken();
  if (!token) {
    return { error: 'missing_spotify_credentials' as const, detail: undefined as string | undefined, tracks: [] as ReturnType<typeof mapSpotifyTrackFromPlaylistItem>[] };
  }
  const m = market.trim() || 'US';
  const tracks: ReturnType<typeof mapSpotifyTrackFromPlaylistItem>[] = [];
  let next: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&market=${encodeURIComponent(m)}`;
  let guard = 0;
  while (next && guard < 10) {
    guard += 1;
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { error: 'spotify_http' as const, detail: t.slice(0, 200), tracks };
    }
    const data = (await res.json()) as {
      items?: { track: Record<string, unknown> | null }[];
      next?: string | null;
    };
    for (const row of data.items || []) {
      const tr = row.track;
      if (!tr || typeof tr !== 'object') continue;
      if (String(tr.type) === 'episode') continue;
      if (String(tr.type) !== 'track') continue;
      tracks.push(mapSpotifyTrackFromPlaylistItem(tr));
    }
    next = data.next || null;
  }
  return { tracks, error: undefined as undefined, detail: undefined as undefined };
}

async function spotifyAlbumTracks(albumId: string, market: string) {
  const token = await getSpotifyToken();
  if (!token) {
    return {
      error: 'missing_spotify_credentials' as const,
      detail: undefined as string | undefined,
      tracks: [] as ReturnType<typeof mapSpotifyTrackFromPlaylistItem>[],
    };
  }
  const m = market.trim() || 'US';
  const tracks: ReturnType<typeof mapSpotifyTrackFromPlaylistItem>[] = [];
  let next: string | null = `https://api.spotify.com/v1/albums/${encodeURIComponent(albumId)}/tracks?limit=50&market=${encodeURIComponent(m)}`;
  let guard = 0;
  while (next && guard < 10) {
    guard += 1;
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { error: 'spotify_http' as const, detail: t.slice(0, 200), tracks };
    }
    const data = (await res.json()) as {
      items?: Record<string, unknown>[];
      next?: string | null;
    };
    for (const tr of data.items || []) {
      if (!tr || typeof tr !== 'object') continue;
      tracks.push(mapSpotifyTrackFromPlaylistItem(tr));
    }
    next = data.next || null;
  }
  return { tracks, error: undefined as undefined, detail: undefined as undefined };
}

const ITUNES_UA = 'Mozilla/5.0 (compatible; MusikCatalog/1.0) AppleWebKit/537.36';

async function appleAlbumTracks(collectionId: string, country: string) {
  const cc = country.length === 2 ? country.toUpperCase() : 'US';
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(collectionId)}&entity=song&limit=200&country=${encodeURIComponent(cc)}`;
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json', 'User-Agent': ITUNES_UA },
  });
  if (!res.ok) {
    return { error: 'apple_lookup_http' as const, tracks: [] as ReturnType<typeof mapAppleTrack>[] };
  }
  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  const rows = data.results || [];
  const tracks = rows
    .filter((r) => r.wrapperType === 'track' || r.kind === 'song')
    .map(mapAppleTrack)
    .filter((t) => t.title);
  return { tracks, error: undefined as undefined };
}

/** Resolve playlist (Spotify) or album (Apple) track lists for in-app hubs. */
export async function GET(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get('provider') || 'spotify') as Provider;
  const rawId = req.nextUrl.searchParams.get('id')?.trim() || '';
  const country = req.nextUrl.searchParams.get('country')?.trim() || 'US';
  const market = req.nextUrl.searchParams.get('market')?.trim() || country || 'US';
  if (!rawId) {
    return NextResponse.json({ tracks: [], error: 'missing_id' }, { status: 400 });
  }

  let spotifyPlaylistId = rawId;
  if (rawId.startsWith('spotify_pl_')) {
    spotifyPlaylistId = rawId.slice('spotify_pl_'.length);
  } else if (rawId.startsWith('spotify_album_')) {
    spotifyPlaylistId = rawId.slice('spotify_album_'.length);
  } else if (rawId.startsWith('spotify_')) {
    spotifyPlaylistId = rawId.replace(/^spotify_/, '');
  }

  let appleCollectionId = rawId;
  if (rawId.startsWith('apple_album_')) {
    appleCollectionId = rawId.slice('apple_album_'.length);
  }

  try {
    if (provider === 'spotify' && rawId.startsWith('spotify_album_')) {
      const albumId = rawId.slice('spotify_album_'.length);
      const { tracks, error, detail } = await spotifyAlbumTracks(albumId, market);
      if (error) {
        return NextResponse.json(
          { tracks: [], error, detail },
          { status: error === 'missing_spotify_credentials' ? 501 : 502 }
        );
      }
      return NextResponse.json({ tracks, provider: 'spotify' });
    }
    if (provider === 'spotify') {
      const { tracks, error, detail } = await spotifyPlaylistTracks(spotifyPlaylistId, market);
      if (error) {
        return NextResponse.json(
          { tracks: [], error, detail },
          { status: error === 'missing_spotify_credentials' ? 501 : 502 }
        );
      }
      return NextResponse.json({ tracks, provider: 'spotify' });
    }
    const { tracks, error } = await appleAlbumTracks(appleCollectionId, country);
    if (error) {
      return NextResponse.json({ tracks: [], error }, { status: 502 });
    }
    return NextResponse.json({ tracks, provider: 'apple' });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'playlist_items_failed';
    return NextResponse.json({ tracks: [], error: message }, { status: 500 });
  }
}
