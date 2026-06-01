import { NextRequest, NextResponse } from 'next/server';
import { getAlbumAnimatedArtwork, getArtistAnimatedArtwork, resolveAppleAlbumByIsrc } from '@/lib/apple-music';

export async function GET(req: NextRequest) {
  let albumId = req.nextUrl.searchParams.get('albumId');
  const artistId = req.nextUrl.searchParams.get('artistId');
  const isrc = req.nextUrl.searchParams.get('isrc');
  const country = req.nextUrl.searchParams.get('country') || 'us';

  if (isrc && !albumId) {
    albumId = await resolveAppleAlbumByIsrc(isrc, country);
  }

  if (!albumId && !artistId) {
    return NextResponse.json({ error: 'Provide albumId, artistId, or isrc' }, { status: 400 });
  }

  try {
    let result;
    if (albumId) {
      result = await getAlbumAnimatedArtwork(albumId, country);
    } else {
      result = await getArtistAnimatedArtwork(artistId!, country);
    }

    if (!result) {
      return NextResponse.json({ error: 'No animated artwork found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Animated art error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
