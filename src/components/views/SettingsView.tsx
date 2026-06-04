'use client';

/**
 * Settings: general controls first, then home layout, seek bar presets, EQ, storage.
 */

import { useState, useEffect, useMemo, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { useAddonStore } from '@/stores/addonStore';
import {
  EQ_PRESET_LABELS,
  SEEKBAR_STYLE_LABELS,
  SEEKBAR_STYLES,
  useAudioSettingsStore,
} from '@/stores/audioSettingsStore';
import { useStreamingStore } from '@/stores/streamingStore';
import type { EqPreset, SeekbarStyle } from '@/stores/audioSettingsStore';
import { useMetadataStore } from '@/stores/metadataStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { toast } from '@/hooks/use-toast';
import type { Track } from '@/types/music';
import { APPLE_STOREFRONTS } from '@/lib/apple-storefronts';
import AddonsView from '@/components/views/AddonsView';
import { metadataSearchUrl } from '@/lib/catalog-api';
import { getEqBandPreview } from '@/lib/equalizer-graph';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronRight,
  ChevronLeft,
  Wifi,
  HardDrive,
  Link2,
  Loader2,
  X,
  Trash2,
  AlertCircle,
  Download,
  Library,
  ShieldCheck,
  Info,
  SlidersHorizontal,
  Sparkles,
  LayoutGrid,
  Waves,
  ListMusic,
  Plus,
  Check,
  Cloud,
  RotateCcw,
  EyeOff,
  GripVertical,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';


const MUSIK_VERSION = '0.2.0';
const MUSIK_BUILD = '2026.05.11';

type SettingsPage =
  | 'appearance'
  | 'interface'
  | 'scrobbling'
  | 'audio'
  | 'downloads'
  | 'instances'
  | 'system'
  | 'metadata'
  | 'externalImport'
  | 'storage'
  | 'help'
  | 'about';

function SettingsSectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-6 pb-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  iconBg,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: ElementType;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-3.5 px-4 py-3.5 bg-card/60 transition-colors text-left',
        'border-b border-border/30 last:border-b-0',
        danger && 'hover:bg-destructive/5',
        onPress && 'hover:bg-accent/40'
      )}
      onClick={onPress}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 border border-white/10',
          danger ? 'bg-red-950/50 border-red-500/25' : iconBg || 'bg-zinc-900/90'
        )}
      >
        <Icon size={18} strokeWidth={1.75} className={danger ? 'text-red-200' : 'text-white'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', danger ? 'text-destructive' : 'text-foreground')}>{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {onPress && <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />}
    </button>
  );
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return <div className="mx-4 rounded-xl overflow-hidden border border-border/40 bg-card/40 mt-2">{children}</div>;
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-4 border-b border-border/30 flex-shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={18} /> Settings
      </button>
      <span className="text-muted-foreground">/</span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </div>
  );
}

export default function SettingsView() {
  const { setActiveView, setSelectedPlaylistId, navigateTo, playerTheme, setPlayerTheme } = useUIStore();
  const {
    clearAddonSearchCache,
    sources,
    addSource,
    removeSource,
    restoreAllModuleSources,
    dismissModuleSource,
    hiddenModuleSourceIds,
  } = useAddonStore();
  const { catalogProvider, setCatalogProvider, appleStorefront, setAppleStorefront } = useMetadataStore();
  const { appleAnimatedArt, setAppleAnimatedArt } = useUIStore();
  const {
    eqEnabled, setEqEnabled, eqPreset, setEqPreset, seekbarStyle, setSeekbarStyle,
  } = useAudioSettingsStore();
  const { clearRecentlyPlayed, importExternalPlaylist } = useLibraryStore();
  const {
    apiInstances, streamingInstances, qobuzInstances,
    selectedApiUrl, selectedStreamingUrl, selectedQobuzUrl,
    setSelectedUrl, addInstance, removeInstance,
    tidalToken, setTidalToken,
    qobuzToken, setQobuzToken,
    deezerToken, setDeezerToken,
    lastfmEnabled, setLastfmEnabled,
    lastfmUsername, lastfmSessionKey, setLastfmSession,
    lastfmScrobblePercentage, setLastfmScrobblePercentage,
    lastfmLoveOnLike, setLastfmLoveOnLike,
    listenbrainzEnabled, setListenbrainzEnabled,
    listenbrainzToken, setListenbrainzToken,
    malojaEnabled, setMalojaEnabled,
    malojaUrl, setMalojaUrl,
    malojaApiKey, setMalojaApiKey,
    lyricsEnabled, setLyricsEnabled,
    lyricsDownloadWithTracks, setLyricsDownloadWithTracks,
    streamingQuality, setStreamingQuality,
    downloadQuality, setDownloadQuality,
    binauralAudio, setBinauralAudio,
    bulkDownloadMethod, setBulkDownloadMethod,
    autoDownloadLikedTracks, setAutoDownloadLikedTracks,
    embedLyricsInFiles, setEmbedLyricsInFiles,
    embedCoverArtInFiles, setEmbedCoverArtInFiles,
    downloadLyrics, setDownloadLyrics,
    writeArtistsSeparately, setWriteArtistsSeparately,
    coverArtSize, setCoverArtSize,
    filenameTemplate, setFilenameTemplate,
    folderTemplate, setFolderTemplate,
    downloadConcurrentCount, setDownloadConcurrentCount,
    language, setLanguage,
    showExplicit, setShowExplicit,
    accentColor, setAccentColor,
    glassEffect, setGlassEffect,
    theme, setTheme,
    showQualityBadges, setShowQualityBadges,
    useAlbumYear, setUseAlbumYear,
    monoAudio, setMonoAudio,
    exponentialVolume, setExponentialVolume,
    playbackSpeed, setPlaybackSpeed,
    preservePitch, setPreservePitch,
    gaplessPlayback, setGaplessPlayback,
    replayGainMode, setReplayGainMode,
    replayGainPreamp, setReplayGainPreamp,
    losslessContainer, setLosslessContainer,
    romajiLyrics, setRomajiLyrics,
    generateM3U, setGenerateM3U,
    generateM3U8, setGenerateM3U8,
    generateCUE, setGenerateCUE,
    generateNFO, setGenerateNFO,
    generateJSON, setGenerateJSON,
    relativePaths, setRelativePaths,
    separateDiscs, setSeparateDiscs,
    includeCoverFile, setIncludeCoverFile,
    albumBackground, setAlbumBackground,
    dynamicColors, setDynamicColors,
    cdAlbumCover, setCdAlbumCover,
    showRecommendedSongs, setShowRecommendedSongs,
    showRecommendedAlbums, setShowRecommendedAlbums,
    showRecommendedArtists, setShowRecommendedArtists,
    showJumpBackIn, setShowJumpBackIn,
    showEditorsPicks, setShowEditorsPicks,
    shuffleEditorsPicks, setShuffleEditorsPicks,
    editorsPicksSource, setEditorsPicksSource,
    compactArtists, setCompactArtists,
    artistBanners, setArtistBanners,
    compactAlbums, setCompactAlbums,
    sidebarHome, setSidebarHome,
    sidebarLibrary, setSidebarLibrary,
    sidebarRecent, setSidebarRecent,
    sidebarSettings, setSidebarSettings,
    sidebarDonate, setSidebarDonate,
    sidebarAbout, setSidebarAbout,
    sidebarDiscord, setSidebarDiscord,
    sidebarParties, setSidebarParties,
    sidebarGithub, setSidebarGithub,
    closeModalsOnNav, setCloseModalsOnNav,
    interceptBackModals, setInterceptBackModals,
    nowPlayingViewMode, setNowPlayingViewMode,
    fullscreenCoverAction, setFullscreenCoverAction,
    fontType, setFontType,
    fontName, setFontName,
    fontSize, setFontSize,
    waveformSeekbar, setWaveformSeekbar,
    noRoundAlbumCover, setNoRoundAlbumCover,
    vanillaTilt, setVanillaTilt,
    tiltDistance, setTiltDistance,
    tiltSpeed, setTiltSpeed,
    fullscreenVisualizer, setFullscreenVisualizer,
    visualizerStyle, setVisualizerStyle,
    visualizerMode, setVisualizerMode,
    visualizerSmartIntensity, setVisualizerSmartIntensity,
    visualizerSensitivity, setVisualizerSensitivity,
    visualizerBrightness, setVisualizerBrightness,
  } = useStreamingStore();

  const bandPreview = getEqBandPreview(eqEnabled, eqPreset);
  const [page, setPage] = useState<SettingsPage>('appearance');
  const [offlineMode, setOfflineMode] = useState(false);

  const [extUrl, setExtUrl] = useState('');
  const [extBusy, setExtBusy] = useState(false);
  const [extErr, setExtErr] = useState('');
  const [catalogTestBusy, setCatalogTestBusy] = useState(false);
  const [instanceDialogOpen, setInstanceDialogOpen] = useState(false);
  const [sourcesDialogOpen, setSourcesDialogOpen] = useState(false);

  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [showAddSourceForm, setShowAddSourceForm] = useState(false);

  const [newInstanceUrl, setNewInstanceUrl] = useState('');
  const [newInstanceType, setNewInstanceType] = useState<'api' | 'streaming' | 'qobuz'>('api');




  const sidebarItems = [
    { id: 'appearance', label: 'Appearance', icon: Sparkles },
    { id: 'interface', label: 'Interface', icon: LayoutGrid },
    { id: 'scrobbling', label: 'Scrobbling', icon: Wifi },
    { id: 'audio', label: 'Audio', icon: Waves },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'instances', label: 'Connections', icon: Link2 },
    { id: 'metadata', label: 'Metadata', icon: ListMusic },
    { id: 'system', label: 'System', icon: SlidersHorizontal },
  ] as const;

  return (
    <div className="flex flex-col h-full min-h-0 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 md:px-6 py-5 flex-shrink-0 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Settings Horizontal Tabs */}
        <div className="border-b border-sidebar-border/30 flex px-6 md:px-12 overflow-x-auto no-scrollbar gap-10 shrink-0 bg-background/50 backdrop-blur-xl sticky top-0 z-10">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                "relative flex items-center h-16 text-sm font-bold tracking-tight transition-all whitespace-nowrap",
                page === item.id 
                  ? "text-primary scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:scale-105"
              )}
            >
              <item.icon size={16} className={cn("mr-2", page === item.id ? "text-primary" : "text-muted-foreground")} />
              {item.label}
              {page === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-[-4px] right-[-4px] h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.4)]" 
                />
              )}
            </button>
          ))}
        </div>

        {/* Settings Content Area */}
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar bg-background">
          {page === 'instances' ? (
            <AddonsView />
          ) : (
          <div className="p-8 pb-28 max-w-3xl space-y-8">
            {page === 'appearance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Theme */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Theme</h3>
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    {[
                      { key: 'system', label: 'System', color: 'bg-gradient-to-br from-orange-500 to-yellow-400' },
                      { key: 'black', label: 'Black', color: 'bg-black border border-white/10' },
                      { key: 'white', label: 'White', color: 'bg-white border border-zinc-200' },
                      { key: 'dark', label: 'Dark', color: 'bg-zinc-900 border border-white/10' },
                      { key: 'ocean', label: 'Ocean', color: 'bg-gradient-to-br from-cyan-600 to-blue-800' },
                      { key: 'purple', label: 'Purple', color: 'bg-gradient-to-br from-purple-600 to-pink-600' },
                    ].map(t => (
                      <button key={t.key} onClick={() => setTheme(t.key as any)} className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
                        theme === t.key ? "ring-2 ring-primary scale-105" : "hover:ring-1 hover:ring-white/20"
                      )}>
                        <div className={cn("w-10 h-10 rounded-lg", t.color)} />
                        <span className="text-[10px] font-medium text-muted-foreground">{t.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {[
                      { key: 'forest', label: 'Forest', color: 'bg-gradient-to-br from-green-700 to-emerald-500' },
                      { key: 'mocha', label: 'Mocha', color: 'bg-gradient-to-br from-amber-800 to-yellow-700' },
                      { key: 'machiatto', label: 'Machiatto', color: 'bg-gradient-to-br from-rose-700 to-pink-400' },
                      { key: 'frappe', label: 'Frappé', color: 'bg-gradient-to-br from-blue-300 to-cyan-200' },
                      { key: 'latte', label: 'Latte', color: 'bg-gradient-to-br from-amber-200 to-orange-100' },
                      { key: 'custom', label: 'Custom', color: 'bg-gradient-to-br from-gray-400 to-gray-600' },
                    ].map(t => (
                      <button key={t.key} onClick={() => setTheme(t.key as any)} className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
                        theme === t.key ? "ring-2 ring-primary scale-105" : "hover:ring-1 hover:ring-white/20"
                      )}>
                        <div className={cn("w-10 h-10 rounded-lg", t.color)} />
                        <span className="text-[10px] font-medium text-muted-foreground">{t.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Playbar Style</Label>
                    <div className="flex gap-3">
                      {(['tidal', 'apple', 'spotify'] as const).map(s => (
                        <button key={s} onClick={() => setPlayerTheme(s)} className={cn(
                          "px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all",
                          playerTheme === s ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                        )}>{s}</button>
                      ))}
                    </div>
                  </div>
                  
                </div>

                {/* Font */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Font</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <Label className="text-sm">Font Type</Label>
                      <Select value={fontType} onValueChange={(v) => setFontType(v as any)}>
                        <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preset">Preset</SelectItem>
                          <SelectItem value="google">Google Fonts</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="upload">Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {fontType === 'preset' && (
                      <div className="flex items-center justify-between p-4">
                        <Label className="text-sm">Font Name</Label>
                        <Select value={fontName} onValueChange={(v) => setFontName(v)}>
                          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Inter','System','Roboto','Poppins','Nunito','Montserrat','Lato'].map(f => (
                              <SelectItem key={f} value={f === 'Inter' ? 'Inter' : f}>{f}{f === 'Inter' ? ' (Default)' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {fontType === 'google' && (
                      <div className="p-4">
                        <Label className="text-sm">Google Font Name</Label>
                        <Input value={fontName} onChange={(e) => setFontName(e.target.value)} placeholder="e.g. Roboto" className="mt-2 h-8 text-xs" />
                      </div>
                    )}
                    {fontType === 'url' && (
                      <div className="p-4">
                        <Label className="text-sm">Font CSS URL</Label>
                        <Input value={fontName} onChange={(e) => setFontName(e.target.value)} placeholder="https://fonts.googleapis.com/css2?..." className="mt-2 h-8 text-xs" />
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Font Size</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" min={50} max={200} step={1} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-16 h-7 text-xs text-center" />
                          <span className="text-xs text-muted-foreground">%</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setFontSize(100)}>
                            <RotateCcw size={14} />
                          </Button>
                        </div>
                      </div>
                      <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={50} max={200} step={1} />
                    </div>
                  </div>
                </div>

                {/* Album Art */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Album Art</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Waveform Seekbar</Label>
                        <p className="text-sm text-muted-foreground">Visual waveform in progress bar (experimental)</p>
                      </div>
                      <Switch checked={waveformSeekbar} onCheckedChange={setWaveformSeekbar} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Album Cover Background</Label>
                        <p className="text-sm text-muted-foreground">Use blurred album cover as page background</p>
                      </div>
                      <Switch checked={albumBackground} onCheckedChange={setAlbumBackground} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Dynamic Colors</Label>
                        <p className="text-sm text-muted-foreground">Change accent based on playing track's album art</p>
                      </div>
                      <Switch checked={dynamicColors} onCheckedChange={setDynamicColors} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">No Round Album Cover</Label>
                        <p className="text-sm text-muted-foreground">Disable rounded corners on album cover in fullscreen</p>
                      </div>
                      <Switch checked={noRoundAlbumCover} onCheckedChange={setNoRoundAlbumCover} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Vanilla Tilt Album Cover</Label>
                        <p className="text-sm text-muted-foreground">3D tilt effect on album cover in fullscreen</p>
                      </div>
                      <Switch checked={vanillaTilt} onCheckedChange={setVanillaTilt} />
                    </div>
                    {vanillaTilt && (
                      <>
                        <div className="flex items-center justify-between p-4">
                          <Label className="text-sm">Tilt Distance</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" min={1} max={30} step={1} value={tiltDistance} onChange={(e) => setTiltDistance(Number(e.target.value))} className="w-16 h-7 text-xs text-center" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4">
                          <Label className="text-sm">Tilt Speed</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" min={50} max={1000} step={10} value={tiltSpeed} onChange={(e) => setTiltSpeed(Number(e.target.value))} className="w-16 h-7 text-xs text-center" />
                            <span className="text-xs text-muted-foreground">ms</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Visualizer */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Visualizer</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Full-screen Visualizer</Label>
                        <p className="text-sm text-muted-foreground">Enable visualizer in fullscreen mode</p>
                      </div>
                      <Switch checked={fullscreenVisualizer} onCheckedChange={setFullscreenVisualizer} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <Label className="text-sm">Visualizer Style</Label>
                      <Select value={visualizerStyle} onValueChange={(v) => setVisualizerStyle(v as any)}>
                        <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kawarp">Kawarp</SelectItem>
                          <SelectItem value="bars">Bars</SelectItem>
                          <SelectItem value="circular">Circular</SelectItem>
                          <SelectItem value="wave">Wave</SelectItem>
                          <SelectItem value="particles">Particles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <Label className="text-sm">Visualizer Mode</Label>
                      <Select value={visualizerMode} onValueChange={(v) => setVisualizerMode(v as any)}>
                        <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid Background</SelectItem>
                          <SelectItem value="overlay">Overlay</SelectItem>
                          <SelectItem value="behind">Behind Cover</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Smart Intensity Switching</Label>
                        <p className="text-sm text-muted-foreground">Auto-adjust visualizer intensity based on song energy</p>
                      </div>
                      <Switch checked={visualizerSmartIntensity} onCheckedChange={setVisualizerSmartIntensity} />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Visualizer Sensitivity</Label>
                        <span className="text-xs text-muted-foreground">{visualizerSensitivity}%</span>
                      </div>
                      <Slider value={[visualizerSensitivity]} onValueChange={([v]) => setVisualizerSensitivity(v)} min={0} max={200} step={1} />
                      <p className="text-[11px] text-red-400/80 font-medium leading-relaxed">Warning: High sensitivity may cause flashing lights and rapid motion, which can trigger seizures in people with photosensitive epilepsy.</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Visualizer Brightness</Label>
                        <span className="text-xs text-muted-foreground">{visualizerBrightness}%</span>
                      </div>
                      <Slider value={[visualizerBrightness]} onValueChange={([v]) => setVisualizerBrightness(v)} min={0} max={200} step={1} />
                    </div>
                  </div>
                </div>

                {/* CD */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/20">
                  <div className="space-y-0.5">
                    <Label className="text-base">CD Album Cover</Label>
                    <p className="text-sm text-muted-foreground">Spin album cover and add CD hole in fullscreen</p>
                  </div>
                  <Switch checked={cdAlbumCover} onCheckedChange={setCdAlbumCover} />
                </div>
              </div>
            )}

            {page === 'interface' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Home Page */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Home Page</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    {[
                      { label: 'Show Recommended Songs', desc: 'Show recommended songs section on home', value: showRecommendedSongs, setter: setShowRecommendedSongs },
                      { label: 'Show Recommended Albums', desc: 'Show recommended albums on home', value: showRecommendedAlbums, setter: setShowRecommendedAlbums },
                      { label: 'Show Recommended Artists', desc: 'Show recommended artists on home', value: showRecommendedArtists, setter: setShowRecommendedArtists },
                      { label: 'Show Jump Back In', desc: 'Show recent albums, playlists and mixes on home', value: showJumpBackIn, setter: setShowJumpBackIn },
                      { label: "Show Editor's Picks", desc: 'Show curated album selections on home', value: showEditorsPicks, setter: setShowEditorsPicks },
                    ].map(({ label, desc, value, setter }) => (
                      <div key={label} className="flex items-center justify-between p-4">
                        <div className="space-y-0.5">
                          <Label className="text-base">{label}</Label>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                        <Switch checked={value} onCheckedChange={setter} />
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Shuffle Editor's Picks</Label>
                        <p className="text-sm text-muted-foreground">Randomize editor's picks order on each load</p>
                      </div>
                      <Switch checked={shuffleEditorsPicks} onCheckedChange={setShuffleEditorsPicks} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Editor's Picks Source</Label>
                        <p className="text-sm text-muted-foreground">Which curated selections to display</p>
                      </div>
                      <Select value={editorsPicksSource || 'current'} onValueChange={(v) => setEditorsPicksSource(v as any)}>
                        <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">Current</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Layout */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Layout</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Compact Artists</Label>
                        <p className="text-sm text-muted-foreground">Show artist cards in compact horizontal layout</p>
                      </div>
                      <Switch checked={compactArtists} onCheckedChange={setCompactArtists} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Artist Banners</Label>
                        <p className="text-sm text-muted-foreground">Display video banners on artist pages</p>
                      </div>
                      <Switch checked={artistBanners} onCheckedChange={setArtistBanners} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Compact Albums</Label>
                        <p className="text-sm text-muted-foreground">Show album cards in compact horizontal layout</p>
                      </div>
                      <Switch checked={compactAlbums} onCheckedChange={setCompactAlbums} />
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Navigation</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Close Modals on Navigation</Label>
                        <p className="text-sm text-muted-foreground">Close lyrics/queue panels when navigating</p>
                      </div>
                      <Switch checked={closeModalsOnNav} onCheckedChange={setCloseModalsOnNav} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Intercept Back to Close Modals</Label>
                        <p className="text-sm text-muted-foreground">Press back to close modal, press again to navigate</p>
                      </div>
                      <Switch checked={interceptBackModals} onCheckedChange={setInterceptBackModals} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Now Playing View Mode</Label>
                        <p className="text-sm text-muted-foreground">What shows when clicking album art</p>
                      </div>
                      <Select value={nowPlayingViewMode} onValueChange={(v) => setNowPlayingViewMode(v as any)}>
                        <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fullscreen">Fullscreen Mode</SelectItem>
                          <SelectItem value="mini">Mini Player</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Fullscreen Cover Click Action</Label>
                        <p className="text-sm text-muted-foreground">Action when clicking cover in fullscreen</p>
                      </div>
                      <Select value={fullscreenCoverAction} onValueChange={(v) => setFullscreenCoverAction(v as any)}>
                        <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exit">Exit fullscreen mode</SelectItem>
                          <SelectItem value="lyrics">Show lyrics</SelectItem>
                          <SelectItem value="queue">Show queue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Sidebar</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    {[
                      { label: 'Home', value: sidebarHome, setter: setSidebarHome },
                      { label: 'Library', value: sidebarLibrary, setter: setSidebarLibrary },
                      { label: 'Recent', value: sidebarRecent, setter: setSidebarRecent },
                      { label: 'Donate', value: sidebarDonate, setter: setSidebarDonate },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <GripVertical size={14} className="text-muted-foreground/40" />
                          <Label className="text-sm">{label}</Label>
                        </div>
                        <Switch checked={value} onCheckedChange={setter} />
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <GripVertical size={14} className="text-muted-foreground/40" />
                        <Label className="text-sm">Settings</Label>
                      </div>
                      <Switch checked={true} disabled />
                    </div>
                  </div>
                  
                </div>
              </div>
            )}

            {page === 'scrobbling' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Last.fm</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base flex items-center gap-2">
                          Status {lastfmSessionKey && <Check className="text-green-500 w-4 h-4" />}
                        </Label>
                        <p className="text-sm text-muted-foreground">Scrobble tracks to your Last.fm account</p>
                      </div>
                      <Switch checked={lastfmEnabled} onCheckedChange={setLastfmEnabled} />
                    </div>
                    {lastfmEnabled && (
                      <div className="p-4 space-y-4 bg-accent/5">
                        {lastfmSessionKey ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Logged in as <strong>{lastfmUsername}</strong></span>
                            <Button variant="ghost" size="sm" onClick={() => setLastfmSession(null, null)}>Logout</Button>
                          </div>
                        ) : (
                          <Button className="w-full rounded-xl" onClick={() => window.open(`https://www.last.fm/api/auth/?api_key=YOUR_KEY&cb=${window.location.origin}/callback`)}>
                            Connect Last.fm
                          </Button>
                        )}
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-xs">Scrobble Percentage</Label>
                            <span className="text-xs font-mono">{lastfmScrobblePercentage}%</span>
                          </div>
                          <Slider 
                            value={[lastfmScrobblePercentage]} 
                            onValueChange={([v]) => setLastfmScrobblePercentage(v)}
                            max={100} 
                            step={1} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">ListenBrainz</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Status</Label>
                        <p className="text-sm text-muted-foreground">Scrobble tracks to ListenBrainz</p>
                      </div>
                      <Switch checked={listenbrainzEnabled} onCheckedChange={setListenbrainzEnabled} />
                    </div>
                    {listenbrainzEnabled && (
                      <div className="p-4 bg-accent/5">
                        <Input 
                          placeholder="User Token" 
                          value={listenbrainzToken || ''} 
                          onChange={(e) => setListenbrainzToken(e.target.value)}
                          type="password"
                          className="h-9"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Maloja (Self-Hosted)</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Status</Label>
                        <p className="text-sm text-muted-foreground">Scrobble to your own Maloja instance</p>
                      </div>
                      <Switch checked={malojaEnabled} onCheckedChange={setMalojaEnabled} />
                    </div>
                    {malojaEnabled && (
                      <div className="p-4 space-y-3 bg-accent/5">
                        <Input 
                          placeholder="Instance URL (https://...)" 
                          value={malojaUrl || ''} 
                          onChange={(e) => setMalojaUrl(e.target.value)}
                          className="h-9"
                        />
                        <Input 
                          placeholder="API Key" 
                          value={malojaApiKey || ''} 
                          onChange={(e) => setMalojaApiKey(e.target.value)}
                          type="password"
                          className="h-9"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {page === 'audio' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Streaming Quality */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Streaming Quality</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Preferred Bitrate</Label>
                        <p className="text-sm text-muted-foreground">Quality for online playback streams</p>
                      </div>
                      <Select value={streamingQuality} onValueChange={(v) => setStreamingQuality(v as any)}>
                        <SelectTrigger className="w-48 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (Adaptive)</SelectItem>
                          <SelectItem value="hi_res_lossless">Hi-Res Lossless (24-bit)</SelectItem>
                          <SelectItem value="lossless">Lossless (16-bit)</SelectItem>
                          <SelectItem value="aac_320">AAC 320kbps</SelectItem>
                          <SelectItem value="aac_96">AAC 96kbps</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Display */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Display</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Show Quality Badges</Label>
                        <p className="text-sm text-muted-foreground">Display HD badge for Hi-Res tracks</p>
                      </div>
                      <Switch checked={showQualityBadges} onCheckedChange={setShowQualityBadges} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Album Release Year</Label>
                        <p className="text-sm text-muted-foreground">Show original album year instead of track date</p>
                      </div>
                      <Switch checked={useAlbumYear} onCheckedChange={setUseAlbumYear} />
                    </div>
                  </div>
                </div>

                {/* Playback */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Playback</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Gapless Playback</Label>
                        <p className="text-sm text-muted-foreground">Seamless transitions between tracks</p>
                      </div>
                      <Switch checked={gaplessPlayback} onCheckedChange={setGaplessPlayback} />
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">ReplayGain Mode</Label>
                        <p className="text-sm text-muted-foreground">Automatic volume normalization</p>
                      </div>
                      <Select value={replayGainMode} onValueChange={(v) => setReplayGainMode(v as any)}>
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">Off</SelectItem>
                          <SelectItem value="track">Track</SelectItem>
                          <SelectItem value="album">Album</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">ReplayGain Pre-Amp</Label>
                        <p className="text-sm text-muted-foreground">Additional gain after normalization</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={12}
                          step={0.5}
                          value={replayGainPreamp}
                          onChange={(e) => setReplayGainPreamp(Number(e.target.value))}
                          className="w-16 h-9 text-xs text-center"
                        />
                        <span className="text-xs text-muted-foreground">dB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio Effects */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Audio Effects</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Mono Audio</Label>
                        <p className="text-sm text-muted-foreground">Combine left and right channels</p>
                      </div>
                      <Switch checked={monoAudio} onCheckedChange={setMonoAudio} />
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Exponential Volume</Label>
                        <p className="text-sm text-muted-foreground">Logarithmic volume curve for finer low-volume control</p>
                      </div>
                      <Switch checked={exponentialVolume} onCheckedChange={setExponentialVolume} />
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-sm">Playback Speed</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0.5}
                            max={3}
                            step={0.1}
                            value={playbackSpeed}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (v >= 0.5 && v <= 3) setPlaybackSpeed(v);
                            }}
                            className="w-16 h-7 text-xs text-center"
                          />
                          <span className="text-xs font-mono text-primary">x</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-accent/50"
                            onClick={() => setPlaybackSpeed(1)}
                          >
                            <RotateCcw size={14} />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[playbackSpeed * 10]}
                        onValueChange={([v]) => setPlaybackSpeed(v / 10)}
                        min={5}
                        max={30}
                        step={1}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Preserve Pitch</Label>
                        <p className="text-sm text-muted-foreground">Keep original pitch when changing speed</p>
                      </div>
                      <Switch checked={preservePitch} onCheckedChange={setPreservePitch} />
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Binaural / Spatial DSP</Label>
                        <p className="text-sm text-muted-foreground">Immersive 3D spatial audio rendering</p>
                      </div>
                      <Switch checked={binauralAudio} onCheckedChange={setBinauralAudio} />
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">EQ Studio</Label>
                        <p className="text-sm text-muted-foreground">Fine-tune frequencies with graphic equalizer</p>
                      </div>
                      <Switch checked={eqEnabled} onCheckedChange={setEqEnabled} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page === 'downloads' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Quality & Format */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Quality &amp; Format</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Download Quality</Label>
                        <p className="text-sm text-muted-foreground">Preferred quality for saved tracks</p>
                      </div>
                      <Select value={downloadQuality} onValueChange={(v) => setDownloadQuality(v as any)}>
                        <SelectTrigger className="w-40 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Lossless</div>
                          <SelectItem value="lossless_24">Hi-Res Lossless (24-bit)</SelectItem>
                          <SelectItem value="lossless_16">Lossless (16-bit)</SelectItem>
                          <div className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-bold mt-1">AAC</div>
                          <SelectItem value="aac_320">AAC 320kbps</SelectItem>
                          <SelectItem value="aac_256">AAC 256kbps</SelectItem>
                          <SelectItem value="aac_96">AAC 96kbps</SelectItem>
                          <div className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-bold mt-1">MP3</div>
                          <SelectItem value="mp3_320">MP3 320kbps</SelectItem>
                          <SelectItem value="mp3_256">MP3 256kbps</SelectItem>
                          <SelectItem value="mp3_128">MP3 128kbps</SelectItem>
                          <div className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-bold mt-1">OGG</div>
                          <SelectItem value="ogg_320">OGG 320kbps</SelectItem>
                          <SelectItem value="ogg_256">OGG 256kbps</SelectItem>
                          <SelectItem value="ogg_128">OGG 128kbps</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Lossless Container</Label>
                        <p className="text-sm text-muted-foreground">Format for FLAC/ALAC files</p>
                      </div>
                      <Select value={losslessContainer} onValueChange={(v) => setLosslessContainer(v as any)}>
                        <SelectTrigger className="w-24 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flac">FLAC</SelectItem>
                          <SelectItem value="alac">ALAC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Download Method */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Method</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Bulk Download Method</Label>
                        <p className="text-sm text-muted-foreground">How albums are processed</p>
                      </div>
                      <Select value={bulkDownloadMethod} onValueChange={(v) => setBulkDownloadMethod(v as any)}>
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zip">ZIP Archive</SelectItem>
                          <SelectItem value="individual">Individual Files</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Write Artists Separately</Label>
                        <p className="text-sm text-muted-foreground">Write multiple artists as separate metadata tags</p>
                      </div>
                      <Switch checked={writeArtistsSeparately} onCheckedChange={setWriteArtistsSeparately} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Separate Discs</Label>
                        <p className="text-sm text-muted-foreground">Put tracks in Disc folders for multi-disc albums</p>
                      </div>
                      <Switch checked={separateDiscs} onCheckedChange={setSeparateDiscs} />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Content</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Download Lyrics</Label>
                        <p className="text-sm text-muted-foreground">Include .lrc files in downloads</p>
                      </div>
                      <Switch checked={downloadLyrics} onCheckedChange={setDownloadLyrics} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Romaji Lyrics</Label>
                        <p className="text-sm text-muted-foreground">Convert Japanese lyrics to Romaji</p>
                      </div>
                      <Switch checked={romajiLyrics} onCheckedChange={setRomajiLyrics} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Embed Lyrics</Label>
                        <p className="text-sm text-muted-foreground">Include lyrics inside audio file tags</p>
                      </div>
                      <Switch checked={embedLyricsInFiles} onCheckedChange={setEmbedLyricsInFiles} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Embed Cover Art</Label>
                        <p className="text-sm text-muted-foreground">Include cover art inside audio file tags</p>
                      </div>
                      <Switch checked={embedCoverArtInFiles} onCheckedChange={setEmbedCoverArtInFiles} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Include Cover File</Label>
                        <p className="text-sm text-muted-foreground">Include cover.jpg in download folder</p>
                      </div>
                      <Switch checked={includeCoverFile} onCheckedChange={setIncludeCoverFile} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Auto-Download Liked</Label>
                        <p className="text-sm text-muted-foreground">Automatically download tracks you heart</p>
                      </div>
                      <Switch checked={autoDownloadLikedTracks} onCheckedChange={setAutoDownloadLikedTracks} />
                    </div>
                  </div>
                </div>

                {/* Playlist Files */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Playlist Files</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Generate M3U</Label>
                        <p className="text-sm text-muted-foreground">Include M3U playlist in downloads</p>
                      </div>
                      <Switch checked={generateM3U} onCheckedChange={setGenerateM3U} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Generate M3U8</Label>
                        <p className="text-sm text-muted-foreground">Include M3U8 playlist</p>
                      </div>
                      <Switch checked={generateM3U8} onCheckedChange={setGenerateM3U8} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Generate CUE</Label>
                        <p className="text-sm text-muted-foreground">Include CUE sheet</p>
                      </div>
                      <Switch checked={generateCUE} onCheckedChange={setGenerateCUE} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Generate NFO</Label>
                        <p className="text-sm text-muted-foreground">Include NFO file</p>
                      </div>
                      <Switch checked={generateNFO} onCheckedChange={setGenerateNFO} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Generate JSON</Label>
                        <p className="text-sm text-muted-foreground">Include JSON metadata file</p>
                      </div>
                      <Switch checked={generateJSON} onCheckedChange={setGenerateJSON} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Relative Paths</Label>
                        <p className="text-sm text-muted-foreground">Use relative paths in playlist files</p>
                      </div>
                      <Switch checked={relativePaths} onCheckedChange={setRelativePaths} />
                    </div>
                  </div>
                </div>

                {/* Templates */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Templates</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="p-4 space-y-2">
                      <Label className="text-sm">Filename Template</Label>
                      <Input value={filenameTemplate} onChange={(e) => setFilenameTemplate(e.target.value)} className="h-8 text-xs font-mono" />
                      <p className="text-[11px] text-muted-foreground">Variables: {'{discNumber}'}, {'{trackNumber}'}, {'{artist}'}, {'{title}'}, {'{album}'}</p>
                    </div>
                    <div className="p-4 space-y-2">
                      <Label className="text-sm">Folder Template</Label>
                      <Input value={folderTemplate} onChange={(e) => setFolderTemplate(e.target.value)} className="h-8 text-xs font-mono" />
                      <p className="text-[11px] text-muted-foreground">Variables: {'{albumTitle}'}, {'{albumArtist}'}, {'{year}'}</p>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Cover Art Size</Label>
                        <p className="text-sm text-muted-foreground">Maximum resolution of embedded cover art</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={300}
                          max={3000}
                          step={100}
                          value={coverArtSize}
                          onChange={(e) => setCoverArtSize(Number(e.target.value))}
                          className="w-20 h-8 text-xs text-center"
                        />
                        <span className="text-xs text-muted-foreground">px</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Concurrent Downloads</Label>
                        <p className="text-sm text-muted-foreground">Maximum parallel download tasks</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          step={1}
                          value={downloadConcurrentCount}
                          onChange={(e) => setDownloadConcurrentCount(Number(e.target.value))}
                          className="w-16 h-8 text-xs text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page === 'scrobbling' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Last.fm</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Last.fm Scrobbling</Label>
                        <p className="text-sm text-muted-foreground">Scrobble tracks to your Last.fm profile</p>
                      </div>
                      <Switch checked={lastfmEnabled} onCheckedChange={setLastfmEnabled} />
                    </div>
                    {lastfmEnabled && (
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Username</Label>
                          <Input value={lastfmUsername || ''} readOnly className="h-9 bg-background/50" />
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.open('https://www.last.fm/api/auth?api_key=...', '_blank')}>
                          {lastfmSessionKey ? 'Re-authenticate' : 'Connect Last.fm'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">ListenBrainz</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">ListenBrainz</Label>
                        <p className="text-sm text-muted-foreground">Submit listens to MusicBrainz</p>
                      </div>
                      <Switch checked={listenbrainzEnabled} onCheckedChange={setListenbrainzEnabled} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page === 'metadata' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Catalog Source</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-medium">Provider</Label>
                          <p className="text-sm text-muted-foreground">Source for metadata & search</p>
                        </div>
                        <Select value={catalogProvider} onValueChange={(v) => setCatalogProvider(v as any)}>
                          <SelectTrigger className="w-48 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apple">Apple Music</SelectItem>
                            <SelectItem value="spotify">Spotify (API)</SelectItem>
                            <SelectItem value="monochrome">Tidal</SelectItem>
                            <SelectItem value="qobuz">Qobuz</SelectItem>
                            <SelectItem value="addon">Addon (Community)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Storefront / Market</p>
                          <p className="text-xs text-muted-foreground">Region specific content results</p>
                        </div>
                        <Select value={appleStorefront ?? 'US'} onValueChange={setAppleStorefront}>
                          <SelectTrigger className="w-48 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {APPLE_STOREFRONTS.map((c) => (
                              <SelectItem key={c.code} value={c.code}>{c.label} ({c.code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between px-4 pb-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Apple Animated Art</p>
                          <p className="text-xs text-muted-foreground">Animated album art background on Apple Music player</p>
                        </div>
                        <Switch checked={appleAnimatedArt === 'on'} onCheckedChange={(v) => setAppleAnimatedArt(v ? 'on' : 'off')} />
                      </div>
                    </div>
                    <div className="p-4">
                      <Button 
                        variant="outline" 
                        className="w-full rounded-xl gap-2 font-bold h-11 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all"
                        disabled={catalogTestBusy}
                        onClick={async () => {
                          setCatalogTestBusy(true);
                          try {
                            if (catalogProvider === 'addon') {
                              const home = await useAddonStore.getState().getHome();
                              if (home) toast({ title: 'Connection Successful', description: 'Addon catalog is working properly.' });
                              else throw new Error('No catalog returned');
                              return;
                            }
                            const res = await fetch(metadataSearchUrl({ q: 'daft punk', provider: catalogProvider, appleCountry: appleStorefront ?? 'US' }));
                            if (res.ok) toast({ title: 'Connection Successful', description: `${catalogProvider} metadata is working properly.` });
                            else throw new Error('API Response Error');
                          } catch (e) {
                            toast({ title: 'Connection Failed', variant: 'destructive' });
                          } finally {
                            setCatalogTestBusy(false);
                          }
                        }}
                      >
                        {catalogTestBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />}
                        Test Catalog Connectivity
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">File Handling</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Auto-Download Liked</Label>
                        <p className="text-sm text-muted-foreground">Automatically download tracks you heart</p>
                      </div>
                      <Switch checked={autoDownloadLikedTracks} onCheckedChange={setAutoDownloadLikedTracks} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page === 'system' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">System</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground uppercase tracking-widest font-semibold px-1">Catalog Settings</Label>
                    <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Default Region</p>
                          <p className="text-xs text-muted-foreground">Catalog storefront for Apple/Spotify</p>
                        </div>
                        <Select value={appleStorefront ?? 'US'} onValueChange={(v) => setAppleStorefront(v)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLE_STOREFRONTS.slice(0, 10).map((c) => (
                              <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground uppercase tracking-widest font-semibold px-1">Management</Label>
                    <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden divide-y divide-border/20">
                      <button onClick={() => clearRecentlyPlayed()} className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 text-destructive transition-colors">
                        <div className="flex items-center gap-3">
                          <Trash2 size={18} />
                          <span className="text-sm font-medium">Clear recently played</span>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                      <button onClick={() => clearAddonSearchCache()} className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 text-destructive transition-colors">
                        <div className="flex items-center gap-3">
                          <Trash2 size={18} />
                          <span className="text-sm font-medium">Clear search cache</span>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-border/20 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 px-2">
                    <div className="flex flex-col gap-2 w-full max-w-[200px] order-2 md:order-1">
                      <Button variant="outline" size="sm" className="rounded-full justify-start gap-3 hover:bg-primary/5" onClick={() => setPage('help')}>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Help & FAQ
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-full justify-start gap-3" onClick={() => setPage('about')}>
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        About musik
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 order-1 md:order-2 text-right">
                      <div className="hidden md:block">
                        <h3 className="font-black text-2xl tracking-tighter italic bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">musik</h3>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest opacity-70">
                          v{MUSIK_VERSION} • {MUSIK_BUILD}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl group">
                         <svg width="24" height="24" viewBox="0 0 18 18" fill="none" className="group-hover:scale-110 transition-transform duration-300">
                            <path d="M2 14 L2 5 L6.5 11 L9 7.5 L11.5 11 L16 5 L16 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                      </div>
                      <div className="md:hidden text-center">
                        <h3 className="font-bold">musik</h3>
                        <p className="text-xs text-muted-foreground">Version {MUSIK_VERSION}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page === 'about' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Application Information</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 p-6 space-y-6 shadow-sm">
                       <h2 className="text-2xl font-bold">musik</h2>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                         musik is a high-performance, modular music player built for audiophiles. 
                         It supports multiple streaming providers, high-resolution audio, and a custom module system.
                       </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Project Information</h3>
                      <div className="rounded-xl border border-border/40 bg-card/40 divide-y divide-border/20 overflow-hidden">
                        <div className="flex justify-between p-4">
                          <span className="text-sm">Version</span>
                          <span className="text-sm font-mono">{MUSIK_VERSION}</span>
                        </div>
                        <div className="flex justify-between p-4">
                          <span className="text-sm">Build</span>
                          <span className="text-sm font-mono">{MUSIK_BUILD}</span>
                        </div>
                        <div className="flex justify-between p-4">
                          <span className="text-sm">License</span>
                          <span className="text-sm font-mono">MIT</span>
                        </div>
                      </div>
                </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">File Generation</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium">Generate M3U</span>
                      <Switch checked={generateM3U} onCheckedChange={setGenerateM3U} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium">Generate M3U8</span>
                      <Switch checked={generateM3U8} onCheckedChange={setGenerateM3U8} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium">Generate CUE</span>
                      <Switch checked={generateCUE} onCheckedChange={setGenerateCUE} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium">Generate NFO</span>
                      <Switch checked={generateNFO} onCheckedChange={setGenerateNFO} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium">Generate JSON</span>
                      <Switch checked={generateJSON} onCheckedChange={setGenerateJSON} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium">Relative Paths</span>
                      <Switch checked={relativePaths} onCheckedChange={setRelativePaths} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium">Separate Discs</span>
                      <Switch checked={separateDiscs} onCheckedChange={setSeparateDiscs} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-medium">Include Cover File</span>
                      <Switch checked={includeCoverFile} onCheckedChange={setIncludeCoverFile} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </ScrollArea>
      </div>

      <Dialog open={instanceDialogOpen} onOpenChange={setInstanceDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/20">
          <DialogHeader>
            <DialogTitle>Add Custom Instance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newInstanceType} onValueChange={(v) => setNewInstanceType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">Metadata API</SelectItem>
                  <SelectItem value="streaming">Streaming API</SelectItem>
                  <SelectItem value="qobuz">Qobuz Proxy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Instance URL</Label>
              <Input 
                placeholder="https://..." 
                value={newInstanceUrl} 
                onChange={(e) => setNewInstanceUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                className="flex-1 rounded-full" 
                disabled={!newInstanceUrl.startsWith('http')}
                onClick={() => {
                  addInstance(newInstanceType, newInstanceUrl);
                  setNewInstanceUrl('');
                  setInstanceDialogOpen(false);
                }}
              >
                Save Instance
              </Button>
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setInstanceDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sourcesDialogOpen} onOpenChange={(open) => {
        setSourcesDialogOpen(open);
        if (!open) {
          setShowAddSourceForm(false);
          setNewSourceName('');
          setNewSourceUrl('');
        }
      }}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md max-h-[85vh] flex flex-col rounded-[24px] p-6 overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold tracking-tight text-white">Manage Module Sources</DialogTitle>
            <p className="text-xs text-white/50">Add or remove module registries for search and playback.</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 custom-scrollbar">
            {showAddSourceForm ? (
              <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-sm font-bold text-white">Add Custom Source</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-white/50">Display Name</Label>
                    <Input
                      value={newSourceName}
                      onChange={(e) => setNewSourceName(e.target.value)}
                      placeholder="My Catalog"
                      className="bg-black/50 border-white/10 rounded-xl h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-white/50">Registry JSON URL</Label>
                    <Input
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder="https://example.com/index.json"
                      className="bg-black/50 border-white/10 rounded-xl h-10 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 text-xs"
                      disabled={!newSourceName.trim() || !newSourceUrl.trim()}
                      onClick={() => {
                        addSource(newSourceName.trim(), newSourceUrl.trim());
                        setNewSourceName('');
                        setNewSourceUrl('');
                        setShowAddSourceForm(false);
                        toast({
                          title: "Source Added",
                          description: `Successfully added catalog "${newSourceName}"`
                        });
                      }}
                    >
                      Save
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="rounded-full hover:bg-white/5 text-white/80 h-10 text-xs px-4" 
                      onClick={() => setShowAddSourceForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowAddSourceForm(true)}
                className="w-full h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs gap-2"
              >
                <Plus size={16} /> Add Custom Source
              </Button>
            )}

            {hiddenModuleSourceIds.length > 0 && (
              <Button
                variant="outline"
                className="w-full h-11 rounded-full border-white/10 hover:bg-white/5 text-white font-bold text-xs gap-2"
                onClick={() => restoreAllModuleSources()}
              >
                <RotateCcw size={14} /> Restore Hidden Catalogs
              </Button>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">Active Registries</p>
              {sources.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">No active sources.</p>
              ) : (
                <div className="space-y-2.5">
                  {sources.map((s) => {
                    const isHidden = hiddenModuleSourceIds.includes(s.id);
                    if (isHidden) return null;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-sm font-bold truncate text-white">{s.name}</p>
                          <p className="text-xs text-white/40 truncate mt-0.5">
                            {s.registryUrl || "Built-in default catalog"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-full shrink-0"
                          onClick={() => {
                            if (s.builtIn) {
                              dismissModuleSource(s.id);
                            } else {
                              removeSource(s.id);
                            }
                            toast({
                              title: s.builtIn ? "Catalog Hidden" : "Source Removed",
                              description: `Successfully removed/hid catalog "${s.name}"`
                            });
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 pt-4 border-t border-white/10 flex justify-end">
            <Button
              className="rounded-full bg-white hover:bg-white/90 text-black font-bold h-10 px-6 text-xs"
              onClick={() => setSourcesDialogOpen(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
