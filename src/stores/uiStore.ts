import { create } from 'zustand';

type ActiveView = 'home' | 'search' | 'library' | 'playlist' | 'connections' | 'settings';
type RightPanel = 'none' | 'queue' | 'lyrics';
export type PlayerTheme = 'spotify' | 'tidal' | 'apple';

export type ConnectionsScreen = 'home' | 'sources' | 'browse';

interface UIState {
  sidebarCollapsed: boolean;
  rightPanel: RightPanel;
  searchQuery: string;
  activeView: ActiveView;
  playerTheme: PlayerTheme;
  selectedPlaylistId: string | null;
  /** Browse store scoped to one catalog source (from Module sources → chevron). */
  connectionsCatalogSourceId: string | null;
  /** Which Connections sub-screen is shown. */
  connectionsScreen: ConnectionsScreen;
}

interface UIActions {
  toggleSidebar: () => void;
  setRightPanel: (panel: RightPanel) => void;
  setSearchQuery: (query: string) => void;
  setActiveView: (view: ActiveView) => void;
  setPlayerTheme: (theme: PlayerTheme) => void;
  navigateTo: (view: ActiveView) => void;
  setSelectedPlaylistId: (id: string | null) => void;
  setConnectionsCatalogSourceId: (id: string | null) => void;
  setConnectionsScreen: (screen: ConnectionsScreen) => void;
  /** Open Connections → Browse modules, optionally scoped to one source. */
  openConnectionsForCatalog: (sourceId: string | null) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  sidebarCollapsed: false,
  rightPanel: 'none',
  searchQuery: '',
  activeView: 'home',
  playerTheme: 'tidal',
  selectedPlaylistId: null,
  connectionsCatalogSourceId: null,
  connectionsScreen: 'home',

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setRightPanel: (panel: RightPanel) =>
    set((state) => ({ rightPanel: state.rightPanel === panel ? 'none' : panel })),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setActiveView: (view: ActiveView) =>
    set((s) => ({
      activeView: view,
      connectionsCatalogSourceId: view === 'connections' ? s.connectionsCatalogSourceId : null,
      connectionsScreen: view === 'connections' ? s.connectionsScreen : 'home',
    })),

  setConnectionsCatalogSourceId: (id: string | null) => set({ connectionsCatalogSourceId: id }),

  setConnectionsScreen: (connectionsScreen: ConnectionsScreen) => set({ connectionsScreen }),

  openConnectionsForCatalog: (sourceId: string | null) =>
    set({
      activeView: 'connections',
      connectionsCatalogSourceId: sourceId,
      connectionsScreen: 'browse',
    }),

  setPlayerTheme: (theme: PlayerTheme) => set({ playerTheme: theme }),

  navigateTo: (view: ActiveView) => {
    set((s) => ({
      activeView: view,
      selectedPlaylistId: view === 'playlist' ? undefined : null,
      connectionsCatalogSourceId: view === 'connections' ? s.connectionsCatalogSourceId : null,
      connectionsScreen: view === 'connections' ? s.connectionsScreen : 'home',
    }));
  },

  setSelectedPlaylistId: (id: string | null) => {
    if (id) {
      set({ selectedPlaylistId: id, activeView: 'playlist' });
    } else {
      set({ selectedPlaylistId: null });
    }
  },
}));
