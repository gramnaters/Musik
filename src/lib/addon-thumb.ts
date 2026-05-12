import { resolveAssetUrl, proxiedRemoteUrl } from '@/lib/resolve-asset-url';

/** Addon manifest icon as displayable URL (proxied when remote). */
export function addonThumbSrc(icon: string | undefined, baseURL: string): string | undefined {
  const resolved = resolveAssetUrl(icon?.trim(), baseURL) || icon?.trim();
  if (!resolved) return undefined;
  if (/^https?:\/\//i.test(resolved)) return proxiedRemoteUrl(resolved);
  return resolved;
}
