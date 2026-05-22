import { NextRequest, NextResponse } from 'next/server';

function placeholderRedirect(id: string, size: string) {
  const seed = String(id).replace(/[^a-f0-9]/g, '').slice(0, 8) || 'cover';
  return NextResponse.redirect(new URL(`https://picsum.photos/seed/${seed}/${size}/${size}`), 302);
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const size = request.nextUrl.searchParams.get('size') || '640';

  if (!id) return placeholderRedirect('cover', size);

  const slug = String(id).replace(/-/g, '/');
  const tidalUrl = `https://resources.tidal.com/images/${slug}/${size}x${size}.jpg`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(tidalUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://tidal.com/',
        Origin: 'https://tidal.com',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const contentType = response.headers.get('Content-Type') || 'image/jpeg';
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return placeholderRedirect(id, size);
  } catch {
    return placeholderRedirect(id, size);
  }
}
