import { NextRequest, NextResponse } from 'next/server';
import type { AddonManifest } from '@/types/addon';
import {
  detectEightspinePackageKind,
  extractEightspineInner,
  manifestMetaFromEightspineApi,
  runEightspinePackageOnServer,
} from '@/lib/eightspine-runtime';
import { parentDirUrl, resolveAssetUrl } from '@/lib/resolve-asset-url';

export const runtime = 'nodejs';

function isAllowedPackageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') return true;
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetch and execute a `.8spine` package on the server so install works even when the browser
 * blocks `new Function` (CSP, hardening, extensions).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const url = typeof body === 'object' && body && 'url' in body ? String((body as { url?: unknown }).url ?? '').trim() : '';
  if (!url || !isAllowedPackageUrl(url)) {
    return NextResponse.json({ error: 'Invalid or disallowed package URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; BeatBoss-Player/1.0; +https://github.com) AppleWebKit/537.36',
        Accept: 'text/plain, application/javascript, */*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to download .8spine package (HTTP ${res.status})` },
        { status: 502 }
      );
    }
    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json({ error: 'Empty package file' }, { status: 422 });
    }

    const kind = detectEightspinePackageKind(text);
    let api: Record<string, unknown>;
    try {
      api = await runEightspinePackageOnServer(text.trim(), kind);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to run 8SPINE bootstrap';
      return NextResponse.json(
        { error: msg, hint: 'If this mentions CSP or Function, server bootstrap failed unexpectedly.' },
        { status: 422 }
      );
    }

    const meta = manifestMetaFromEightspineApi(api);
    const pkgBase = parentDirUrl(url);
    const iconResolved = resolveAssetUrl(meta.icon, pkgBase);
    const eightspineInnerCode = kind === 'wrapped' ? extractEightspineInner(text.trim()) : text.trim();

    const manifest: AddonManifest = {
      id: meta.id,
      name: meta.name,
      version: meta.version,
      description: meta.description,
      author: meta.author,
      icon: iconResolved,
      resources: meta.resources,
      baseURL: pkgBase,
    };

    return NextResponse.json({
      manifest,
      eightspineInnerCode,
      eightspineKind: kind,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'eightspine_install_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
