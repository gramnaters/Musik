import { NextRequest, NextResponse } from 'next/server';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0';

function upstreamHeaders(streamUrl: string, range: string | null, method: string): Record<string, string> {
  const origin = new URL(streamUrl).origin;
  const h: Record<string, string> = {
    'User-Agent': CHROME_UA,
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: `${origin}/`,
  };
  if (method === 'GET' && range) {
    h.Range = range;
  }
  return h;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Content-Type',
    },
  });
}

async function proxyStream(request: NextRequest, method: 'GET' | 'HEAD') {
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

  const rangeHeader = request.headers.get('Range');
  const timeoutMs = method === 'HEAD' ? 25_000 : 120_000;

  const doFetch = () =>
    fetch(streamUrl, {
      method,
      headers: upstreamHeaders(streamUrl, rangeHeader, method),
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });

  try {
    let response = await doFetch();
    const retryable =
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504 ||
      response.status === 429;
    if (!response.ok && response.status !== 206 && retryable && method === 'GET') {
      await new Promise((r) => setTimeout(r, 400));
      response = await doFetch();
    }

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
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Content-Type',
    };

    if (contentLength) respHeaders['Content-Length'] = contentLength;
    if (contentRange) respHeaders['Content-Range'] = contentRange;

    if (method === 'HEAD') {
      return new Response(null, {
        status: response.status,
        headers: respHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: respHeaders,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
      return new Response('Stream timed out', { status: 504 });
    }
    console.error(`[Stream Proxy] Error for ${streamUrl}:`, err);
    return new Response('Failed to fetch stream', { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  return proxyStream(request, 'HEAD');
}

export async function GET(request: NextRequest) {
  return proxyStream(request, 'GET');
}
