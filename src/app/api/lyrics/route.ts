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
    const url = new URL('https://lrclib.net/api/get');
    url.searchParams.append('artist_name', artist);
    url.searchParams.append('track_name', track);
    if (album) url.searchParams.append('album_name', album);
    if (duration) url.searchParams.append('duration', duration);

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'BeatBossPlayer/1.0 (https://github.com/gramnaters/Musik)' },
    });

    if (!res.ok) {
      if (res.status === 404) {
        // Try search as fallback
        const searchUrl = new URL('https://lrclib.net/api/search');
        searchUrl.searchParams.append('q', `${artist} ${track}`);
        const sRes = await fetch(searchUrl.toString());
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.length > 0) {
            return NextResponse.json(sData[0]);
          }
        }
        return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
      }
      throw new Error(`LRCLIB HTTP ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
