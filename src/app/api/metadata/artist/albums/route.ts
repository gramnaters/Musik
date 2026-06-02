import { NextRequest, NextResponse } from 'next/server';
import { getArtistAlbums } from '@/lib/monochrome';
import { getAppleArtistAlbums } from '@/lib/apple-music-provider';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim();
  const provider = (req.nextUrl.searchParams.get('provider') || '').toLowerCase();
  const country = (req.nextUrl.searchParams.get('country') || 'us').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing artist id' }, { status: 400 });
  }

  if (provider === 'apple') {
    try {
      const { albums, eps } = await getAppleArtistAlbums(id, country);
      return NextResponse.json({ albums: albums || [], eps: eps || [], provider: 'apple' });
    } catch (error) {
      console.error('Apple Music artist albums error:', error);
      return NextResponse.json({ error: 'Failed to fetch Apple Music artist albums' }, { status: 500 });
    }
  }

  try {
    const { albums, eps } = await getArtistAlbums(id);
    return NextResponse.json({ albums: albums || [], eps: eps || [] });
  } catch (error) {
    console.error('Failed to fetch artist albums:', error);
    return NextResponse.json({ error: 'Failed to fetch artist albums' }, { status: 500 });
  }
}
