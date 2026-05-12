/** Query params for opening a home hub in a new tab (`/?hub=…`). */

export type HomeHubDeepLink =
  | { hub: 'artist'; name: string }
  | { hub: 'mood'; id: string }
  | { hub: 'genre'; id: string };

export function buildHomeHubUrl(link: HomeHubDeepLink): string {
  if (typeof window === 'undefined') return '/';
  const u = new URL(window.location.origin);
  u.pathname = '/';
  u.searchParams.set('hub', link.hub);
  if (link.hub === 'artist') {
    u.searchParams.set('name', link.name);
  } else {
    u.searchParams.set('id', link.id);
  }
  return `${u.pathname}${u.search}`;
}

export function openHomeHubInNewTab(link: HomeHubDeepLink): void {
  const url = buildHomeHubUrl(link);
  window.open(url, '_blank', 'noopener,noreferrer');
}
