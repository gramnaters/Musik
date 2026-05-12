import { NextRequest, NextResponse } from 'next/server';

function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  const m =
    trimmed.match(/playlist\/([a-zA-Z0-9]+)/) ||
    trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  return m ? m[1] : /^[a-zA-Z0-9]{16,}$/.test(trimmed) ? trimmed : null;
}

async function getSpotifyToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    const id = extractPlaylistId(body.url || '');
    if (!id) {
      return NextResponse.json({ error: 'invalid_playlist_url' }, { status: 400 });
    }
    const token = await getSpotifyToken();
    if (!token) {
      return NextResponse.json(
        { error: 'missing_spotify_credentials', hint: 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env' },
        { status: 501 }
      );
    }

    const tracks: {
      id: string;
      title: string;
      artist: string;
      album: string;
      albumCover?: string;
      duration: number;
      streamURL?: string;
    }[] = [];

    let next: string | null = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`;
    let guard = 0;
    while (next && guard < 8) {
      guard += 1;
      const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const t = await res.text();
        return NextResponse.json({ error: 'spotify_playlist_fetch_failed', detail: t.slice(0, 200) }, { status: res.status });
      }
      const data = (await res.json()) as {
        items?: { track: Record<string, unknown> | null }[];
        next?: string | null;
      };
      for (const row of data.items || []) {
        const tr = row.track;
        if (!tr || tr.type === 'episode') continue;
        const album = tr.album as Record<string, unknown> | undefined;
        const images = (album?.images as { url?: string }[]) || [];
        const artists = (tr.artists as { name?: string }[]) || [];
        const preview = tr.preview_url as string | null | undefined;
        tracks.push({
          id: `spotify_pl_${String(tr.id)}`,
          title: String(tr.name ?? ''),
          artist: artists.map((a) => a.name).filter(Boolean).join(', '),
          album: String(album?.name ?? ''),
          albumCover: images[0]?.url || images[1]?.url,
          duration: Math.round(((tr.duration_ms as number) || 0) / 1000),
          streamURL: preview || undefined,
        });
      }
      next = data.next || null;
    }

    const metaRes = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let name = 'Imported playlist';
    if (metaRes.ok) {
      const meta = (await metaRes.json()) as { name?: string };
      if (meta.name) name = meta.name;
    }

    return NextResponse.json({ name, tracks });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'import_failed' }, { status: 500 });
  }
}
