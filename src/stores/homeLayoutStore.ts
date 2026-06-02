import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HomeLayoutState {
  showQuickPicks: boolean;
  showDiscover: boolean;
  showTopTen: boolean;
  showRecentlyPlayed: boolean;
  showRecommendedArtists: boolean;
  showBrowseAll: boolean;
  showRecommendedAlbums: boolean;
  showRecommendedSongs: boolean;
  showJumpBackIn: boolean;
  showEditorsPicks: boolean;
  shuffleEditorsPicks: boolean;
  editorsPicksSource: string;
  compactAlbums: boolean;
  compactArtists: boolean;
  artistBanners: boolean;
}

interface HomeLayoutActions {
  setShowQuickPicks: (v: boolean) => void;
  setShowDiscover: (v: boolean) => void;
  setShowTopTen: (v: boolean) => void;
  setShowRecentlyPlayed: (v: boolean) => void;
  setShowRecommendedArtists: (v: boolean) => void;
  setShowBrowseAll: (v: boolean) => void;
  setShowRecommendedAlbums: (v: boolean) => void;
  setShowRecommendedSongs: (v: boolean) => void;
  setShowJumpBackIn: (v: boolean) => void;
  setShowEditorsPicks: (v: boolean) => void;
  setShuffleEditorsPicks: (v: boolean) => void;
  setEditorsPicksSource: (v: string) => void;
  setCompactAlbums: (v: boolean) => void;
  setCompactArtists: (v: boolean) => void;
  setArtistBanners: (v: boolean) => void;
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
      showRecommendedAlbums: true,
      showRecommendedSongs: true,
      showJumpBackIn: true,
      showEditorsPicks: true,
      shuffleEditorsPicks: true,
      editorsPicksSource: 'current',
      compactAlbums: false,
      compactArtists: true,
      artistBanners: true,
      setShowQuickPicks: (showQuickPicks) => set({ showQuickPicks }),
      setShowDiscover: (showDiscover) => set({ showDiscover }),
      setShowTopTen: (showTopTen) => set({ showTopTen }),
      setShowRecentlyPlayed: (showRecentlyPlayed) => set({ showRecentlyPlayed }),
      setShowRecommendedArtists: (showRecommendedArtists) => set({ showRecommendedArtists }),
      setShowBrowseAll: (showBrowseAll) => set({ showBrowseAll }),
      setShowRecommendedAlbums: (showRecommendedAlbums) => set({ showRecommendedAlbums }),
      setShowRecommendedSongs: (showRecommendedSongs) => set({ showRecommendedSongs }),
      setShowJumpBackIn: (showJumpBackIn) => set({ showJumpBackIn }),
      setShowEditorsPicks: (showEditorsPicks) => set({ showEditorsPicks }),
      setShuffleEditorsPicks: (shuffleEditorsPicks) => set({ shuffleEditorsPicks }),
      setEditorsPicksSource: (editorsPicksSource) => set({ editorsPicksSource }),
      setCompactAlbums: (compactAlbums) => set({ compactAlbums }),
      setCompactArtists: (compactArtists) => set({ compactArtists }),
      setArtistBanners: (artistBanners) => set({ artistBanners }),
    }),
    { name: 'musik-home-layout' }
  )
);