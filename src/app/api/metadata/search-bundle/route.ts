import { NextRequest, NextResponse } from 'next/server';

import { initTidal, TidalClient } from '@/lib/tidal/client';
import { searchTracks, searchArtists as mcSearchArtists, searchAlbums as mcSearchAlbums, searchPlaylists as mcSearchPlaylists, mapMonochromeTrack, mapMonochromeAlbum, mapMonochromeArtist, mapMonochromePlaylist } from '@/lib/monochrome';
import { searchAppleProxy, appleArtworkUrl, mapAppleTrack, mapAppleAlbum, mapApplePlaylistFromAlbum } from '@/lib/apple-proxy';
import { searchQobuzTracks, searchQobuzAlbums, searchQobuzArtists, mapQobuzTrack, mapQobuzAlbum, mapQobuzArtist, mapQobuzPlaylistFromAlbum } from '@/lib/qobuz';

type Provider = 'spotify' | 'apple' | 'monochrome' | 'qobuz' | 'tidal';

let spotifyTokenCache: { token: string; expiresAtMs: number } | null = null;

// Initialize Tidal client for Monochrome fallback
const tidalClientId = process.env.TIDAL_CLIENT_ID?.trim() || 'txNoH4kkV41MfH25';
const tidalClientSecret = process.env.TIDAL_CLIENT_SECRET?.trim() || 'dQjy0MinCEvxi1O4UmxvxWnDjt4cgHBPw8ll6nYBk98=';
try {
  initTidal(tidalClientId, tidalClientSecret);
} catch (e) {
  console.error('Tidal initialization failed:', e);
}

type TokenResult =
  | { ok: true; token: string }
  | { ok: false; error: 'missing_spotify_credentials' | 'spotify_token_http'; detail?: string };

async function getSpotifyTokenCached(): Promise<TokenResult> {
  const now = Date.now();
  if (spotifyTokenCache && now < spotifyTokenCache.expiresAtMs - 60_000) {
    return { ok: true, token: spotifyTokenCache.token };
  }
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
    const json = JSON.parse(raw) as { access_token?: string; expires_in?: number };
    if (!json.access_token) {
      return { ok: false, error: 'spotify_token_http', detail: 'No access_token in token response' };
    }
    const ttlSec = typeof json.expires_in === 'number' ? json.expires_in : 3600;
    spotifyTokenCache = {
      token: json.access_token,
      expiresAtMs: now + ttlSec * 1000,
    };
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

function mapSpotifyAlbum(item: Record<string, unknown>) {
  const images = (item.images as { url?: string; width?: number }[]) || [];
  const bySize = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const artists = (item.artists as { name?: string }[]) || [];
  const rd = typeof item.release_date === 'string' ? item.release_date : '';
  return {
    id: `spotify_album_${String(item.id)}`,
    title: String(item.name ?? ''),
    artist: artists.map((a) => a.name).filter(Boolean).join(', ') || 'Various',
    cover: bySize[0]?.url || images[0]?.url || '',
    year: rd.slice(0, 4) || undefined,
    trackCount: typeof item.total_tracks === 'number' ? item.total_tracks : undefined,
    source: 'spotify' as const,
    explicit: item.explicit === true,
  };
}

function mapSpotifyShow(item: Record<string, unknown>) {
  const images = (item.images as { url?: string; width?: number }[]) || [];
  const bySize = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const ext = item.external_urls as { spotify?: string } | undefined;
  return {
    id: `spotify_show_${String(item.id)}`,
    title: String(item.name ?? ''),
    author: String(item.publisher ?? ''),
    description: typeof item.description === 'string' ? item.description.slice(0, 280) : '',
    cover: bySize[0]?.url || images[0]?.url || '',
    episodeCount: typeof item.total_episodes === 'number' ? item.total_episodes : undefined,
    externalUrl: ext?.spotify,
    source: 'spotify' as const,
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const provider = (req.nextUrl.searchParams.get('provider') || 'apple') as Provider;
  const limitRaw = req.nextUrl.searchParams.get('limit');
  const parsed = Number.parseInt(limitRaw || '25', 10);
  const per = Number.isFinite(parsed) ? Math.min(50, Math.max(1, parsed)) : 25;
  const spotifyCap = Math.min(10, per);
  const appleCap = Math.min(200, per);
  const countryParam = req.nextUrl.searchParams.get('country')?.trim() || 'US';
  const appleCountry = /^[a-z]{2}$/i.test(countryParam) ? countryParam.toUpperCase() : 'US';
  const marketParam = req.nextUrl.searchParams.get('market')?.trim() || '';
  const market = /^[a-z]{2}$/i.test(marketParam) ? marketParam.toUpperCase() : appleCountry;

  if (!q) {
    return NextResponse.json({
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
      podcasts: [],
      error: 'empty_query',
    });
  }

  try {
    if (provider === 'monochrome' || provider === 'tidal') {
      let tracks: any[] = [];
      let albums: any[] = [];
      let artists: any[] = [];
      let playlists: any[] = [];

      try {
        const tracksData = await searchTracks(q, per);
        const rawTracks = Array.isArray(tracksData) ? tracksData : (tracksData.tracks || []);
        tracks = rawTracks.map(mapMonochromeTrack).filter((t: any) => t.title);

        // Extract unique albums, artists from track results by ID
        const artistMap = new Map<string, any>();
        const albumMap = new Map<string, any>();
        const playlistMap = new Map<string, any>();

        rawTracks.forEach((t: any) => {
          const artistName = t.artist?.name || '';
          const artistId = String(t.artist?.id || '');
          if (artistName && artistId && !artistMap.has(artistId)) {
            artistMap.set(artistId, mapMonochromeArtist(t.artist));
          }
          
          const album = t.album;
          const albumId = String(album?.id || '');
          if (album?.title && albumId && !albumMap.has(albumId)) {
            const mapped = mapMonochromeAlbum(album);
            albumMap.set(albumId, mapped);
            playlistMap.set(albumId, {
              id: mapped.id, name: album.title,
              description: `${artistName} • Album`,
              cover: mapped.cover, trackCount: mapped.trackCount,
            });
          }
        });

        albums = [...albumMap.values()];
        artists = [...artistMap.values()];
        playlists = [...playlistMap.values()];
      } catch (e) {
        console.warn('Monochrome search-bundle failed:', e);
      }

      return NextResponse.json({ tracks, albums, artists, playlists, podcasts: [], provider: 'monochrome' });
    }

    if (provider === 'qobuz') {
      const qobuzCap = Math.min(per, 50);
      const [tracksData, albumsData, artistsData] = await Promise.all([
        searchQobuzTracks(q, qobuzCap),
        searchQobuzAlbums(q, qobuzCap),
        searchQobuzArtists(q, qobuzCap),
      ]);
      const tracks = tracksData.map(mapQobuzTrack).filter(t => t.title);
      const albums = albumsData.map(mapQobuzAlbum).filter(a => a.title);
      const artists = artistsData.map(mapQobuzArtist).filter(a => a.name);
      const playlists = albums.map(mapQobuzPlaylistFromAlbum);
      const podcasts: any[] = [];
      return NextResponse.json({ tracks, albums, artists, playlists, podcasts, provider: 'qobuz' });
    }

    if (provider === 'apple') {
      const [proxyResult, iTunesArtists] = await Promise.all([
        searchAppleProxy(q).catch(() => null),
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicArtist&limit=${appleCap}`, { next: { revalidate: 0 } })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
      ]);

      const tracks: any[] = [];
      const albums: any[] = [];
      const playlists: any[] = [];

      if (proxyResult) {
        tracks.push(...(proxyResult.results.songs?.data || []).map(d => mapAppleTrack(d.attributes, d.id)).filter(t => t.title));
        albums.push(...(proxyResult.results.albums?.data || []).map(d => mapAppleAlbum(d.attributes, d.id)).filter(a => a.title));
      }

      // Merge AMP proxy artists (with artwork) + iTunes artists (more results)
      const artistMap = new Map<string, { id: string; name: string; image: string }>();
      if (proxyResult?.results.artists?.data) {
        for (const d of proxyResult.results.artists.data) {
          const name = String(d.attributes?.name ?? '').toLowerCase();
          if (!name) continue;
          artistMap.set(name, {
            id: `apple_${d.id}`,
            name: String(d.attributes?.name ?? ''),
            image: appleArtworkUrl(d.attributes || {}),
          });
        }
      }
      if (iTunesArtists?.results) {
        for (const item of iTunesArtists.results as any[]) {
          const name = String(item.artistName ?? '').toLowerCase();
          if (!name || artistMap.has(name)) continue;
          artistMap.set(name, {
            id: `apple_it_${item.artistId}`,
            name: String(item.artistName ?? ''),
            image: item.artworkUrl100 ? (item.artworkUrl100 as string).replace('100x100bb', '600x600bb') : '',
          });
        }
      }
      const artists = [...artistMap.values()].filter(a => a.name);

      // Real Apple Music playlists via iTunes (entity=playlist not supported),
      // so synthesize from albums like before
      playlists.push(...albums.map(mapApplePlaylistFromAlbum));
      const podcasts: any[] = [];

      return NextResponse.json({
        tracks,
        albums,
        artists,
        playlists,
        podcasts,
        provider: 'apple',
        country: appleCountry,
      });
    }

    const tokenRes = await getSpotifyTokenCached();
    if (!tokenRes.ok) {
      return NextResponse.json({
        tracks: [],
        albums: [],
        artists: [],
        playlists: [],
        podcasts: [],
        provider: 'spotify',
        error: tokenRes.error,
        detail: tokenRes.detail,
      });
    }
    const token = tokenRes.token;
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    const encQ = encodeURIComponent(q);
    const mkt = encodeURIComponent(market);

    // Single combined call — Spotify supports comma-separated types
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encQ}&type=track,album,artist,playlist,show&limit=${spotifyCap}&market=${mkt}`,
      { headers }
    );

    const tracks: ReturnType<typeof mapSpotifyTrack>[] = [];
    const albums: ReturnType<typeof mapSpotifyAlbum>[] = [];
    const artists: { id: string; name: string; image?: string }[] = [];
    const playlists: {
      id: string;
      name: string;
      description?: string;
      cover?: string;
      trackCount?: number;
      source: 'spotify';
    }[] = [];
    const podcasts: ReturnType<typeof mapSpotifyShow>[] = [];

    if (searchRes.ok) {
      const data = await searchRes.json() as any;
      for (const it of data.tracks?.items || []) {
        if (it) tracks.push(mapSpotifyTrack(it));
      }
      for (const it of data.albums?.items || []) {
        if (it) albums.push(mapSpotifyAlbum(it));
      }
      for (const item of data.artists?.items || []) {
        if (!item) continue;
        const images = (item.images as { url?: string; width?: number }[]) || [];
        const bySize = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
        artists.push({
          id: `spotify_${String(item.id)}`,
          name: String(item.name ?? ''),
          image: bySize[0]?.url || images[0]?.url || '',
        });
      }
      for (const item of data.playlists?.items || []) {
        if (!item) continue;
        const id = item.id;
        if (typeof id !== 'string' && typeof id !== 'number') continue;
        const images = (item.images as { url?: string }[]) || [];
        const owner = item.owner as { display_name?: string } | undefined;
        const tracksMeta = item.tracks as { total?: number } | undefined;
        playlists.push({
          id: `spotify_pl_${String(id)}`,
          name: String(item.name ?? ''),
          description: owner?.display_name ? `By ${owner.display_name}` : 'Spotify playlist',
          cover: images[0]?.url || '',
          trackCount: typeof tracksMeta?.total === 'number' ? tracksMeta.total : undefined,
          source: 'spotify',
        });
      }
      for (const it of data.shows?.items || []) {
        if (it) podcasts.push(mapSpotifyShow(it));
      }
    }

    return NextResponse.json({
      tracks,
      albums,
      artists,
      playlists,
      podcasts,
      provider: 'spotify',
      market,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search_bundle_failed';
    return NextResponse.json(
      { tracks: [], albums: [], artists: [], playlists: [], podcasts: [], error: message },
      { status: 500 }
    );
  }
}
