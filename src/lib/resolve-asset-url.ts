/** Resolve relative icon/asset URLs from a module package or manifest base. */
export function resolveAssetUrl(asset: string | undefined, baseUrl: string): string | undefined {
  if (!asset?.trim()) return undefined;
  const a = asset.trim();
  if (/^https?:\/\//i.test(a) || a.startsWith('data:') || a.startsWith('blob:')) return a;
  if (!baseUrl.trim()) return a;
  try {
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return new URL(a.replace(/^\//, ''), base).href;
  } catch {
    return a;
  }
}

/** Route remote icons through our proxy (referrer / hotlink fixes). */
export function proxiedRemoteUrl(url: string): string {
  const t = url.trim();
  if (!/^https?:\/\//i.test(t)) return t;
  return `/api/addons/proxy?url=${encodeURIComponent(t)}`;
}

/** Directory URL containing the file at `fullFileUrl` (e.g. package or manifest URL). */
export function parentDirUrl(fullFileUrl: string): string {
  try {
    const u = new URL(fullFileUrl);
    u.pathname = u.pathname.replace(/\/[^/]*$/, '/');
    return u.href;
  } catch {
    return fullFileUrl.replace(/[^/]+$/, '');
  }
}
