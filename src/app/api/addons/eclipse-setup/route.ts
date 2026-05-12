import { NextRequest, NextResponse } from 'next/server';
import {
  manifestUrlCandidates,
  baseUrlFromSuccessfulManifestUrl,
} from '@/lib/manifest-url';
import type { AddonManifest } from '@/types/addon';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseManifestBody(raw: Record<string, unknown>, manifestUrl: string): AddonManifest | null {
  const id = String(raw.id ?? '');
  const name = String(raw.name ?? '');
  const version = String(raw.version ?? '');
  const resources = raw.resources;
  if (!id || !name || !version || !Array.isArray(resources)) return null;
  const baseURL = baseUrlFromSuccessfulManifestUrl(manifestUrl);
  return {
    id,
    name,
    version,
    description: raw.description ? String(raw.description) : undefined,
    author: raw.author ? String(raw.author) : undefined,
    icon: raw.icon ? String(raw.icon) : undefined,
    contentType: raw.contentType ? String(raw.contentType) : undefined,
    types: Array.isArray(raw.types) ? raw.types.map(String) : undefined,
    resources: resources.map(String),
    baseURL,
  };
}

async function fetchUpstream(url: string, init?: RequestInit): Promise<Response> {
  const origin = new URL(url).origin;
  const headers = new Headers(init?.headers);
  if (!headers.has('User-Agent')) headers.set('User-Agent', CHROME_UA);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json, audio/*, */*');
  if (!headers.has('Accept-Language')) headers.set('Accept-Language', 'en-US,en;q=0.9');
  if (!headers.has('Referer')) headers.set('Referer', `${origin}/`);

  return fetch(url, {
    ...init,
    redirect: 'follow',
    signal: init?.signal ?? AbortSignal.timeout(18000),
    headers,
  });
}

/**
 * Resolve Eclipse addon manifest from a registry setupUrl / manifestUrl.
 * Many Cloudflare workers (Monochrome, SoundCloud bridge, etc.) expose no static
 * /manifest.json — the real URL is returned by POST /generate (Chromium flow).
 */
export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get('url');
  if (!param?.trim()) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const trimmed = param.trim();
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return NextResponse.json({ error: 'Invalid URL scheme' }, { status: 400 });
    }
    if (u.protocol === 'http:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
      return NextResponse.json({ error: 'HTTP not allowed' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const tryCandidates = async (seedUrl: string): Promise<AddonManifest | null> => {
    for (const manifestUrl of manifestUrlCandidates(seedUrl)) {
      const res = await fetchUpstream(manifestUrl);
      if (!res.ok) continue;
      const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!raw || typeof raw !== 'object') continue;
      const m = parseManifestBody(raw, manifestUrl);
      if (m) return m;
    }
    return null;
  };

  const direct = await tryCandidates(trimmed);
  if (direct) {
    return NextResponse.json({ manifest: direct });
  }

  try {
    const u = new URL(trimmed);
    const generateUrl = new URL('/generate', `${u.origin}/`).toString();
    const genRes = await fetchUpstream(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!genRes.ok) {
      return NextResponse.json(
        { error: `No manifest and POST /generate failed (${genRes.status})` },
        { status: 404 }
      );
    }
    const genData = (await genRes.json().catch(() => null)) as { manifestUrl?: string; error?: string } | null;
    if (!genData || genData.error) {
      return NextResponse.json(
        { error: genData?.error || 'Invalid /generate response' },
        { status: 404 }
      );
    }
    const manifestUrlFromGen = genData.manifestUrl?.trim();
    if (!manifestUrlFromGen) {
      return NextResponse.json({ error: 'No manifestUrl in /generate response' }, { status: 404 });
    }
    const fromGen = await tryCandidates(manifestUrlFromGen);
    if (fromGen) {
      return NextResponse.json({ manifest: fromGen, viaGenerate: true });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Setup resolution failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ error: 'Could not resolve Eclipse addon manifest' }, { status: 404 });
}
