import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Musik/1.0 (Eclipse-compatible addon client)',
        Accept: 'application/json, audio/*, */*',
      },
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

    // If it's audio, stream it through
    if (contentType.startsWith('audio/') || contentType.includes('octet-stream')) {
      return new Response(response.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Accept-Ranges': 'bytes',
        },
      });
    }

    // Otherwise return JSON
    const data = await response.json();
    return NextResponse.json(data);
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
