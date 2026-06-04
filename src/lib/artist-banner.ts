const BANNER_API = 'https://artwork-boidu-dev.samidy.workers.dev/artist';

let bannerCache = new Map<string, string | null>();

export async function getArtistBanner(artistName: string): Promise<string | null> {
  const key = artistName.toLowerCase().trim();
  const cached = bannerCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${BANNER_API}?a=${encodeURIComponent(artistName)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 Musik/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { bannerCache.set(key, null); return null; }
    const data = await res.json();

    let url: string | null = null;
    if (data.animated) {
      if (typeof data.animated === 'string') url = data.animated;
      else url = data.animated.hls || data.animated.url || data.animated.hlsUrl || data.animated.videoUrl || null;
    }
    if (!url) url = data.videoUrl || null;

    bannerCache.set(key, url);
    return url;
  } catch {
    bannerCache.set(key, null);
    return null;
  }
}

export function clearBannerCache() {
  bannerCache = new Map();
}

export function getBannerCache() {
  return bannerCache;
}
