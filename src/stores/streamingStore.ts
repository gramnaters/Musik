import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StreamingInstance {
  url: string;
  name?: string;
  type: 'api' | 'streaming' | 'qobuz';
  isUser?: boolean;
  version?: string;
}

export type EqPreset =
  | 'flat'
  | 'bass-boost'
  | 'treble-boost'
  | 'vocal-boost'
  | 'electronic'
  | 'classical'
  | 'rock'
  | 'pop';

interface StreamingState {
  // Instances
  apiInstances: StreamingInstance[];
  streamingInstances: StreamingInstance[];
  qobuzInstances: StreamingInstance[];
  
  // Selected Instances
  selectedApiUrl: string | null;
  selectedStreamingUrl: string | null;
  selectedQobuzUrl: string | null;

  // Credentials
  tidalToken: string | null;
  qobuzToken: string | null;
  deezerToken: string | null;

  // Scrobbling (Last.fm)
  lastfmEnabled: boolean;
  lastfmUsername: string | null;
  lastfmSessionKey: string | null;
  lastfmScrobblePercentage: number;
  lastfmLoveOnLike: boolean;

  // Scrobbling (ListenBrainz)
  listenbrainzEnabled: boolean;
  listenbrainzToken: string | null;

  // Scrobbling (Maloja)
  malojaEnabled: boolean;
  malojaUrl: string | null;
  malojaApiKey: string | null;

  // Lyrics
  lyricsEnabled: boolean;
  lyricsDownloadWithTracks: boolean;
  romajiLyrics: boolean;
  downloadLyrics: boolean;

  // Audio Quality
  streamingQuality: 'auto' | 'hi_res_lossless' | 'lossless' | 'aac_320' | 'aac_96';
  downloadQuality: 'lossless_24' | 'lossless_16' | 'aac_320' | 'aac_256' | 'aac_96' | 'mp3_320' | 'mp3_256' | 'mp3_128' | 'ogg_320' | 'ogg_256' | 'ogg_128';
  losslessContainer: 'flac' | 'alac';

  // Downloads Extended
  bulkDownloadMethod: 'zip' | 'individual';
  autoDownloadLikedTracks: boolean;
  embedLyricsInFiles: boolean;
  embedCoverArtInFiles: boolean;
  writeArtistsSeparately: boolean;
  coverArtSize: number;
  filenameTemplate: string;
  folderTemplate: string;
  downloadConcurrentCount: number;

  // Playback
  gaplessPlayback: boolean;
  crossfadeSeconds: number;
  replayGainMode: 'off' | 'track' | 'album';
  replayGainPreamp: number;

  // Interface & Appearance
  language: string;
  showExplicit: boolean;
  accentColor: string;
  glassEffect: boolean;
  theme: 'system' | 'dark' | 'light' | 'ocean' | 'purple' | 'forest' | 'mocha' | 'latte';

  // Quality Badges & Display
  showQualityBadges: boolean;
  useAlbumYear: boolean;

  // Audio Effects
  monoAudio: boolean;
  exponentialVolume: boolean;
  playbackSpeed: number;
  preservePitch: boolean;

  // Playlist File Generation
  generateM3U: boolean;
  generateM3U8: boolean;
  generateCUE: boolean;
  generateNFO: boolean;
  generateJSON: boolean;
  relativePaths: boolean;
  separateDiscs: boolean;
  includeCoverFile: boolean;

  // Visual Experience
  albumBackground: boolean;
  dynamicColors: boolean;
  cdAlbumCover: boolean;

  // Binaural & EQ
  binauralAudio: boolean;
  eqEnabled: boolean;
  eqPreset: EqPreset;

  // Interface — Home Page
  showRecommendedSongs: boolean;
  showRecommendedAlbums: boolean;
  showRecommendedArtists: boolean;
  showJumpBackIn: boolean;
  showEditorsPicks: boolean;
  shuffleEditorsPicks: boolean;
  editorsPicksSource: 'current' | 'all';

  // Interface — Layout
  compactArtists: boolean;
  artistBanners: boolean;
  compactAlbums: boolean;

  // Interface — Sidebar Top
  sidebarHome: boolean;
  sidebarLibrary: boolean;
  sidebarRecent: boolean;
  sidebarUnreleased: boolean;
  sidebarDonate: boolean;
  sidebarSettings: boolean;

  // Interface — Sidebar Bottom
  sidebarAbout: boolean;
  sidebarDiscord: boolean;
  sidebarParties: boolean;
  sidebarGithub: boolean;

  // Interface — Navigation
  closeModalsOnNav: boolean;
  interceptBackModals: boolean;
  nowPlayingViewMode: 'fullscreen' | 'mini' | 'disabled';
  fullscreenCoverAction: 'exit' | 'lyrics' | 'queue';

  // Appearance — Theme
  communityThemeStoreUrl: string;

  // Appearance — Font
  fontType: 'preset' | 'google' | 'url' | 'upload';
  fontName: string;
  fontSize: number;

  // Appearance — Album Art
  waveformSeekbar: boolean;
  noRoundAlbumCover: boolean;
  vanillaTilt: boolean;
  tiltDistance: number;
  tiltSpeed: number;

  // Appearance — Visualizer
  fullscreenVisualizer: boolean;
  visualizerStyle: 'kawarp' | 'bars' | 'circular' | 'wave' | 'particles';
  visualizerMode: 'solid' | 'overlay' | 'behind';
  visualizerSmartIntensity: boolean;
  visualizerSensitivity: number;
  visualizerBrightness: number;
}

interface StreamingActions {
  // Instances
  setInstances: (type: 'api' | 'streaming' | 'qobuz', instances: StreamingInstance[]) => void;
  addInstance: (type: 'api' | 'streaming' | 'qobuz', url: string, name?: string) => void;
  removeInstance: (type: 'api' | 'streaming' | 'qobuz', url: string) => void;
  setSelectedUrl: (type: 'api' | 'streaming' | 'qobuz', url: string | null) => void;

  // Credentials
  setTidalToken: (token: string | null) => void;
  setQobuzToken: (token: string | null) => void;
  setDeezerToken: (token: string | null) => void;

  // Scrobbling
  setLastfmEnabled: (enabled: boolean) => void;
  setLastfmSession: (username: string | null, key: string | null) => void;
  setLastfmScrobblePercentage: (percentage: number) => void;
  setLastfmLoveOnLike: (enabled: boolean) => void;
  setListenbrainzEnabled: (enabled: boolean) => void;
  setListenbrainzToken: (token: string | null) => void;
  setMalojaEnabled: (enabled: boolean) => void;
  setMalojaUrl: (url: string | null) => void;
  setMalojaApiKey: (key: string | null) => void;

  // Lyrics
  setLyricsEnabled: (enabled: boolean) => void;
  setLyricsDownloadWithTracks: (enabled: boolean) => void;
  setRomajiLyrics: (enabled: boolean) => void;
  setDownloadLyrics: (enabled: boolean) => void;

  // Quality
  setStreamingQuality: (q: StreamingState['streamingQuality']) => void;
  setDownloadQuality: (q: StreamingState['downloadQuality']) => void;
  setLosslessContainer: (c: StreamingState['losslessContainer']) => void;

  // Downloads Extended
  setBulkDownloadMethod: (method: StreamingState['bulkDownloadMethod']) => void;
  setAutoDownloadLikedTracks: (v: boolean) => void;
  setEmbedLyricsInFiles: (v: boolean) => void;
  setEmbedCoverArtInFiles: (v: boolean) => void;
  setWriteArtistsSeparately: (v: boolean) => void;
  setCoverArtSize: (size: number) => void;
  setFilenameTemplate: (template: string) => void;
  setFolderTemplate: (template: string) => void;
  setDownloadConcurrentCount: (count: number) => void;

  // Playback
  setGaplessPlayback: (enabled: boolean) => void;
  setCrossfadeSeconds: (seconds: number) => void;
  setReplayGainMode: (mode: StreamingState['replayGainMode']) => void;
  setReplayGainPreamp: (db: number) => void;

  // Interface & Appearance
  setLanguage: (lang: string) => void;
  setShowExplicit: (show: boolean) => void;
  setAccentColor: (color: string) => void;
  setGlassEffect: (enabled: boolean) => void;
  setTheme: (theme: StreamingState['theme']) => void;

  // Quality & Display
  setShowQualityBadges: (v: boolean) => void;
  setUseAlbumYear: (v: boolean) => void;

  // Audio Effects
  setMonoAudio: (v: boolean) => void;
  setExponentialVolume: (v: boolean) => void;
  setPlaybackSpeed: (v: number) => void;
  setPreservePitch: (v: boolean) => void;

  // Playlist File Generation
  setGenerateM3U: (v: boolean) => void;
  setGenerateM3U8: (v: boolean) => void;
  setGenerateCUE: (v: boolean) => void;
  setGenerateNFO: (v: boolean) => void;
  setGenerateJSON: (v: boolean) => void;
  setRelativePaths: (v: boolean) => void;
  setSeparateDiscs: (v: boolean) => void;
  setIncludeCoverFile: (v: boolean) => void;

  // Visual Experience
  setAlbumBackground: (v: boolean) => void;
  setDynamicColors: (v: boolean) => void;
  setCdAlbumCover: (v: boolean) => void;

  // Binaural & EQ
  setBinauralAudio: (v: boolean) => void;
  setEqEnabled: (v: boolean) => void;
  setEqPreset: (p: EqPreset) => void;

  // Interface — Home Page
  setShowRecommendedSongs: (v: boolean) => void;
  setShowRecommendedAlbums: (v: boolean) => void;
  setShowRecommendedArtists: (v: boolean) => void;
  setShowJumpBackIn: (v: boolean) => void;
  setShowEditorsPicks: (v: boolean) => void;
  setShuffleEditorsPicks: (v: boolean) => void;
  setEditorsPicksSource: (v: StreamingState['editorsPicksSource']) => void;

  // Interface — Layout
  setCompactArtists: (v: boolean) => void;
  setArtistBanners: (v: boolean) => void;
  setCompactAlbums: (v: boolean) => void;

  // Interface — Sidebar Top
  setSidebarHome: (v: boolean) => void;
  setSidebarLibrary: (v: boolean) => void;
  setSidebarRecent: (v: boolean) => void;
  setSidebarUnreleased: (v: boolean) => void;
  setSidebarDonate: (v: boolean) => void;
  setSidebarSettings: (v: boolean) => void;

  // Interface — Sidebar Bottom
  setSidebarAbout: (v: boolean) => void;
  setSidebarDiscord: (v: boolean) => void;
  setSidebarParties: (v: boolean) => void;
  setSidebarGithub: (v: boolean) => void;

  // Interface — Navigation
  setCloseModalsOnNav: (v: boolean) => void;
  setInterceptBackModals: (v: boolean) => void;
  setNowPlayingViewMode: (v: StreamingState['nowPlayingViewMode']) => void;
  setFullscreenCoverAction: (v: StreamingState['fullscreenCoverAction']) => void;

  // Appearance — Theme
  setCommunityThemeStoreUrl: (v: string) => void;

  // Appearance — Font
  setFontType: (v: StreamingState['fontType']) => void;
  setFontName: (v: string) => void;
  setFontSize: (v: number) => void;

  // Appearance — Album Art
  setWaveformSeekbar: (v: boolean) => void;
  setNoRoundAlbumCover: (v: boolean) => void;
  setVanillaTilt: (v: boolean) => void;
  setTiltDistance: (v: number) => void;
  setTiltSpeed: (v: number) => void;

  // Appearance — Visualizer
  setFullscreenVisualizer: (v: boolean) => void;
  setVisualizerStyle: (v: StreamingState['visualizerStyle']) => void;
  setVisualizerMode: (v: StreamingState['visualizerMode']) => void;
  setVisualizerSmartIntensity: (v: boolean) => void;
  setVisualizerSensitivity: (v: number) => void;
  setVisualizerBrightness: (v: number) => void;
}

const DEFAULT_API_INSTANCES: StreamingInstance[] = [
  { url: 'https://hifi.geeked.wtf', version: '2.7', type: 'api' },
];

const DEFAULT_STREAMING_INSTANCES: StreamingInstance[] = [
  { url: 'https://hifi.geeked.wtf', version: '2.7', type: 'streaming' },
  { url: 'https://maus.qqdl.site', version: '2.6', type: 'streaming' },
];

const DEFAULT_QOBUZ_INSTANCES: StreamingInstance[] = [
  { url: 'https://qobuz.kennyy.com.br', version: '1.0', type: 'qobuz' },
];

export const useStreamingStore = create<StreamingState & StreamingActions>()(
  persist(
    (set) => ({
      apiInstances: DEFAULT_API_INSTANCES,
      streamingInstances: DEFAULT_STREAMING_INSTANCES,
      qobuzInstances: DEFAULT_QOBUZ_INSTANCES,
      
      selectedApiUrl: 'https://hifi.geeked.wtf',
      selectedStreamingUrl: 'https://hifi.geeked.wtf',
      selectedQobuzUrl: 'https://qobuz.kennyy.com.br',

      tidalToken: null,
      qobuzToken: null,
      deezerToken: null,

      lastfmEnabled: false,
      lastfmUsername: null,
      lastfmSessionKey: null,
      lastfmScrobblePercentage: 75,
      lastfmLoveOnLike: false,

      listenbrainzEnabled: false,
      listenbrainzToken: null,

      malojaEnabled: false,
      malojaUrl: null,
      malojaApiKey: null,

      lyricsEnabled: true,
      lyricsDownloadWithTracks: false,
      romajiLyrics: false,
      downloadLyrics: false,

      streamingQuality: 'auto',
      downloadQuality: 'lossless_24',
      losslessContainer: 'flac',

      bulkDownloadMethod: 'zip',
      autoDownloadLikedTracks: false,
      embedLyricsInFiles: true,
      embedCoverArtInFiles: true,
      writeArtistsSeparately: false,
      coverArtSize: 1280,
      filenameTemplate: '{trackNumber} - {artist} - {title}',
      folderTemplate: '{albumTitle} - {albumArtist}',
      downloadConcurrentCount: 3,

      gaplessPlayback: true,
      crossfadeSeconds: 0,
      replayGainMode: 'track',
      replayGainPreamp: 3,

      language: 'en',
      showExplicit: true,
      accentColor: '#1DB954',
      glassEffect: true,
      theme: 'dark',

      showQualityBadges: true,
      useAlbumYear: true,
      monoAudio: false,
      exponentialVolume: false,
      playbackSpeed: 1,
      preservePitch: true,
      generateM3U: true,
      generateM3U8: false,
      generateCUE: false,
      generateNFO: false,
      generateJSON: false,
      relativePaths: true,
      separateDiscs: true,
      includeCoverFile: true,
      albumBackground: true,
      dynamicColors: true,
      cdAlbumCover: true,

      binauralAudio: false,
      eqEnabled: false,
      eqPreset: 'flat',

      showRecommendedSongs: true,
      showRecommendedAlbums: true,
      showRecommendedArtists: true,
      showJumpBackIn: true,
      showEditorsPicks: true,
      shuffleEditorsPicks: true,
      editorsPicksSource: 'current',

      compactArtists: true,
      artistBanners: true,
      compactAlbums: false,

      sidebarHome: true,
      sidebarLibrary: true,
      sidebarRecent: true,
      sidebarUnreleased: true,
      sidebarDonate: true,
      sidebarSettings: true,

      sidebarAbout: true,
      sidebarDiscord: true,
      sidebarParties: true,
      sidebarGithub: true,

      closeModalsOnNav: false,
      interceptBackModals: false,
      nowPlayingViewMode: 'fullscreen',
      fullscreenCoverAction: 'exit',

      communityThemeStoreUrl: '',

      fontType: 'preset',
      fontName: 'Inter',
      fontSize: 100,

      waveformSeekbar: false,
      noRoundAlbumCover: true,
      vanillaTilt: true,
      tiltDistance: 10,
      tiltSpeed: 240,

      fullscreenVisualizer: true,
      visualizerStyle: 'kawarp',
      visualizerMode: 'solid',
      visualizerSmartIntensity: true,
      visualizerSensitivity: 100,
      visualizerBrightness: 100,

      setInstances: (type, instances) => {
        if (type === 'api') set({ apiInstances: instances });
        else if (type === 'streaming') set({ streamingInstances: instances });
        else if (type === 'qobuz') set({ qobuzInstances: instances });
      },
      addInstance: (type, url, name) => {
        const instance: StreamingInstance = { url, name, type, isUser: true, version: 'custom' };
        if (type === 'api') set((state) => ({ apiInstances: [instance, ...state.apiInstances] }));
        else if (type === 'streaming') set((state) => ({ streamingInstances: [instance, ...state.streamingInstances] }));
        else if (type === 'qobuz') set((state) => ({ qobuzInstances: [instance, ...state.qobuzInstances] }));
      },
      removeInstance: (type, url) => {
        if (type === 'api') set((state) => ({ apiInstances: state.apiInstances.filter((i) => i.url !== url) }));
        else if (type === 'streaming') set((state) => ({ streamingInstances: state.streamingInstances.filter((i) => i.url !== url) }));
        else if (type === 'qobuz') set((state) => ({ qobuzInstances: state.qobuzInstances.filter((i) => i.url !== url) }));
      },
      setSelectedUrl: (type, url) => {
        if (type === 'api') set({ selectedApiUrl: url });
        else if (type === 'streaming') set({ selectedStreamingUrl: url });
        else if (type === 'qobuz') set({ selectedQobuzUrl: url });
      },

      setTidalToken: (tidalToken) => set({ tidalToken }),
      setQobuzToken: (qobuzToken) => set({ qobuzToken }),
      setDeezerToken: (deezerToken) => set({ deezerToken }),

      setLastfmEnabled: (lastfmEnabled) => set({ lastfmEnabled }),
      setLastfmSession: (lastfmUsername, lastfmSessionKey) => set({ lastfmUsername, lastfmSessionKey }),
      setLastfmScrobblePercentage: (lastfmScrobblePercentage) => set({ lastfmScrobblePercentage }),
      setLastfmLoveOnLike: (lastfmLoveOnLike) => set({ lastfmLoveOnLike }),
      setListenbrainzEnabled: (listenbrainzEnabled) => set({ listenbrainzEnabled }),
      setListenbrainzToken: (listenbrainzToken) => set({ listenbrainzToken }),
      setMalojaEnabled: (malojaEnabled) => set({ malojaEnabled }),
      setMalojaUrl: (malojaUrl) => set({ malojaUrl }),
      setMalojaApiKey: (malojaApiKey) => set({ malojaApiKey }),

      setLyricsEnabled: (lyricsEnabled) => set({ lyricsEnabled }),
      setLyricsDownloadWithTracks: (lyricsDownloadWithTracks) => set({ lyricsDownloadWithTracks }),
      setRomajiLyrics: (romajiLyrics) => set({ romajiLyrics }),
      setDownloadLyrics: (downloadLyrics) => set({ downloadLyrics }),

      setStreamingQuality: (streamingQuality) => set({ streamingQuality }),
      setDownloadQuality: (downloadQuality) => set({ downloadQuality }),
      setLosslessContainer: (losslessContainer) => set({ losslessContainer }),

      setBulkDownloadMethod: (bulkDownloadMethod) => set({ bulkDownloadMethod }),
      setAutoDownloadLikedTracks: (autoDownloadLikedTracks) => set({ autoDownloadLikedTracks }),
      setEmbedLyricsInFiles: (embedLyricsInFiles) => set({ embedLyricsInFiles }),
      setEmbedCoverArtInFiles: (embedCoverArtInFiles) => set({ embedCoverArtInFiles }),
      setWriteArtistsSeparately: (writeArtistsSeparately) => set({ writeArtistsSeparately }),
      setCoverArtSize: (coverArtSize) => set({ coverArtSize }),
      setFilenameTemplate: (filenameTemplate) => set({ filenameTemplate }),
      setFolderTemplate: (folderTemplate) => set({ folderTemplate }),
      setDownloadConcurrentCount: (downloadConcurrentCount) => set({ downloadConcurrentCount }),

      setGaplessPlayback: (gaplessPlayback) => set({ gaplessPlayback }),
      setCrossfadeSeconds: (crossfadeSeconds) => set({ crossfadeSeconds }),
      setReplayGainMode: (replayGainMode) => set({ replayGainMode }),
      setReplayGainPreamp: (replayGainPreamp) => set({ replayGainPreamp }),

      setLanguage: (language) => set({ language }),
      setShowExplicit: (showExplicit) => set({ showExplicit }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setGlassEffect: (glassEffect) => set({ glassEffect }),
      setTheme: (theme) => set({ theme }),

      setShowQualityBadges: (showQualityBadges) => set({ showQualityBadges }),
      setUseAlbumYear: (useAlbumYear) => set({ useAlbumYear }),
      setMonoAudio: (monoAudio) => set({ monoAudio }),
      setExponentialVolume: (exponentialVolume) => set({ exponentialVolume }),
      setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
      setPreservePitch: (preservePitch) => set({ preservePitch }),
      setGenerateM3U: (generateM3U) => set({ generateM3U }),
      setGenerateM3U8: (generateM3U8) => set({ generateM3U8 }),
      setGenerateCUE: (generateCUE) => set({ generateCUE }),
      setGenerateNFO: (generateNFO) => set({ generateNFO }),
      setGenerateJSON: (generateJSON) => set({ generateJSON }),
      setRelativePaths: (relativePaths) => set({ relativePaths }),
      setSeparateDiscs: (separateDiscs) => set({ separateDiscs }),
      setIncludeCoverFile: (includeCoverFile) => set({ includeCoverFile }),
      setAlbumBackground: (albumBackground) => set({ albumBackground }),
      setDynamicColors: (dynamicColors) => set({ dynamicColors }),
      setCdAlbumCover: (cdAlbumCover) => set({ cdAlbumCover }),

      setBinauralAudio: (binauralAudio) => set({ binauralAudio }),
      setEqEnabled: (eqEnabled) => set({ eqEnabled }),
      setEqPreset: (eqPreset) => set({ eqPreset }),

      setShowRecommendedSongs: (showRecommendedSongs) => set({ showRecommendedSongs }),
      setShowRecommendedAlbums: (showRecommendedAlbums) => set({ showRecommendedAlbums }),
      setShowRecommendedArtists: (showRecommendedArtists) => set({ showRecommendedArtists }),
      setShowJumpBackIn: (showJumpBackIn) => set({ showJumpBackIn }),
      setShowEditorsPicks: (showEditorsPicks) => set({ showEditorsPicks }),
      setShuffleEditorsPicks: (shuffleEditorsPicks) => set({ shuffleEditorsPicks }),
      setEditorsPicksSource: (editorsPicksSource) => set({ editorsPicksSource }),

      setCompactArtists: (compactArtists) => set({ compactArtists }),
      setArtistBanners: (artistBanners) => set({ artistBanners }),
      setCompactAlbums: (compactAlbums) => set({ compactAlbums }),

      setSidebarHome: (sidebarHome) => set({ sidebarHome }),
      setSidebarLibrary: (sidebarLibrary) => set({ sidebarLibrary }),
      setSidebarRecent: (sidebarRecent) => set({ sidebarRecent }),
      setSidebarUnreleased: (sidebarUnreleased) => set({ sidebarUnreleased }),
      setSidebarDonate: (sidebarDonate) => set({ sidebarDonate }),
      setSidebarSettings: (sidebarSettings) => set({ sidebarSettings }),

      setSidebarAbout: (sidebarAbout) => set({ sidebarAbout }),
      setSidebarDiscord: (sidebarDiscord) => set({ sidebarDiscord }),
      setSidebarParties: (sidebarParties) => set({ sidebarParties }),
      setSidebarGithub: (sidebarGithub) => set({ sidebarGithub }),

      setCloseModalsOnNav: (closeModalsOnNav) => set({ closeModalsOnNav }),
      setInterceptBackModals: (interceptBackModals) => set({ interceptBackModals }),
      setNowPlayingViewMode: (nowPlayingViewMode) => set({ nowPlayingViewMode }),
      setFullscreenCoverAction: (fullscreenCoverAction) => set({ fullscreenCoverAction }),

      setCommunityThemeStoreUrl: (communityThemeStoreUrl) => set({ communityThemeStoreUrl }),

      setFontType: (fontType) => set({ fontType }),
      setFontName: (fontName) => set({ fontName }),
      setFontSize: (fontSize) => set({ fontSize }),

      setWaveformSeekbar: (waveformSeekbar) => set({ waveformSeekbar }),
      setNoRoundAlbumCover: (noRoundAlbumCover) => set({ noRoundAlbumCover }),
      setVanillaTilt: (vanillaTilt) => set({ vanillaTilt }),
      setTiltDistance: (tiltDistance) => set({ tiltDistance }),
      setTiltSpeed: (tiltSpeed) => set({ tiltSpeed }),

      setFullscreenVisualizer: (fullscreenVisualizer) => set({ fullscreenVisualizer }),
      setVisualizerStyle: (visualizerStyle) => set({ visualizerStyle }),
      setVisualizerMode: (visualizerMode) => set({ visualizerMode }),
      setVisualizerSmartIntensity: (visualizerSmartIntensity) => set({ visualizerSmartIntensity }),
      setVisualizerSensitivity: (visualizerSensitivity) => set({ visualizerSensitivity }),
      setVisualizerBrightness: (visualizerBrightness) => set({ visualizerBrightness }),
    }),
    { name: 'musik-streaming' }
  )
);
