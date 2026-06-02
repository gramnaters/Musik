import { NextRequest, NextResponse } from 'next/server';

async function proxyFetch(request: NextRequest, method: string, body?: BodyInit) {
  const targetUrl = request.nextUrl.searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL
  let origin = '';
  try {
    origin = new URL(targetUrl).origin;
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0',
      Accept: 'image/*,audio/*,application/json,text/plain,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: `${origin}/`,
    };

    // Forward custom headers that addon modules rely on (e.g. X-Cache-Token for Jimmy backend auth)
    const forwarded = ['x-cache-token', 'content-type', 'authorization', 'x-auth-token'];
    for (const h of forwarded) {
      const val = request.headers.get(h);
      if (val) upstreamHeaders[h] = val;
    }

    const response = await fetch(targetUrl, {
      method,
      body,
      signal: controller.signal,
      redirect: 'follow',
      headers: upstreamHeaders,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to get error body for debugging
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        // ignore
      }
      console.error(
        `[Addon Proxy] Upstream error ${response.status} for ${targetUrl}: ${errorBody.slice(0, 200)}`
      );
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const lowerType = contentType.toLowerCase();
    const isEightspinePackage = /\.8spine($|[?#])/i.test(targetUrl);

    // Images must stay binary — never use response.text() (corrupts JPEG/PNG/WebP and breaks UI thumbnails).
    if (lowerType.startsWith('image/')) {
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Stream real audio / binary media (not generic octet-stream — CDNs often use that for .8spine JS)
    if (lowerType.startsWith('audio/')) {
      return new Response(response.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Accept-Ranges': 'bytes',
        },
      });
    }

    // Binary streams (e.g. MP3 as application/octet-stream). Skip when URL is a .8spine module file.
    if (lowerType.includes('octet-stream') && !/\.8spine($|[?#])/i.test(targetUrl)) {
      return new Response(response.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Accept-Ranges': 'bytes',
        },
      });
    }

    // 8SPINE packages are JS source: GitHub/jsDelivr often serve them as text/plain — never JSON-parse
    if (
      isEightspinePackage ||
      lowerType.includes('text/plain') ||
      lowerType.includes('javascript') ||
      lowerType.includes('ecmascript')
    ) {
      const text = await response.text();
      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=600',
        },
      });
    }

    const bodyText = await response.text();
    const looksJson =
      lowerType.includes('json') ||
      /\.json($|[?#])/i.test(targetUrl) ||
      /\/(search|stream|album|artist|playlist)(\/|\?|$)/i.test(targetUrl);

    if (looksJson || /^\s*[\[{]/.test(bodyText)) {
      try {
        return NextResponse.json(JSON.parse(bodyText));
      } catch {
        // Upstream lied about type or mixed content — return raw text for callers using .text()
        return new NextResponse(bodyText, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=120',
          },
        });
      }
    }

    return new NextResponse(bodyText, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
      },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error(`[Addon Proxy] Timeout for ${targetUrl}`);
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    console.error(`[Addon Proxy] Error fetching ${targetUrl}:`, err);
    return NextResponse.json(
      { error: 'Failed to fetch from addon' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyFetch(request, 'GET');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyFetch(request, 'POST', body);
}
