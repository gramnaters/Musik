/**
 * `AsyncFunction` is not a global in browsers/strict contexts; derive it from any async function.
 * Without this, `new AsyncFunction(...)` throws ReferenceError and 8SPINE installs fail.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const AsyncFunctionConstructor = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

/**
 * Loads 8SPINE ".8spine" modules in two shapes:
 * 1) Wrapped: export const NAME = (template literal) wrapping async module body.
 * 2) Bare: header comment plus top-level functions ending in return { id, searchTracks, ... }.
 * Network calls are routed through our /api/addons/proxy to avoid browser CORS.
 */

const ASYNC_STORAGE_SHIM = `
var AsyncStorage = {
  getItem: async function(k) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(String(k));
  },
  setItem: async function(k, v) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(String(k), String(v));
  },
  removeItem: async function(k) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(String(k));
  },
};
`;

/** Minimal `require` so modules that try `require('crypto')` fall through to their JS fallbacks. */
const REQUIRE_SHIM = `
function require(id) {
  var s = String(id);
  if (s === 'crypto' || s === 'node:crypto') {
    return {
      createHash: function() {
        return {
          update: function() { return { digest: function() { throw new Error('crypto native'); } }; },
        };
      },
    };
  }
  throw new Error('require not available: ' + s);
}
`;

export type EightspinePackageKind = 'wrapped' | 'bare';

export function detectEightspinePackageKind(fullSource: string): EightspinePackageKind {
  const t = fullSource.trim();
  // Check for wrapped module (export const NAME = ` ... `;)
  // Using a more robust check that doesn't rely on multiline anchors for the whole string
  if (/\bexport\s+const\s+[A-Za-z0-9_]+\s*=\s*`/.test(t)) return 'wrapped';
  return 'bare';
}

export function extractEightspineInner(fullSource: string): string {
  const trimmed = fullSource.trim();
  
  // Outer backtick extraction using regex to handle internal backticks
  // We look for export const <NAME> = ` ... `; and capture everything inside the outer backticks
  const wrappedMatch = trimmed.match(/^export\s+const\s+[A-Za-z0-9_]+\s*=\s*`([\s\S]*)`\s*;?\s*$/);
  
  if (wrappedMatch) {
    return wrappedMatch[1]
      .replace(/\\`/g, '`')
      .replace(/\\\$\{/g, '${')
      .replace(/\\\\/g, '\\');
  }

  // Fallback: search for first and last backticks if the export line is unusual
  const firstBacktick = trimmed.indexOf('`');
  const lastBacktick = trimmed.lastIndexOf('`');

  if (firstBacktick !== -1 && lastBacktick !== -1 && firstBacktick !== lastBacktick) {
    const inner = trimmed.slice(firstBacktick + 1, lastBacktick);
    return inner
      .replace(/\\`/g, '`')
      .replace(/\\\$\{/g, '${')
      .replace(/\\\\/g, '\\');
  }

  throw new Error(
    'Unrecognized wrapped 8SPINE module: expected export const <NAME> = ` ... `;'
  );
}



export async function withProxiedFetch<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') {
    throw new Error('8SPINE modules can only run in the browser');
  }

  const origFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
      return origFetch(input as RequestInfo, init);
    }

    try {
      const abs = new URL(url, window.location.href);
      if (abs.origin === window.location.origin) {
        return origFetch(input as RequestInfo, init);
      }
    } catch {
      if (typeof input === 'string' && input.startsWith('/')) {
        return origFetch(input as RequestInfo, init);
      }
    }

    const proxy = `/api/addons/proxy?url=${encodeURIComponent(String(url))}`;
    return origFetch(proxy, init);
  }) as typeof fetch;

  try {
    return await fn();
  } finally {
    globalThis.fetch = origFetch;
  }
}

export async function runEightspineModule(inner: string): Promise<Record<string, unknown>> {
  return withProxiedFetch(async () => {
    const runner = new AsyncFunctionConstructor(inner);
    const out = await runner();
    if (!out || typeof out !== 'object') {
      throw new Error('8SPINE module did not return an API object');
    }
    return out as Record<string, unknown>;
  });
}

/** Bare file: entire source is an async IIFE body ending in `return { … }`. */
export async function runBareEightspineModule(fullSource: string): Promise<Record<string, unknown>> {
  const trimmed = fullSource.trim();
  return withProxiedFetch(async () => {
    const body = `${ASYNC_STORAGE_SHIM}\n${REQUIRE_SHIM}\n${trimmed}`;
    const code = `return await (async () => {\n${body}\n})();`;
    const runner = new AsyncFunctionConstructor(code);
    const out = await runner();
    if (!out || typeof out !== 'object') {
      throw new Error('8SPINE bare module did not return an API object');
    }
    return out as Record<string, unknown>;
  });
}

export async function runEightspinePackage(
  source: string,
  kind: EightspinePackageKind
): Promise<Record<string, unknown>> {
  if (kind === 'wrapped') {
    const inner = extractEightspineInner(source);
    return runEightspineModule(inner);
  }
  return runBareEightspineModule(source);
}

/**
 * Run 8SPINE package in Node (install/bootstrap only). Avoids browser CSP blocking `Function`/`eval`
 * so `.8spine` modules can install from Connections. Uses normal `fetch` (no CORS limits on server).
 */
export async function runEightspineModuleOnServer(inner: string): Promise<Record<string, unknown>> {
  // Use a wrapper to ensure we always get the return value even if the inner code is an IIFE
  const code = `return await (async () => {\n${ASYNC_STORAGE_SHIM}\n${REQUIRE_SHIM}\n${inner}\n})();`;
  try {
    const runner = new AsyncFunctionConstructor(code);
    console.log('[8SPINE Server] Attempting bootstrap with code starting with:', code.slice(0, 150));
    const out = await runner();

    if (!out || typeof out !== 'object') {
      throw new Error('8SPINE module did not return an API object');
    }
    return out as Record<string, unknown>;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[8SPINE Server] Bootstrap failed for wrapped module:', msg);
    if (err instanceof Error && err.stack) {
      console.error('[8SPINE Server] Stack:', err.stack);
    }
    throw err;
  }
}


export async function runBareEightspineModuleOnServer(fullSource: string): Promise<Record<string, unknown>> {
  const trimmed = fullSource.trim();
  const body = `${ASYNC_STORAGE_SHIM}\n${REQUIRE_SHIM}\n${trimmed}`;
  // Ensure we have explicit newlines before closing the IIFE to handle trailing comments
  const code = `return await (async () => {\n${body}\n\n})();`;
  try {
    const runner = new AsyncFunctionConstructor(code);
    const out = await runner();
    if (!out || typeof out !== 'object') {
      throw new Error('8SPINE bare module did not return an API object');
    }
    return out as Record<string, unknown>;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[8SPINE Server] Bootstrap failed:', msg);
    if (err instanceof Error && err.stack) {
      console.error('[8SPINE Server] Stack:', err.stack);
    }
    throw err;
  }
}


export async function runEightspinePackageOnServer(
  source: string,
  kind: EightspinePackageKind
): Promise<Record<string, unknown>> {
  if (kind === 'wrapped') {
    const inner = extractEightspineInner(source);
    return runEightspineModuleOnServer(inner);
  }
  return runBareEightspineModuleOnServer(source);
}

/** Normalize stream URL from `getTrackStreamUrl` return shapes across modules. */
export function pickStreamUrlFromEightspineResult(out: unknown): string {
  if (typeof out === 'string') return out.trim();
  if (!out || typeof out !== 'object') return '';
  const o = out as Record<string, unknown>;
  const direct = o.url ?? o.streamUrl ?? o.stream_url ?? o.href ?? o.playUrl ?? o.play_url;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const track = o.track;
  if (track && typeof track === 'object') {
    const t = track as Record<string, unknown>;
    const u = t.streamUrl ?? t.url ?? t.stream_url;
    if (typeof u === 'string' && u.trim()) return u.trim();
  }
  return '';
}

export function manifestMetaFromEightspineApi(api: Record<string, unknown>): {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  icon?: string;
  resources: string[];
} {
  const id = String(api.id ?? 'eightspine');
  const name = String(api.name ?? id);
  const version = String(api.version ?? '1.0.0');
  const description = api.description ? String(api.description) : undefined;
  const author = api.author ? String(api.author) : undefined;
  const icon =
    (api.logo ? String(api.logo) : undefined) ||
    (api.icon ? String(api.icon) : undefined) ||
    undefined;

  const resources: string[] = [];
  if (typeof api.searchTracks === 'function') resources.push('search');
  if (typeof api.getTrackStreamUrl === 'function') resources.push('stream');
  if (typeof api.getAlbum === 'function') resources.push('catalog');
  if (typeof api.getPlaylist === 'function') resources.push('catalog');

  return { id, name, version, description, author, icon, resources: [...new Set(resources)] };
}
