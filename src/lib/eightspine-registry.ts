/**
 * 8SPINE module catalogs (index.json) use a different shape than Eclipse addon stores.
 * @see https://8spine.club/documentation/ — modules load in the 8SPINE app via the eightspine:// scheme.
 * We expose `.8spine` package URLs; the web player fetches them via proxy and runs the module for search/stream.
 */

export type EightspineStoreRow = {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string;
  icon?: string;
  manifestUrl?: string;
  setupUrl?: string;
  /** True when this row is a native 8SPINE .8spine package, not an Eclipse addon. */
  eightspineOnly?: boolean;
  /** Direct HTTPS URL to the .8spine file for use in the 8SPINE mobile app. */
  eightspinePackageUrl?: string;
  moduleType?: string;
  /** Uppercase catalog tags (HI-RES, QOBUZ, …) for UI chips. */
  tags?: string[];
};

const CATEGORY_KEYS = [
  'category:modules',
  'category:debrid_modules',
  'category:music_modules',
  'category:music',
  'category:video_modules',
  'category:provider_modules',
  'category:artworks',
  'category:testing',
] as const;

export function isEightspineRegistryShape(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  if (CATEGORY_KEYS.some((k) => Array.isArray(o[k]) && (o[k] as unknown[]).length > 0)) return true;
  if (Array.isArray(o.modules) && o.modules.length > 0) return true;
  if (Array.isArray(o.items) && o.items.length > 0) return true;
  if (Array.isArray(o.catalog) && o.catalog.length > 0) return true;
  return false;
}

/** Directory URL ending in / so relative `download` paths resolve correctly. */
export function registryPackageBase(registryUrl: string): string {
  const u = new URL(registryUrl);
  const p = u.pathname;
  const i = p.lastIndexOf('/');
  u.pathname = i <= 0 ? '/' : `${p.slice(0, i + 1)}`;
  return u.toString();
}

function joinPackageUrl(baseDir: string, download: string): string {
  const d = download.replace(/^\.\//, '');
  if (/^https?:\/\//i.test(d)) return d;
  return new URL(d, baseDir).toString();
}

/**
 * Flatten 8SPINE index.json / module-source.json into rows the Addons UI can render.
 */
export function eightspineRegistryToStoreRows(registryUrl: string, data: Record<string, unknown>): {
  addons: EightspineStoreRow[];
} {
  const base = registryPackageBase(registryUrl);
  const addons: EightspineStoreRow[] = [];

  const moduleLists: unknown[][] = [];
  for (const key of CATEGORY_KEYS) {
    const list = data[key];
    if (Array.isArray(list) && list.length) moduleLists.push(list);
  }
  for (const alt of ['modules', 'items', 'catalog'] as const) {
    const list = data[alt];
    if (Array.isArray(list) && list.length) moduleLists.push(list);
  }

  for (const list of moduleLists) {
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const m = raw as Record<string, unknown>;
      const download = String(m.download || m.file || m.download_url || m.url || '').trim();
      if (!download) continue;

      const pkgUrl = joinPackageUrl(base, download);
      const id = String(m.pkg || m.id || download).replace(/\s+/g, '_');
      const ver = String(m.version ?? '0').replace(/^v+/i, '');
      const tags = Array.isArray(m.tags) ? (m.tags as unknown[]).map(String).filter(Boolean) : [];
      const descParts = [
        m.description ? String(m.description) : '',
        tags.length ? `Tags: ${tags.join(', ')}` : '',
      ].filter(Boolean);
      const description = descParts.length ? descParts.join(' — ') : undefined;

      addons.push({
        id,
        name: String(m.name || m.id || '8SPINE module'),
        description: description || undefined,
        author: m.author ? String(m.author) : undefined,
        version: ver,
        eightspineOnly: true,
        eightspinePackageUrl: pkgUrl,
        moduleType: m.type ? String(m.type) : undefined,
        ...(tags.length ? { tags } : {}),
      });
    }
  }

  return { addons };
}
