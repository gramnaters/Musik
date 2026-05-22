import { NextRequest, NextResponse } from 'next/server';

import { initTidal, TidalClient } from '@/lib/tidal/client';
import { searchTracks, searchArtists as mcSearchArtists, searchAlbums as mcSearchAlbums, searchPlaylists as mcSearchPlaylists, mapMonochromeTrack, mapMonochromeAlbum, mapMonochromeArtist, mapMonochromePlaylist } from '@/lib/monochrome';

type Provider = 'spotify' | 'apple' | 'tidal' | 'monochrome';

let spotifyTokenCache: { token: string; expiresAtMs: number } | null = null;

// Initialize Tidal client on the server
const tidalClientId = process.env.TIDAL_CLIENT_ID?.trim() || 'txNoH4kkV41MfH25';
const tidalClientSecret = process.env.TIDAL_CLIENT_SECRET?.trim() || 'dQjy0MinCEvxi1O4UmxvxWnDjt4cgHBPw8ll6nYBk98=';
try {
  initTidal(tidalClientId, tidalClientSecret);
} catch (e) {
  console.error('Tidal initialization failed:', e);
}

async function searchTidal(q: string, limit: number) {
  try {
    const client = TidalClient.getInstance();
    const results = await client.search(q, limit);
    return results;
  } catch (e) {
    console.error('Tidal search failed:', e);
    return null;
  }
}

function mapTidalTrack(item: any) {
  return {
    id: `tidal_${item.id}`,
    title: String(item.title ?? ''),
    artist: Array.isArray(item.artists) ? item.artists.map((a: any) => a.name).join(', ') : (item.artist?.name ?? ''),
    album: String(item.album?.title ?? ''),
    albumCover: item.album?.cover ? `/api/cover?id=${item.album.cover}&size=1920` : '',
    duration: typeof item.duration === 'number' ? item.duration : 0,
    source: 'tidal' as const,
    explicit: Boolean(item.explicit),
    audioQuality: item.audioQuality || 'LOSSLESS',
  };
}

function mapTidalAlbum(item: any) {
  return {
    id: `tidal_album_${item.id}`,
    title: String(item.title ?? ''),
    artist: Array.isArray(item.artists) ? item.artists.map((a: any) => a.name).join(', ') : (item.artist?.name ?? ''),
    cover: item.cover ? `/api/cover?id=${item.cover}&size=1920` : '',
    year: item.releaseDate?.slice(0, 4),
    trackCount: item.numberOfTracks,
    source: 'tidal' as const,
    explicit: Boolean(item.explicit),
  };
}

function mapTidalArtist(item: any) {
  return {
    id: `tidal_${item.id}`,
    name: String(item.name ?? ''),
    image: item.picture ? `/api/cover?id=${item.picture}&size=1920` : '',
  };
}

function mapTidalPlaylist(item: any) {
  return {
    id: `tidal_pl_${item.id}`,
    name: String(item.title ?? ''),
    description: 'Tidal Playlist',
    cover: item.cover ? `/api/cover?id=${item.cover}&size=1920` : '',
    source: 'tidal' as const,
  };
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

function mapAppleTrack(item: Record<string, unknown>) {
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

function mapAppleAlbum(item: Record<string, unknown>) {
  const cid = item.collectionId;
  if (cid == null) return null;
  return {
    id: `apple_album_${String(cid)}`,
    title: String(item.collectionName ?? ''),
    artist: String(item.artistName ?? ''),
    cover: appleArtworkUrl(item),
    year:
      typeof item.releaseDate === 'string'
        ? String(item.releaseDate).slice(0, 4)
        : typeof item.releaseDate === 'number'
          ? String(item.releaseDate).slice(0, 4)
          : undefined,
    trackCount: typeof item.trackCount === 'number' ? item.trackCount : undefined,
    source: 'apple' as const,
    explicit: item.contentAdvisoryRating === 'Explicit',
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

function mapApplePodcast(item: Record<string, unknown>) {
  const feed = typeof item.feedUrl === 'string' ? item.feedUrl : undefined;
  const ext = typeof item.collectionViewUrl === 'string' ? item.collectionViewUrl : feed;
  return {
    id: `apple_podcast_${String(item.collectionId ?? item.trackId ?? '')}`,
    title: String(item.collectionName ?? item.trackName ?? ''),
    author: String(item.artistName ?? ''),
    description: typeof item.description === 'string' ? item.description.slice(0, 280) : '',
    cover: appleArtworkUrl(item),
    episodeCount: typeof item.trackCount === 'number' ? item.trackCount : undefined,
    externalUrl: ext,
    source: 'apple' as const,
  };
}

async function searchApple(q: string, entity: string, limit: number, country: string) {
  try {
    const cc = country.length === 2 ? country.toUpperCase() : 'US';
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=${entity}&limit=${limit}&country=${encodeURIComponent(cc)}`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { Accept: 'application/json', 'User-Agent': 'MusikCatalog/1.0' },
    });
    if (!res.ok) {
      console.warn(`Apple search HTTP ${res.status} for ${entity}`);
      return [];
    }
    const data = (await res.json()) as { results?: Record<string, unknown>[] };
    return data.results || [];
  } catch (e) {
    console.error(`Apple search failed for ${entity}:`, e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const provider = (req.nextUrl.searchParams.get('provider') || 'apple') as Provider;
  const limitRaw = req.nextUrl.searchParams.get('limit');
  const parsed = Number.parseInt(limitRaw || '25', 10);
  const per = Number.isFinite(parsed) ? Math.min(50, Math.max(1, parsed)) : 25;
  const spotifyCap = Math.min(50, per);
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
    if (provider === 'tidal') {
      const tidalData = await searchTidal(q, per);
      if (!tidalData) {
        return NextResponse.json({ tracks: [], albums: [], artists: [], playlists: [], podcasts: [], error: 'tidal_failed' });
      }

      return NextResponse.json({
        tracks: (tidalData.tracks?.items ?? []).map(mapTidalTrack),
        albums: (tidalData.albums?.items ?? []).map(mapTidalAlbum),
        artists: (tidalData.artists?.items ?? []).map(mapTidalArtist),
        playlists: (tidalData.playlists?.items ?? []).map(mapTidalPlaylist),
        podcasts: [],
        provider: 'tidal',
        country: 'US',
      });
    }

    if (provider === 'monochrome') {
      const [tracksData, albumsData, artistsData, playlistsData] = await Promise.all([
        searchTracks(q, per),
        mcSearchAlbums(q),
        mcSearchArtists(q),
        mcSearchPlaylists(q),
      ]);

      const tracks = (tracksData.tracks || []).map(mapMonochromeTrack).filter((t: any) => t.title);
      const albums = (albumsData.albums || []).map(mapMonochromeAlbum).filter((a: any) => a.title);
      const artists = (artistsData.artists || []).map(mapMonochromeArtist).filter((a: any) => a.name);
      const playlists = (playlistsData.playlists || []).map(mapMonochromePlaylist).filter((p: any) => p.name);

      return NextResponse.json({ tracks, albums, artists, playlists, podcasts: [], provider: 'monochrome' });
    }

    if (provider === 'apple') {
      const [songRows, albumRows, artistRows, podcastRows] = await Promise.all([
        searchApple(q, 'song', appleCap, appleCountry),
        searchApple(q, 'album', Math.min(appleCap, 25), appleCountry),
        searchApple(q, 'musicArtist', Math.min(appleCap, 25), appleCountry),
        searchApple(q, 'podcast', Math.min(appleCap, 25), appleCountry),
      ]);

      const tracks = songRows.filter((r) => r.wrapperType === 'track' || r.kind === 'song').map(mapAppleTrack).filter((t) => t.title);

      const albums = albumRows
        .filter((r) => r.wrapperType === 'collection')
        .map(mapAppleAlbum)
        .filter((a): a is NonNullable<typeof a> => a != null && !!a.title);

      const artists = artistRows
        .filter((r) => r.wrapperType === 'artist')
        .map((item) => ({
          id: `apple_${String(item.artistId ?? item.amgArtistId ?? '')}`,
          name: String(item.artistName ?? ''),
          image: appleArtworkUrl(item),
        }))
        .filter((a) => a.name);

      const playlists = albums.map((a) => ({
        id: a.id,
        name: a.title,
        description: `${a.artist} • Album`,
        cover: a.cover,
        trackCount: a.trackCount,
        source: 'apple' as const,
      }));

      const podcasts = podcastRows
        .filter((r) => r.kind === 'podcast' && r.collectionId != null)
        .map(mapApplePodcast)
        .filter((p) => p.title && p.id);

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

    const [trRes, alRes, arRes, plRes, shRes] = await Promise.all([
      fetch(
        `https://api.spotify.com/v1/search?q=${encQ}&type=track&limit=${spotifyCap}&market=${mkt}`,
        { headers }
      ),
      fetch(
        `https://api.spotify.com/v1/search?q=${encQ}&type=album&limit=${Math.min(spotifyCap, 20)}&market=${mkt}`,
        { headers }
      ),
      fetch(
        `https://api.spotify.com/v1/search?q=${encQ}&type=artist&limit=${Math.min(spotifyCap, 20)}&market=${mkt}`,
        { headers }
      ),
      fetch(
        `https://api.spotify.com/v1/search?q=${encQ}&type=playlist&limit=${Math.min(spotifyCap, 20)}&market=${mkt}`,
        { headers }
      ),
      fetch(
        `https://api.spotify.com/v1/search?q=${encQ}&type=show&limit=${Math.min(spotifyCap, 20)}&market=${mkt}`,
        { headers }
      ),
    ]);

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

    if (trRes.ok) {
      const data = (await trRes.json()) as { tracks?: { items?: Record<string, unknown>[] } };
      for (const it of data.tracks?.items || []) {
        tracks.push(mapSpotifyTrack(it));
      }
    }
    if (alRes.ok) {
      const data = (await alRes.json()) as { albums?: { items?: Record<string, unknown>[] } };
      for (const it of data.albums?.items || []) {
        albums.push(mapSpotifyAlbum(it));
      }
    }
    if (arRes.ok) {
      const data = (await arRes.json()) as { artists?: { items?: Record<string, unknown>[] } };
      for (const item of data.artists?.items || []) {
        const images = (item.images as { url?: string; width?: number }[]) || [];
        const bySize = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
        artists.push({
          id: `spotify_${String(item.id)}`,
          name: String(item.name ?? ''),
          image: bySize[0]?.url || images[0]?.url || '',
        });
      }
    }
    if (plRes.ok) {
      const data = (await plRes.json()) as { playlists?: { items?: Record<string, unknown>[] } };
      for (const item of data.playlists?.items || []) {
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
    }
    if (shRes.ok) {
      const data = (await shRes.json()) as { shows?: { items?: Record<string, unknown>[] } };
      for (const it of data.shows?.items || []) {
        podcasts.push(mapSpotifyShow(it));
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
