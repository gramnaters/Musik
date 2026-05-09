import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
    },
  });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const streamUrl = url.searchParams.get('url');

  if (!streamUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    new URL(streamUrl);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const headers: Record<string, string> = {
      'User-Agent': 'Musik/1.0 (Eclipse-compatible)',
      Accept: 'audio/*, */*',
    };
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const response = await fetch(streamUrl, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206) {
      return new Response(`Upstream error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'audio/mpeg';
    const contentLength = response.headers.get('Content-Length');
    const contentRange = response.headers.get('Content-Range');

    const respHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    };

    if (contentLength) respHeaders['Content-Length'] = contentLength;
    if (contentRange) respHeaders['Content-Range'] = contentRange;

    return new Response(response.body, {
      status: response.status,
      headers: respHeaders,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return new Response('Stream timed out', { status: 504 });
    }
    console.error(`[Stream Proxy] Error for ${streamUrl}:`, err);
    return new Response('Failed to fetch stream', { status: 500 });
  }
}
