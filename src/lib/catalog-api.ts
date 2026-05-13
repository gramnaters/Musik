import type { CatalogMetadataProvider } from '@/stores/metadataStore';

export function metadataSearchUrl(params: {
  q: string;
  provider: CatalogMetadataProvider;
  limit?: number;
  entity?: 'track' | 'artist' | 'playlist';
  /** iTunes storefront when provider is Apple; also used as Spotify market when `market` omitted */
  appleCountry?: string;
  /** Spotify market (ISO 3166-1 alpha-2); defaults from `appleCountry` so region picker affects both catalogs */
  market?: string;
}): string {
  const u = new URLSearchParams({
    q: params.q,
    provider: params.provider,
  });
  if (params.limit != null) u.set('limit', String(params.limit));
  if (params.entity) u.set('entity', params.entity);

  const pick2 = (v: string | undefined, fallback: string) => {
    const t = (v ?? fallback).toString().trim().toUpperCase().slice(0, 2);
    return /^[A-Z]{2}$/.test(t) ? t : fallback;
  };
  const cc = pick2(params.appleCountry, 'US');
  if (params.provider === 'apple') {
    u.set('country', cc);
  }
  if (params.provider === 'spotify') {
    u.set('market', pick2(params.market, pick2(params.appleCountry, 'US')));
  }
  return `/api/metadata/search?${u.toString()}`;
}

/** One round-trip: tracks, albums, artists, playlists, podcasts (uses storefront / market). */
export function metadataSearchBundleUrl(params: {
  q: string;
  provider: CatalogMetadataProvider;
  limit?: number;
  appleCountry?: string;
  market?: string;
}): string {
  const u = new URLSearchParams({
    q: params.q,
    provider: params.provider,
  });
  if (params.limit != null) u.set('limit', String(params.limit));

  const pick2 = (v: string | undefined, fallback: string) => {
    const t = (v ?? fallback).toString().trim().toUpperCase().slice(0, 2);
    return /^[A-Z]{2}$/.test(t) ? t : fallback;
  };
  const cc = pick2(params.appleCountry, 'US');
  if (params.provider === 'apple') {
    u.set('country', cc);
  }
  if (params.provider === 'spotify') {
    u.set('market', pick2(params.market, pick2(params.appleCountry, 'US')));
  }
  return `/api/metadata/search-bundle?${u.toString()}`;
}
