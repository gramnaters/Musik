import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const streamUrl = url.searchParams.get('url');

  if (!streamUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(streamUrl);

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'audio/mpeg';

    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Failed to fetch stream', { status: 500 });
  }
}
