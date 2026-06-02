import { NextRequest, NextResponse } from 'next/server';
import { getAlbumInfo, mapMonochromeAlbum, mapMonochromeTrack } from '@/lib/monochrome';
import { initTidal, TidalClient } from '@/lib/tidal/client';
import { getAppleAlbum } from '@/lib/apple-music-provider';

const tidalClientId = process.env.TIDAL_CLIENT_ID?.trim() || 'txNoH4kkV41MfH25';
const tidalClientSecret = process.env.TIDAL_CLIENT_SECRET?.trim() || 'dQjy0MinCEvxi1O4UmxvxWnDjt4cgHBPw8ll6nYBk98=';
try {
  initTidal(tidalClientId, tidalClientSecret);
} catch (e) {
  console.error('Tidal initialization failed:', e);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim();
  const provider = (req.nextUrl.searchParams.get('provider') || '').toLowerCase();
  const country = (req.nextUrl.searchParams.get('country') || 'us').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing album id' }, { status: 400 });
  }

  // Apple Music provider
  if (provider === 'apple') {
    try {
      const { album, tracks } = await getAppleAlbum(id, country);
      if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });
      return NextResponse.json({ album, tracks, provider: 'apple' });
    } catch (e) {
      console.error('Apple Music album error:', e);
      return NextResponse.json({ error: 'Failed to fetch Apple Music album' }, { status: 500 });
    }
  }

  try {
    const { album: rawAlbum, tracks: rawTracks } = await getAlbumInfo(id);
    const album = rawAlbum ? mapMonochromeAlbum(rawAlbum) : null;
    const tracks = (rawTracks || []).map(mapMonochromeTrack).filter((t: any) => t.title);
    return album ? NextResponse.json({ album, tracks }) : NextResponse.json({ error: 'Album not found' }, { status: 404 });
  } catch (e) {
    console.warn('Monochrome album detail failed, trying Tidal fallback:', e);
    try {
      const client = TidalClient.getInstance();
      const numId = parseInt(id, 10);
      if (isNaN(numId)) {
        return NextResponse.json({ error: 'Failed to fetch album detail' }, { status: 500 });
      }
      const [albumData, tracksData] = await Promise.all([
        client.getAlbum(numId),
        client.getAlbumTracks(numId),
      ]);
      const album = {
        id: `tidal_album_${albumData.id}`,
        title: String(albumData.title ?? ''),
        artist: Array.isArray(albumData.artists) ? albumData.artists.map((a: any) => a.name).join(', ') : (albumData.artist?.name ?? ''),
        artistId: albumData.artist?.id || '',
        cover: albumData.cover ? `/api/cover?id=${albumData.cover}&size=1920` : '',
        trackCount: albumData.numberOfTracks,
        numberOfTracks: albumData.numberOfTracks,
        year: albumData.releaseDate?.slice(0, 4),
        releaseDate: albumData.releaseDate || '',
        duration: albumData.duration || 0,
        copyright: albumData.copyright || '',
      };
      const tracks = (tracksData.items || []).map((item: any) => ({
        id: `tidal_${item.id}`,
        title: String(item.title ?? ''),
        artist: Array.isArray(item.artists) ? item.artists.map((a: any) => a.name).join(', ') : (item.artist?.name ?? ''),
        album: String(albumData.title ?? ''),
        albumCover: albumData.cover ? `/api/cover?id=${albumData.cover}&size=1920` : '',
        duration: typeof item.duration === 'number' ? item.duration : 0,
        explicit: Boolean(item.explicit),
        quality: item.audioQuality || '',
      }));
      return NextResponse.json({ album, tracks, fallback: 'tidal' });
    } catch (fallbackErr) {
      console.error('Tidal fallback also failed:', fallbackErr);
      return NextResponse.json({ error: 'Failed to fetch album detail' }, { status: 500 });
    }
  }
}
