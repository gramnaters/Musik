import { create } from 'zustand';

type ActiveView = 'home' | 'search' | 'library' | 'playlist' | 'addons' | 'settings';
type RightPanel = 'none' | 'queue' | 'lyrics';
export type PlayerTheme = 'spotify' | 'tidal' | 'apple';

interface UIState {
  sidebarCollapsed: boolean;
  rightPanel: RightPanel;
  searchQuery: string;
  activeView: ActiveView;
  playerTheme: PlayerTheme;
  selectedPlaylistId: string | null;
}

interface UIActions {
  toggleSidebar: () => void;
  setRightPanel: (panel: RightPanel) => void;
  setSearchQuery: (query: string) => void;
  setActiveView: (view: ActiveView) => void;
  setPlayerTheme: (theme: PlayerTheme) => void;
  navigateTo: (view: ActiveView) => void;
  setSelectedPlaylistId: (id: string | null) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  sidebarCollapsed: false,
  rightPanel: 'none',
  searchQuery: '',
  activeView: 'home',
  playerTheme: 'tidal',
  selectedPlaylistId: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setRightPanel: (panel: RightPanel) =>
    set((state) => ({ rightPanel: state.rightPanel === panel ? 'none' : panel })),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setActiveView: (view: ActiveView) => set({ activeView: view }),
  setPlayerTheme: (theme: PlayerTheme) => set({ playerTheme: theme }),

  navigateTo: (view: ActiveView) => {
    set({ activeView: view, selectedPlaylistId: view === 'playlist' ? undefined : null });
  },

  setSelectedPlaylistId: (id: string | null) => {
    if (id) {
      set({ selectedPlaylistId: id, activeView: 'playlist' });
    } else {
      set({ selectedPlaylistId: null });
    }
  },
}));
