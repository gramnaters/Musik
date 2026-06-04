import { NextRequest, NextResponse } from 'next/server';

const QOBUZ_INSTANCES = [
  'https://qdl-api.monochrome.tf',
  'https://qobuz.kennyy.com.br',
];

const MONOCHROME_API = 'https://api.monochrome.tf';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Musik/1.0';

const QUALITY_MAP: Record<string, string> = {
  'hi_res_lossless': '27', 'lossless': '6', 'aac_320': '5', 'aac_96': '5',
  'auto': '27', 'HI_RES': '27', 'LOSSLESS': '6', 'HIGH': '5', 'LOW': '5',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const action = path[0];
  const id = path[1] || '';
  const q = req.nextUrl.searchParams.get('q') || req.nextUrl.searchParams.get('query') || '';
  const quality = req.nextUrl.searchParams.get('quality') || 'LOSSLESS';
  const limit = req.nextUrl.searchParams.get('limit') || '25';

  try {
    if (action === 'search') {
      const res = await fetch(`${MONOCHROME_API}/search/?s=${encodeURIComponent(q)}&limit=${limit}`, { headers: { 'User-Agent': UA } });
      if (!res.ok) return NextResponse.json([]);
      const data = await res.json();
      const items = data?.data?.tracks || data?.tracks || [];
      return NextResponse.json(items.map((t: any) => ({
        id: `mono_${t.id}`, title: t.title || t.name || '',
        artist: t.artist?.name || t.artistName || t.artists?.[0]?.name || '',
        album: t.album?.title || t.albumName || '', duration: t.duration || 0,
        isrc: t.isrc || '',
      })));
    }

    if (action === 'stream') {
      const cleanId = id.replace(/^mono_/, '');
      try {
        const trackRes = await fetch(`${MONOCHROME_API}/track/?id=${cleanId}`, { headers: { 'User-Agent': UA } });
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          const track = trackData?.track || trackData?.data || trackData;
          const isrc = track?.isrc || track?.ISRC || '';
          if (isrc) {
            const shuffled = [...QOBUZ_INSTANCES].sort(() => Math.random() - 0.5);
            const qobuzQuality = QUALITY_MAP[quality] || '6';
            for (const instance of shuffled) {
              try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 6000);
                const searchRes = await fetch(`${instance}/api/get-music?q=${encodeURIComponent(isrc)}&offset=0`, { signal: ctrl.signal });
                clearTimeout(t);
                if (!searchRes.ok) continue;
                const searchData = await searchRes.json();
                const tracks = searchData?.data?.tracks?.items || searchData?.tracks?.items || [];
                const match = tracks.find((x: any) => x.isrc === isrc) || tracks[0];
                if (!match?.id) continue;
                const ctrl2 = new AbortController();
                const t2 = setTimeout(() => ctrl2.abort(), 6000);
                const dlRes = await fetch(`${instance}/api/download-music?track_id=${match.id}&quality=${qobuzQuality}`, { signal: ctrl2.signal });
                clearTimeout(t2);
                if (dlRes.ok) {
                  const dlData = await dlRes.json();
                  const url = dlData?.data?.url || dlData?.url;
                  if (url) return NextResponse.json({ url, streamURL: url, source: 'qobuz' });
                }
              } catch { /* next instance */ }
            }
          }
        }
      } catch { /* fallthrough */ }
      // Fallback to Monochrome stream
      const streamRes = await fetch(`${MONOCHROME_API}/stream/?id=${cleanId}&quality=${quality}`, { headers: { 'User-Agent': UA } });
      if (streamRes.ok) {
        const d = await streamRes.json();
        const url = d?.url || d?.streamURL;
        if (url) return NextResponse.json({ url, streamURL: url });
      }
      return NextResponse.json({ url: null });
    }

    if (action === 'album') {
      const cleanId = id.replace(/^mono_/, '');
      const res = await fetch(`${MONOCHROME_API}/album/?id=${cleanId}`, { headers: { 'User-Agent': UA } });
      if (!res.ok) return NextResponse.json(null);
      const data = await res.json();
      const album = data?.album || data?.data || data;
      const tracks = (data?.tracks || album?.tracks || []).map((t: any) => ({
        id: `mono_${t.id}`, title: t.title || t.name || '',
        artist: t.artist?.name || t.artistName || '',
        album: album?.title || '', duration: t.duration || 0,
        isrc: t.isrc || t.ISRC || '',
      }));
      return NextResponse.json({ album: { id: `mono_${album?.id}`, title: album?.title }, tracks });
    }

    if (action === 'home') {
      const res = await fetch('https://hot.monochrome.tf/', { headers: { 'User-Agent': UA } });
      if (!res.ok) return NextResponse.json(null);
      const data = await res.json();
      return NextResponse.json({
        tracks: (data?.top_tracks || []).map((t: any) => ({
          id: `mono_${t.id}`, title: t.title, artist: t.artist,
          album: t.album, duration: t.duration,
        })),
        albums: data?.top_albums || [],
        playlists: data?.featured_playlists || [],
      });
    }

    return NextResponse.json({ error: 'Unknown action', action }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
