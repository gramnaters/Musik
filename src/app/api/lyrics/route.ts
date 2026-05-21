import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const track = req.nextUrl.searchParams.get('track');
  const artist = req.nextUrl.searchParams.get('artist');
  const album = req.nextUrl.searchParams.get('album');
  const duration = req.nextUrl.searchParams.get('duration');

  if (!track || !artist) {
    return NextResponse.json({ error: 'Missing track or artist' }, { status: 400 });
  }

  try {
    // Helper: strip parentheticals like (feat...), (Remix), etc.
    const clean = (s: string) => s.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/feat\.?\s*\S*/gi, '').trim();

    // Strategy 1: exact match with all params
    const tryExact = async () => {
      const url = new URL('https://lrclib.net/api/get');
      url.searchParams.append('artist_name', artist);
      url.searchParams.append('track_name', track);
      if (album) url.searchParams.append('album_name', album);
      if (duration) url.searchParams.append('duration', duration);
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'BeatBossPlayer/1.0 (https://github.com/gramnaters/Musik)' },
      });
      if (res.ok) return res.json();
      return null;
    };

    // Strategy 2: search by "artist track"
    const trySearch = async (q: string) => {
      const url = new URL('https://lrclib.net/api/search');
      url.searchParams.append('q', q);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        return data.length > 0 ? data[0] : null;
      }
      return null;
    };

    let result = await tryExact();
    if (!result) result = await trySearch(`${artist} ${track}`);
    if (!result) result = await trySearch(`${clean(artist)} ${clean(track)}`);
    if (!result) result = await trySearch(track);

    if (!result) {
      return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
