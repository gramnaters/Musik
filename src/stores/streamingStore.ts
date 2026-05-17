import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StreamingInstance {
  url: string;
  name?: string;
  type: 'api' | 'streaming' | 'qobuz';
  isUser?: boolean;
  version?: string;
}

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

  // Audio Quality
  streamingQuality: 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES';
  downloadQuality: 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES';
  preferDolbyAtmos: boolean;
  losslessContainer: 'flac' | 'alac';

  // Downloads Extended
  bulkDownloadMethod: 'browser' | 'zip' | 'server';
  autoDownloadLikedTracks: boolean;
  embedLyricsInFiles: boolean;
  embedCoverArtInFiles: boolean;
  forceZipAsBlob: boolean;
  writeArtistsSeparately: boolean;
  coverArtSize: number;
  filenameTemplate: string;
  folderTemplate: string;
  downloadConcurrentCount: number;

  // Playback
  gaplessPlayback: boolean;
  normalizationEnabled: boolean;
  crossfadeSeconds: number;
  replayGainMode: 'off' | 'track' | 'album';
  replayGainPreamp: number;

  // Interface & Appearance
  language: string;
  showExplicit: boolean;
  accentColor: string;
  glassEffect: boolean;
  theme: 'system' | 'dark' | 'light';
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

  // Quality
  setStreamingQuality: (q: StreamingState['streamingQuality']) => void;
  setDownloadQuality: (q: StreamingState['downloadQuality']) => void;
  setPreferDolbyAtmos: (v: boolean) => void;
  setLosslessContainer: (c: StreamingState['losslessContainer']) => void;

  // Downloads Extended
  setBulkDownloadMethod: (method: StreamingState['bulkDownloadMethod']) => void;
  setAutoDownloadLikedTracks: (v: boolean) => void;
  setEmbedLyricsInFiles: (v: boolean) => void;
  setEmbedCoverArtInFiles: (v: boolean) => void;
  setForceZipAsBlob: (v: boolean) => void;
  setWriteArtistsSeparately: (v: boolean) => void;
  setCoverArtSize: (size: number) => void;
  setFilenameTemplate: (template: string) => void;
  setFolderTemplate: (template: string) => void;
  setDownloadConcurrentCount: (count: number) => void;

  // Playback
  setGaplessPlayback: (enabled: boolean) => void;
  setNormalizationEnabled: (enabled: boolean) => void;
  setCrossfadeSeconds: (seconds: number) => void;
  setReplayGainMode: (mode: StreamingState['replayGainMode']) => void;
  setReplayGainPreamp: (db: number) => void;

  // Interface & Appearance
  setLanguage: (lang: string) => void;
  setShowExplicit: (show: boolean) => void;
  setAccentColor: (color: string) => void;
  setGlassEffect: (enabled: boolean) => void;
  setTheme: (theme: StreamingState['theme']) => void;
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

      streamingQuality: 'LOSSLESS',
      downloadQuality: 'LOSSLESS',
      preferDolbyAtmos: false,
      losslessContainer: 'flac',

      bulkDownloadMethod: 'browser',
      autoDownloadLikedTracks: false,
      embedLyricsInFiles: true,
      embedCoverArtInFiles: true,
      forceZipAsBlob: false,
      writeArtistsSeparately: false,
      coverArtSize: 1200,
      filenameTemplate: '{artist} - {title}',
      folderTemplate: '{artist}/{album}',
      downloadConcurrentCount: 3,

      gaplessPlayback: true,
      normalizationEnabled: true,
      crossfadeSeconds: 0,
      replayGainMode: 'track',
      replayGainPreamp: 3,

      language: 'en',
      showExplicit: true,
      accentColor: '#1DB954',
      glassEffect: true,
      theme: 'dark',

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

      setStreamingQuality: (streamingQuality) => set({ streamingQuality }),
      setDownloadQuality: (downloadQuality) => set({ downloadQuality }),
      setPreferDolbyAtmos: (preferDolbyAtmos) => set({ preferDolbyAtmos }),
      setLosslessContainer: (losslessContainer) => set({ losslessContainer }),

      setBulkDownloadMethod: (bulkDownloadMethod) => set({ bulkDownloadMethod }),
      setAutoDownloadLikedTracks: (autoDownloadLikedTracks) => set({ autoDownloadLikedTracks }),
      setEmbedLyricsInFiles: (embedLyricsInFiles) => set({ embedLyricsInFiles }),
      setEmbedCoverArtInFiles: (embedCoverArtInFiles) => set({ embedCoverArtInFiles }),
      setForceZipAsBlob: (forceZipAsBlob) => set({ forceZipAsBlob }),
      setWriteArtistsSeparately: (writeArtistsSeparately) => set({ writeArtistsSeparately }),
      setCoverArtSize: (coverArtSize) => set({ coverArtSize }),
      setFilenameTemplate: (filenameTemplate) => set({ filenameTemplate }),
      setFolderTemplate: (folderTemplate) => set({ folderTemplate }),
      setDownloadConcurrentCount: (downloadConcurrentCount) => set({ downloadConcurrentCount }),

      setGaplessPlayback: (gaplessPlayback) => set({ gaplessPlayback }),
      setNormalizationEnabled: (normalizationEnabled) => set({ normalizationEnabled }),
      setCrossfadeSeconds: (crossfadeSeconds) => set({ crossfadeSeconds }),
      setReplayGainMode: (replayGainMode) => set({ replayGainMode }),
      setReplayGainPreamp: (replayGainPreamp) => set({ replayGainPreamp }),

      setLanguage: (language) => set({ language }),
      setShowExplicit: (showExplicit) => set({ showExplicit }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setGlassEffect: (glassEffect) => set({ glassEffect }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'musik-streaming' }
  )
);
