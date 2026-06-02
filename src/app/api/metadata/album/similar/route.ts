import { NextRequest, NextResponse } from 'next/server';
import { getSimilarAlbums } from '@/lib/monochrome';
import { getAppleMoreByArtist, getAppleAppearsOn } from '@/lib/apple-music-provider';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim();
  const provider = (req.nextUrl.searchParams.get('provider') || '').toLowerCase();
  const country = (req.nextUrl.searchParams.get('country') || 'us').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing album id' }, { status: 400 });
  }

  if (provider === 'apple') {
    try {
      const [moreByArtist, appearsOn] = await Promise.all([
        getAppleMoreByArtist(id, country),
        getAppleAppearsOn(id, country),
      ]);
      const combined = [...(moreByArtist || []), ...(appearsOn || [])];
      const seen = new Set<string>();
      const unique = combined.filter((a: any) => {
        const key = a.title || a.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return NextResponse.json({ albums: unique, provider: 'apple' });
    } catch (error) {
      console.error('Apple Music similar albums error:', error);
      return NextResponse.json({ error: 'Failed to fetch Apple Music similar albums' }, { status: 500 });
    }
  }

  try {
    const albums = await getSimilarAlbums(id);
    const list = Array.isArray(albums) ? albums : (albums?.albums || []);
    return NextResponse.json({ albums: list });
  } catch (error) {
    console.error('Failed to fetch similar albums:', error);
    return NextResponse.json({ error: 'Failed to fetch similar albums' }, { status: 500 });
  }
}
