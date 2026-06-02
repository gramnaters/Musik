import { NextRequest, NextResponse } from 'next/server';
import { getSimilarArtists } from '@/lib/monochrome';
import { getAppleSimilarArtists } from '@/lib/apple-music-provider';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim();
  const provider = (req.nextUrl.searchParams.get('provider') || '').toLowerCase();
  const country = (req.nextUrl.searchParams.get('country') || 'us').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing artist id' }, { status: 400 });
  }

  if (provider === 'apple') {
    try {
      const artists = await getAppleSimilarArtists(id, country);
      return NextResponse.json({ artists: artists || [], provider: 'apple' });
    } catch (error) {
      console.error('Apple Music similar artists error:', error);
      return NextResponse.json({ error: 'Failed to fetch Apple Music similar artists' }, { status: 500 });
    }
  }

  try {
    const artists = await getSimilarArtists(id);
    const list = Array.isArray(artists) ? artists : (artists?.artists || []);
    return NextResponse.json({ artists: list });
  } catch (error) {
    console.error('Failed to fetch similar artists:', error);
    return NextResponse.json({ error: 'Failed to fetch similar artists' }, { status: 500 });
  }
}
