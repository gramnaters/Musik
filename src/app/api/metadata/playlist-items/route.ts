import { NextRequest, NextResponse } from 'next/server';

type Provider = 'spotify' | 'apple' | 'tidal';

function appleArtworkUrl(item: Record<string, unknown>): string {
  const raw =
    (typeof item.artworkUrl100 === 'string' && item.artworkUrl100) ||
    (typeof item.artworkUrl600 === 'string' && item.artworkUrl600) ||
    (typeof item.artworkUrl60 === 'string' && item.artworkUrl60) ||
    '';
  if (!raw) return '';
  return raw
    .replace(/100x100bb/gi, '3000x3000bb')
    .replace(/60x60bb/gi, '3000x3000bb')
    .replace(/100x100/gi, '3000x3000')
    .replace(/60x60/gi, '3000x3000');
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
    streamURL: undefined,
    source: 'apple' as const,
    explicit: Boolean(exp),
  };
}

function mapSpotifyTrackFromPlaylistItem(tr: Record<string, unknown>) {
  const album = tr.album as Record<string, unknown> | undefined;
  const images = (album?.images as { url?: string; width?: number }[]) || [];
  const bySize = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const artists = (tr.artists as { name?: string }[]) || [];
  return {
    id: `spotify_${String(tr.id)}`,
    title: String(tr.name ?? ''),
    artist: artists.map((a) => a.name).filter(Boolean).join(', '),
    album: String(album?.name ?? ''),
    albumCover: bySize[0]?.url || images[0]?.url || '',
    duration: Math.round(((tr.duration_ms as number) || 0) / 1000),
    streamURL: undefined,
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

async function getTidalToken(): Promise<string | null> {
  const id = process.env.TIDAL_CLIENT_ID?.trim() || 'txNoH4kkV41MfH25';
  const secret = process.env.TIDAL_CLIENT_SECRET?.trim() || 'dQjy0MinCEvxi1O4UmxvxWnDjt4cgHBPw8ll6nYBk98=';
  
  try {
    const auth = Buffer.from(`${id}:${secret}`).toString('base64');
    const res = await fetch('https://auth.tidal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

function mapTidalTrack(item: any) {
  return {
    id: `tidal_${item.id}`,
    title: item.title,
    artist: item.artist?.name || item.artists?.map((a: any) => a.name).join(', ') || '',
    album: item.album?.title || '',
    albumCover: item.album?.cover 
      ? `/api/cover?id=${item.album.cover}&size=1920` 
      : '',
    duration: item.duration || 0,
    streamURL: undefined,
    source: 'tidal' as const,
    explicit: item.explicit === true,
  };
}

async function tidalAlbumTracks(albumId: string, countryCode: string) {
  const token = await getTidalToken();
  if (!token) return [];
  
  const cc = countryCode.length === 2 ? countryCode.toUpperCase() : 'US';
  try {
    // Try items first (standard album tracks endpoint in Tidal v1)
    const res = await fetch(`https://api.tidal.com/v1/albums/${encodeURIComponent(albumId)}/items?limit=100&countryCode=${cc}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (!res.ok) {
      // Try tracks fallback
      const res2 = await fetch(`https://api.tidal.com/v1/albums/${encodeURIComponent(albumId)}/tracks?limit=100&countryCode=${cc}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (!res2.ok) return [];
      const data = await res2.json();
      return (data.items || []).map(mapTidalTrack);
    }
    const data = await res.json();
    return (data.items || []).map((x: any) => mapTidalTrack(x.item || x));
  } catch {
    return [];
  }
}

async function tidalPlaylistTracks(playlistId: string, countryCode: string) {
  const token = await getTidalToken();
  if (!token) return [];
  
  const cc = countryCode.length === 2 ? countryCode.toUpperCase() : 'US';
  try {
    const res = await fetch(`https://api.tidal.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=100&countryCode=${cc}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((x: any) => mapTidalTrack(x.item || x));
  } catch {
    return [];
  }
}

/** Resolve playlist (Spotify/Tidal) or album (Apple/Spotify/Tidal) track lists for in-app hubs. */
export async function GET(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get('provider') || 'spotify') as Provider;
  const rawId = req.nextUrl.searchParams.get('id')?.trim() || '';
  const country = req.nextUrl.searchParams.get('country')?.trim() || 'US';
  const market = req.nextUrl.searchParams.get('market')?.trim() || country || 'US';
  const title = req.nextUrl.searchParams.get('title')?.trim() || '';
  const artist = req.nextUrl.searchParams.get('artist')?.trim() || '';
  const typeParam = req.nextUrl.searchParams.get('type')?.trim() || '';

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

  let tidalId = rawId;
  if (rawId.startsWith('tidal_album_')) {
    tidalId = rawId.slice('tidal_album_'.length);
  } else if (rawId.startsWith('tidal_pl_')) {
    tidalId = rawId.slice('tidal_pl_'.length);
  } else if (rawId.startsWith('tidal_')) {
    tidalId = rawId.replace(/^tidal_/, '');
  }

  // --- SMART RESOLUTION FALLBACK FOR EXPLORE PAGE ---
  // 1. If it's a Tidal playlist UUID, load it from monochrome's public API
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
  if (isUuid) {
    try {
      const res = await fetch(`https://hot.monochrome.tf/playlist/?id=${rawId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0',
          'Accept': 'application/json',
        }
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        const tracks = items.map((row: any) => {
          const item = row.item || row;
          return {
            id: `tidal_${item.id}`,
            title: item.title || '',
            artist: item.artist?.name || item.artists?.map((a: any) => a.name).join(', ') || item.artist || '',
            album: item.album?.title || '',
            albumCover: item.album?.cover 
              ? `/api/cover?id=${item.album.cover}&size=1920` 
              : '',
            duration: item.duration || 0,
            streamURL: undefined,
            source: 'tidal' as const,
            explicit: item.explicit === true,
          };
        });
        return NextResponse.json({ tracks, provider: 'tidal' });
      }
    } catch (e) {
      console.error('Failed to resolve monochrome playlist:', e);
    }
  }

  // 2. If it's a Tidal album ID (pure number), resolve it via Tidal if configured or fallback to iTunes
  const isNumericAlbum = /^\d+$/.test(rawId) || rawId.includes('album');
  if (isNumericAlbum) {
    try {
      const tracks = await tidalAlbumTracks(tidalId, market);
      if (tracks && tracks.length > 0) {
        return NextResponse.json({ tracks, provider: 'tidal' });
      }
    } catch (e) {
      console.error('Tidal album lookup failed, trying iTunes fallback:', e);
    }

    if (title && artist) {
      try {
        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&entity=album&limit=5&country=${country}`;
        const sRes = await fetch(searchUrl, {
          headers: { 'User-Agent': ITUNES_UA, 'Accept': 'application/json' }
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          const results = sData.results || [];
          // Find best matching album
          const bestAlbum = results.find((r: any) => 
            r.collectionName?.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(r.collectionName?.toLowerCase())
          ) || results[0];
          
          if (bestAlbum && bestAlbum.collectionId) {
            const { tracks, error } = await appleAlbumTracks(String(bestAlbum.collectionId), country);
            if (!error && tracks && tracks.length > 0) {
              return NextResponse.json({ tracks, provider: 'apple' });
            }
          }
        }
      } catch (e) {
        console.error('Failed to resolve Tidal album via iTunes search fallback:', e);
      }
    }
  }

  try {
    if (provider === 'tidal') {
      const isAlbum = rawId.startsWith('tidal_album_') || rawId.includes('album');
      const tracks = isAlbum 
        ? await tidalAlbumTracks(tidalId, market)
        : await tidalPlaylistTracks(tidalId, market);
      
      // Fallback for albums if credentials failed
      if (tracks.length === 0 && isAlbum && title && artist) {
        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&entity=album&limit=5&country=${country}`;
        const sRes = await fetch(searchUrl, {
          headers: { 'User-Agent': ITUNES_UA, 'Accept': 'application/json' }
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          const results = sData.results || [];
          const bestAlbum = results.find((r: any) => 
            r.collectionName?.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(r.collectionName?.toLowerCase())
          ) || results[0];
          if (bestAlbum && bestAlbum.collectionId) {
            const { tracks: fallbackTracks, error } = await appleAlbumTracks(String(bestAlbum.collectionId), country);
            if (!error && fallbackTracks && fallbackTracks.length > 0) {
              return NextResponse.json({ tracks: fallbackTracks, provider: 'apple' });
            }
          }
        }
      }

      return NextResponse.json({ tracks, provider: 'tidal' });
    }

    if (provider === 'spotify') {
      const isAlbum = typeParam === 'album' || rawId.startsWith('spotify_album_') || rawId.includes('album');
      const { tracks, error, detail } = isAlbum
        ? await spotifyAlbumTracks(spotifyPlaylistId, market)
        : await spotifyPlaylistTracks(spotifyPlaylistId, market);
      if (error) {
        if (isAlbum && title && artist) {
          const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&entity=album&limit=5&country=${country}`;
          const sRes = await fetch(searchUrl, { headers: { 'User-Agent': ITUNES_UA } });
          if (sRes.ok) {
            const sData = await sRes.json();
            const best = sData.results?.[0];
            if (best && best.collectionId) {
              const { tracks: fallbackTracks, error: err } = await appleAlbumTracks(String(best.collectionId), country);
              if (!err) return NextResponse.json({ tracks: fallbackTracks, provider: 'apple' });
            }
          }
        }
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
