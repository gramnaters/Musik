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
  const cc = params.appleCountry?.trim().slice(0, 2).toUpperCase();
  if (params.provider === 'apple' && cc) {
    u.set('country', cc);
  }
  const mkt = (params.market || cc || 'US').trim().slice(0, 2).toUpperCase();
  if (params.provider === 'spotify') {
    u.set('market', mkt);
  }
  return `/api/metadata/search?${u.toString()}`;
}
