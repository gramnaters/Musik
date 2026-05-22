import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { eightspineRegistryToStoreRows, isEightspineRegistryShape } from '@/lib/eightspine-registry';

const DEFAULT_REGISTRY = 'https://eclipsemusic.app/addonstore/registry.json';

const cache = new Map<string, { payload: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function firstNonEmptyString(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** Map alternate registry field names so every row has a usable install URL when possible. */
function normalizeStoreAddonRow(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  const next = { ...o };

  let manifestUrl = firstNonEmptyString(o, ['manifestUrl', 'manifest_url', 'manifest', 'manifestURL']);
  let setupUrl = firstNonEmptyString(o, ['setupUrl', 'setup_url', 'setup', 'installUrl', 'install_url']);
  const eightspinePackageUrl = firstNonEmptyString(o, [
    'eightspinePackageUrl',
    'packageUrl',
    'moduleUrl',
    'eightspine_url',
    'package',
    'downloadUrl',
    'download',
  ]);
  const genericUrl = firstNonEmptyString(o, ['url', 'pluginUrl', 'href', 'link']);

  if (!manifestUrl && !setupUrl && genericUrl) {
    if (/manifest\.json/i.test(genericUrl)) manifestUrl = genericUrl;
    else setupUrl = genericUrl;
  }

  if (manifestUrl) next.manifestUrl = manifestUrl;
  if (setupUrl) next.setupUrl = setupUrl;
  if (eightspinePackageUrl) next.eightspinePackageUrl = eightspinePackageUrl;
  if (o.eightspineOnly === true || o['8spine'] === true) next.eightspineOnly = true;

  return next;
}

function isAllowedRegistryUrl(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get('url');
  let target = DEFAULT_REGISTRY;

  if (param) {
    try {
      const decoded = decodeURIComponent(param);
      const u = new URL(decoded);
      if (!isAllowedRegistryUrl(u)) {
        return NextResponse.json({ error: 'Invalid registry URL' }, { status: 400 });
      }
      target = u.toString();
    } catch {
      return NextResponse.json({ error: 'Invalid registry URL' }, { status: 400 });
    }
  }

  const cached = cache.get(target);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.payload);
  }

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Musik/1.0',
        Accept: 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch addon store registry: ${res.status}` },
        { status: res.status }
      );
    }

    let data: Record<string, unknown> & { addons?: unknown[] };
    try {
      data = (await res.json()) as Record<string, unknown> & { addons?: unknown[] };
    } catch {
      return NextResponse.json(
        { error: 'Registry returned invalid JSON (possibly an HTML page)' },
        { status: 502 }
      );
    }

    const hasEclipseList = Array.isArray(data.addons) && data.addons.length > 0;
    if (!hasEclipseList && isEightspineRegistryShape(data)) {
      data = { addons: eightspineRegistryToStoreRows(target, data).addons } as typeof data;
    }

    if (data.addons && Array.isArray(data.addons)) {
      data.addons = data.addons.map(normalizeStoreAddonRow);
    }

    cache.set(target, { payload: data, ts: Date.now() });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch addon store';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
