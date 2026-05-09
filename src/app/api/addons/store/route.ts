import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

const ECLIPSE_STORE_REGISTRY = 'https://eclipsemusic.app/addonstore/registry.json';

// Cache the registry for 5 minutes
let cachedRegistry: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Check cache
  if (cachedRegistry && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedRegistry);
  }

  try {
    const res = await fetch(ECLIPSE_STORE_REGISTRY, {
      headers: {
        'User-Agent': 'Musik/1.0 (Eclipse-compatible addon client)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch addon store registry: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    
    // Inject All in One addon
    if (data.addons && Array.isArray(data.addons)) {
      data.addons.unshift({
        id: 'all-in-one',
        name: 'All in One',
        description: 'Eclipse, JioSaavn, YT Music, and more in one addon.',
        version: '1.0.0',
        author: 'musik',
        icon: '🌍',
        manifestUrl: 'https://all-in-one.cyrusna29.workers.dev/manifest.json'
      });
    }

    cachedRegistry = data;
    cacheTimestamp = Date.now();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch addon store';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
