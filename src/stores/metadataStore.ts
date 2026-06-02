import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CatalogMetadataProvider = 'spotify' | 'apple' | 'tidal' | 'qobuz' | 'addon' | 'monochrome';

interface MetadataState {
  /** Used for Settings + default catalog search when engine is “catalog”. */
  catalogProvider: CatalogMetadataProvider;
  /** iTunes Search API storefront (ISO 3166-1 alpha-2). Affects Apple catalog + Home when provider is Apple. */
  appleStorefront: string;
}

interface MetadataActions {
  setCatalogProvider: (p: CatalogMetadataProvider) => void;
  setAppleStorefront: (code: string) => void;
}

export const useMetadataStore = create<MetadataState & MetadataActions>()(
  persist(
    (set) => ({
      catalogProvider: 'tidal',
      appleStorefront: 'US',
      setCatalogProvider: (catalogProvider) => set({ catalogProvider }),
      setAppleStorefront: (appleStorefront) =>
        set({ appleStorefront: appleStorefront.trim().toUpperCase().slice(0, 2) || 'US' }),
    }),
    { name: 'musik-metadata', partialize: (s) => ({ catalogProvider: s.catalogProvider, appleStorefront: s.appleStorefront }) }
  )
);
