import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HomeLayoutState {
  showQuickPicks: boolean;
  showDiscover: boolean;
  showTopTen: boolean;
  showRecentlyPlayed: boolean;
  showRecommendedArtists: boolean;
  showBrowseAll: boolean;
}

interface HomeLayoutActions {
  setShowQuickPicks: (v: boolean) => void;
  setShowDiscover: (v: boolean) => void;
  setShowTopTen: (v: boolean) => void;
  setShowRecentlyPlayed: (v: boolean) => void;
  setShowRecommendedArtists: (v: boolean) => void;
  setShowBrowseAll: (v: boolean) => void;
}

export const useHomeLayoutStore = create<HomeLayoutState & HomeLayoutActions>()(
  persist(
    (set) => ({
      showQuickPicks: false,
      showDiscover: true,
      showTopTen: true,
      showRecentlyPlayed: true,
      showRecommendedArtists: true,
      showBrowseAll: true,
      setShowQuickPicks: (showQuickPicks) => set({ showQuickPicks }),
      setShowDiscover: (showDiscover) => set({ showDiscover }),
      setShowTopTen: (showTopTen) => set({ showTopTen }),
      setShowRecentlyPlayed: (showRecentlyPlayed) => set({ showRecentlyPlayed }),
      setShowRecommendedArtists: (showRecommendedArtists) => set({ showRecommendedArtists }),
      setShowBrowseAll: (showBrowseAll) => set({ showBrowseAll }),
    }),
    { name: 'musik-home-layout' }
  )
);
