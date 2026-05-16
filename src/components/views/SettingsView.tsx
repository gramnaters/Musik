'use client';

/**
 * Settings: general controls first, then home layout, seek bar presets, EQ, storage.
 */

import { useState, type ElementType } from 'react';
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
import { useHomeLayoutStore } from '@/stores/homeLayoutStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { toast } from '@/hooks/use-toast';
import type { Track } from '@/types/music';
import { APPLE_STOREFRONTS } from '@/lib/apple-storefronts';
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
  const { clearAddonSearchCache } = useAddonStore();
  const { catalogProvider, setCatalogProvider, appleStorefront, setAppleStorefront } = useMetadataStore();
  const {
    eqEnabled, setEqEnabled, eqPreset, setEqPreset, seekbarStyle, setSeekbarStyle,
  } = useAudioSettingsStore();
  const {
    showQuickPicks, setShowQuickPicks,
    showDiscover, setShowDiscover,
    showTopTen, setShowTopTen,
    showRecentlyPlayed, setShowRecentlyPlayed,
    showRecommendedArtists, setShowRecommendedArtists,
    showBrowseAll, setShowBrowseAll,
  } = useHomeLayoutStore();
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
    lyricsEnabled, setLyricsEnabled,
    lyricsDownloadWithTracks, setLyricsDownloadWithTracks,
    streamingQuality, setStreamingQuality,
    downloadQuality, setDownloadQuality,
    preferDolbyAtmos, setPreferDolbyAtmos,
    losslessContainer, setLosslessContainer,
    gaplessPlayback, setGaplessPlayback,
    replayGainMode, setReplayGainMode,
    replayGainPreamp, setReplayGainPreamp,
    malojaEnabled, setMalojaEnabled,
    malojaUrl, setMalojaUrl,
    malojaApiKey, setMalojaApiKey,
    romajiLyrics, setRomajiLyrics,
    bulkDownloadMethod, setBulkDownloadMethod,
    autoDownloadLikedTracks, setAutoDownloadLikedTracks,
    embedLyricsInFiles, setEmbedLyricsInFiles,
    embedCoverArtInFiles, setEmbedCoverArtInFiles,
    forceZipAsBlob, setForceZipAsBlob,
    writeArtistsSeparately, setWriteArtistsSeparately,
    coverArtSize, setCoverArtSize,
    filenameTemplate, setFilenameTemplate,
    folderTemplate, setFolderTemplate,
    downloadConcurrentCount, setDownloadConcurrentCount,
    language, setLanguage,
    showExplicit, setShowExplicit,
    accentColor, setAccentColor,
    glassEffect, setGlassEffect,
    normalizationEnabled, setNormalizationEnabled,
    crossfadeSeconds, setCrossfadeSeconds,
    theme, setTheme,
  } = useStreamingStore();

  const bandPreview = getEqBandPreview(eqEnabled, eqPreset);
  const [page, setPage] = useState<SettingsPage>('appearance');
  const [offlineMode, setOfflineMode] = useState(false);

  const [extUrl, setExtUrl] = useState('');
  const [extBusy, setExtBusy] = useState(false);
  const [extErr, setExtErr] = useState('');
  const [catalogTestBusy, setCatalogTestBusy] = useState(false);
  const [instanceDialogOpen, setInstanceDialogOpen] = useState(false);

  const [newInstanceUrl, setNewInstanceUrl] = useState('');
  const [newInstanceType, setNewInstanceType] = useState<'api' | 'streaming' | 'qobuz'>('api');




  const sidebarItems = [
    { id: 'appearance', label: 'Appearance', icon: Sparkles },
    { id: 'interface', label: 'Interface', icon: LayoutGrid },
    { id: 'scrobbling', label: 'Scrobbling', icon: Wifi },
    { id: 'audio', label: 'Audio', icon: Waves },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'instances', label: 'Instances', icon: Link2 },
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
          <div className="p-8 max-w-3xl space-y-8">
            {page === 'appearance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Theme & Personalization</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">App Theme</Label>
                        <p className="text-sm text-muted-foreground">System follows your device settings</p>
                      </div>
                      <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Accent Color</Label>
                        <p className="text-sm text-muted-foreground">Customize the primary UI color</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-6 h-6 rounded-full border border-white/20 shadow-sm" 
                          style={{ backgroundColor: accentColor }}
                        />
                        <Input 
                          type="color" 
                          value={accentColor} 
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-10 h-8 p-0 border-none bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Glass Effects</Label>
                        <p className="text-sm text-muted-foreground">Frosted glass transparency on UI elements</p>
                      </div>
                      <Switch checked={glassEffect} onCheckedChange={setGlassEffect} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Player Experience</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Layout Style</Label>
                        <p className="text-sm text-muted-foreground">Select the overall player aesthetic</p>
                      </div>
                      <Select value={playerTheme} onValueChange={(v) => setPlayerTheme(v as any)}>
                        <SelectTrigger className="w-40 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spotify">Spotify</SelectItem>
                          <SelectItem value="tidal">Tidal</SelectItem>
                          <SelectItem value="apple">Apple Music</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Progress Bar Style</Label>
                        <p className="text-sm text-muted-foreground">Animation and shape of the seekbar</p>
                      </div>
                      <Select value={seekbarStyle} onValueChange={(v) => setSeekbarStyle(v as any)}>
                        <SelectTrigger className="w-40 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEEKBAR_STYLES.map((s) => (
                            <SelectItem key={s} value={s}>{SEEKBAR_STYLE_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page === 'interface' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Language & Region</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">App Language</Label>
                        <p className="text-sm text-muted-foreground">Primary interface language</p>
                      </div>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ko">한국어</SelectItem>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Content Filtering</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Explicit Content</Label>
                        <p className="text-sm text-muted-foreground">Allow tracks with explicit lyrics</p>
                      </div>
                      <Switch checked={showExplicit} onCheckedChange={setShowExplicit} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Home Page Sections</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    {[
                      { label: 'Quick picks', value: showQuickPicks, set: setShowQuickPicks },
                      { label: 'Discover', value: showDiscover, set: setShowDiscover },
                      { label: 'Top 10', value: showTopTen, set: setShowTopTen },
                      { label: 'Recently played', value: showRecentlyPlayed, set: setShowRecentlyPlayed },
                      { label: 'Recommended artists', value: showRecommendedArtists, set: setShowRecommendedArtists },
                      { label: 'Browse all', value: showBrowseAll, set: setShowBrowseAll },
                    ].map(({ label, value, set }) => (
                      <div key={label} className="flex items-center justify-between p-4">
                        <span className="text-sm font-medium">{label}</span>
                        <Switch checked={value} onCheckedChange={set} />
                      </div>
                    ))}
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
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Streaming Quality</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(['LOW', 'HIGH', 'LOSSLESS', 'HI_RES'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => setStreamingQuality(q)}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-2xl border text-left transition-all",
                          streamingQuality === q 
                            ? "bg-primary/10 border-primary ring-1 ring-primary" 
                            : "bg-card/20 border-border/40 hover:bg-accent/20"
                        )}
                      >
                        <span className="text-sm font-bold">
                          {q === 'HI_RES' ? 'HD' : q === 'LOSSLESS' ? 'HIFI' : q.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                          {q === 'LOW' && '96 kbps • Data Saver'}
                          {q === 'HIGH' && '320 kbps • High Quality'}
                          {q === 'LOSSLESS' && '16-bit • CD Quality'}
                          {q === 'HI_RES' && '24-bit • Hi-Res Audio'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Playback Settings</h3>
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
                        <Label className="text-base">Audio Normalization</Label>
                        <p className="text-sm text-muted-foreground">Equalize volume across tracks</p>
                      </div>
                      <Switch checked={normalizationEnabled} onCheckedChange={setNormalizationEnabled} />
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-sm">Crossfade</Label>
                        <span className="text-xs font-mono text-primary">{crossfadeSeconds}s</span>
                      </div>
                      <Slider 
                        value={[crossfadeSeconds]} 
                        onValueChange={([v]) => setCrossfadeSeconds(v)}
                        max={12} 
                        step={1} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Dolby Atmos</Label>
                        <p className="text-sm text-muted-foreground">Prefer spatial audio when available</p>
                      </div>
                      <Switch checked={preferDolbyAtmos} onCheckedChange={setPreferDolbyAtmos} />
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

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-sm">Preamp Gain</Label>
                        <span className="text-xs font-mono text-primary">+{replayGainPreamp} dB</span>
                      </div>
                      <Slider 
                        value={[replayGainPreamp]} 
                        onValueChange={([v]) => setReplayGainPreamp(v)}
                        min={0}
                        max={12}
                        step={0.5}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/40 bg-card/20 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <SlidersHorizontal className="text-primary w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-base font-medium">Equalizer</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-tight">
                        {eqEnabled ? EQ_PRESET_LABELS[eqPreset] : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <Button variant={eqEnabled ? "secondary" : "outline"} size="sm" className="rounded-full px-6" onClick={() => setEqEnabled(!eqEnabled)}>
                    {eqEnabled ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            )}

            {page === 'downloads' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Quality & Format</h3>
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
                          <SelectItem value="LOW">Low (96k)</SelectItem>
                          <SelectItem value="HIGH">High (320k)</SelectItem>
                          <SelectItem value="LOSSLESS">HIFI (CD)</SelectItem>
                          <SelectItem value="HI_RES">HD (Hi-Res)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Lossless Container</Label>
                        <p className="text-sm text-muted-foreground">Format for FLAC/ALAC files</p>
                      </div>
                      <Select value={losslessContainer} onValueChange={(v) => setLosslessContainer(v as any)}>
                        <SelectTrigger className="w-32 h-9">
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

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Organization</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="p-4 space-y-2">
                      <Label className="text-sm">Filename Template</Label>
                      <Input 
                        value={filenameTemplate} 
                        onChange={(e) => setFilenameTemplate(e.target.value)}
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <Label className="text-sm">Folder Template</Label>
                      <Input 
                        value={folderTemplate} 
                        onChange={(e) => setFolderTemplate(e.target.value)}
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Write Artists Separately</Label>
                        <p className="text-sm text-muted-foreground">Save each artist in their own folder</p>
                      </div>
                      <Switch checked={writeArtistsSeparately} onCheckedChange={setWriteArtistsSeparately} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Advanced</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Bulk Download Method</Label>
                        <p className="text-sm text-muted-foreground">How albums are processed</p>
                      </div>
                      <Select value={bulkDownloadMethod} onValueChange={(v) => setBulkDownloadMethod(v as any)}>
                        <SelectTrigger className="w-40 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="browser">Browser Native</SelectItem>
                          <SelectItem value="zip">ZIP Client-Side</SelectItem>
                          <SelectItem value="server">Server-Side ZIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Force ZIP as Blob</Label>
                        <p className="text-sm text-muted-foreground">Better compatibility for large files</p>
                      </div>
                      <Switch checked={forceZipAsBlob} onCheckedChange={setForceZipAsBlob} />
                    </div>

                     <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Romaji Lyrics</Label>
                        <p className="text-sm text-muted-foreground">Transliterate non-latin lyrics</p>
                      </div>
                      <Switch checked={romajiLyrics} onCheckedChange={setRomajiLyrics} />
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Auto-download Liked</Label>
                        <p className="text-sm text-muted-foreground">Automatically download tracks you heart</p>
                      </div>
                      <Switch checked={autoDownloadLikedTracks} onCheckedChange={setAutoDownloadLikedTracks} />
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Embed Lyrics</Label>
                        <p className="text-sm text-muted-foreground">Include lyrics in downloaded files</p>
                      </div>
                      <Switch checked={embedLyricsInFiles} onCheckedChange={setEmbedLyricsInFiles} />
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Embed Artwork</Label>
                        <p className="text-sm text-muted-foreground">Include cover art in downloaded files</p>
                      </div>
                      <Switch checked={embedCoverArtInFiles} onCheckedChange={setEmbedCoverArtInFiles} />
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-sm">Cover Art Size</Label>
                        <span className="text-xs font-mono text-primary">{coverArtSize}px</span>
                      </div>
                      <Slider 
                        value={[coverArtSize]} 
                        onValueChange={([v]) => setCoverArtSize(v)}
                        min={300}
                        max={3000}
                        step={100}
                      />
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-sm">Concurrent Downloads</Label>
                        <span className="text-xs font-mono text-primary">{downloadConcurrentCount}</span>
                      </div>
                      <Slider 
                        value={[downloadConcurrentCount]} 
                        onValueChange={([v]) => setDownloadConcurrentCount(v)}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page === 'interface' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Home Layout</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    {[
                      { label: 'Quick Picks', value: showQuickPicks, set: setShowQuickPicks },
                      { label: 'Discover', value: showDiscover, set: setShowDiscover },
                      { label: 'Top 10', value: showTopTen, set: setShowTopTen },
                      { label: 'Recently Played', value: showRecentlyPlayed, set: setShowRecentlyPlayed },
                      { label: 'Recommended Artists', value: showRecommendedArtists, set: setShowRecommendedArtists },
                      { label: 'Browse All', value: showBrowseAll, set: setShowBrowseAll },
                    ].map(({ label, value, set }) => (
                      <div key={label} className="flex items-center justify-between p-4">
                        <Label className="text-base font-medium">{label}</Label>
                        <Switch checked={value} onCheckedChange={set} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Visual Effects</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Glassmorphism</Label>
                        <p className="text-sm text-muted-foreground">Apply blur and transparency to UI elements</p>
                      </div>
                      <Switch checked={glassEffect} onCheckedChange={setGlassEffect} />
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

            {page === 'audio' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Playback Quality</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 divide-y divide-border/20 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Streaming Quality</Label>
                        <p className="text-sm text-muted-foreground">Preferred bitrate for online playback</p>
                      </div>
                      <Select value={streamingQuality} onValueChange={(v) => setStreamingQuality(v as any)}>
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (128k)</SelectItem>
                          <SelectItem value="medium">Medium (256k)</SelectItem>
                          <SelectItem value="high">High (320k)</SelectItem>
                          <SelectItem value="lossless">Lossless (FLAC)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Prefer Dolby Atmos</Label>
                        <p className="text-sm text-muted-foreground">Use spatial audio when available</p>
                      </div>
                      <Switch checked={preferDolbyAtmos} onCheckedChange={setPreferDolbyAtmos} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Equalizer</h3>
                  <div className="rounded-2xl border border-border/40 bg-card/20 p-6 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">Enable Equalizer</Label>
                        <p className="text-sm text-muted-foreground">Apply custom sound profiling</p>
                      </div>
                      <Switch checked={eqEnabled} onCheckedChange={setEqEnabled} />
                    </div>
                    
                    {eqEnabled && (
                      <div className="space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(EQ_PRESET_LABELS) as EqPreset[]).map((key) => (
                            <button
                              key={key}
                              onClick={() => setEqPreset(key)}
                              className={cn(
                                "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                                eqPreset === key 
                                  ? "bg-primary border-primary text-primary-foreground shadow-[0_2px_10px_rgba(var(--primary),0.3)]" 
                                  : "bg-background/50 border-border/60 text-muted-foreground hover:border-primary/50 hover:text-primary"
                              )}
                            >
                              {EQ_PRESET_LABELS[key]}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between items-end h-32 gap-2 px-4 pt-2">
                          {bandPreview.map((h, i) => (
                            <div key={i} className="flex-1 h-full flex flex-col justify-end gap-2 group">
                              <div className="w-full bg-primary/10 rounded-full relative overflow-hidden h-full">
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h * 100}%` }}
                                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/80 to-primary rounded-full"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {page === 'instances' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instances & Connections</h3>
                  <Button size="sm" variant="outline" className="h-8 rounded-full gap-2 text-xs" onClick={() => setInstanceDialogOpen(true)}>
                    <Plus size={14} /> Add Custom
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {/* API Instances */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Metadata API</h4>
                    <div className="rounded-2xl border border-border/40 bg-card/20 overflow-hidden divide-y divide-border/20 shadow-sm">
                      {apiInstances.map((inst) => (
                        <div key={inst.url} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              selectedApiUrl === inst.url ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "bg-zinc-600"
                            )} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{inst.url}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">v{inst.version || '?'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant={selectedApiUrl === inst.url ? "secondary" : "ghost"} 
                              className="h-8 rounded-lg text-xs"
                              onClick={() => setSelectedUrl('api', inst.url)}
                            >
                              {selectedApiUrl === inst.url ? 'Active' : 'Select'}
                            </Button>
                            {inst.isUser && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeInstance('api', inst.url)}>
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Streaming Instances */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Streaming API</h4>
                    <div className="rounded-2xl border border-border/40 bg-card/20 overflow-hidden divide-y divide-border/20 shadow-sm">
                      {streamingInstances.map((inst) => (
                        <div key={inst.url} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              selectedStreamingUrl === inst.url ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "bg-zinc-600"
                            )} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{inst.url}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">v{inst.version || '?'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant={selectedStreamingUrl === inst.url ? "secondary" : "ghost"} 
                              className="h-8 rounded-lg text-xs"
                              onClick={() => setSelectedUrl('streaming', inst.url)}
                            >
                              {selectedStreamingUrl === inst.url ? 'Active' : 'Select'}
                            </Button>
                            {inst.isUser && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeInstance('streaming', inst.url)}>
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Credentials */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Provider Credentials</h4>
                    <div className="rounded-2xl border border-border/40 bg-card/20 p-4 space-y-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tidal Auth Token</Label>
                          <Input 
                            value={tidalToken || ''} 
                            onChange={(e) => setTidalToken(e.target.value)}
                            placeholder="Token" 
                            type="password"
                            className="h-9 bg-background/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Qobuz User Token</Label>
                          <Input 
                            value={qobuzToken || ''} 
                            onChange={(e) => setQobuzToken(e.target.value)}
                            placeholder="Token" 
                            type="password"
                            className="h-9 bg-background/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Deezer Token (arl)</Label>
                          <Input 
                            value={deezerToken || ''} 
                            onChange={(e) => setDeezerToken(e.target.value)}
                            placeholder="ARL" 
                            type="password"
                            className="h-9 bg-background/50"
                          />
                        </div>
                      </div>
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
                            <SelectItem value="tidal">Tidal (Official)</SelectItem>
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
                    </div>
                    <div className="p-4">
                      <Button 
                        variant="outline" 
                        className="w-full rounded-xl gap-2 font-bold h-11 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all"
                        disabled={catalogTestBusy}
                        onClick={async () => {
                          setCatalogTestBusy(true);
                          try {
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

                  <div className="pt-4 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-spotify-green to-cyan-500 flex items-center justify-center shadow-lg">
                       <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
                          <path d="M2 14 L2 5 L6.5 11 L9 7.5 L11.5 11 L16 5 L16 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold">musik</h3>
                      <p className="text-xs text-muted-foreground">Version {MUSIK_VERSION}</p>
                      <p className="text-xs text-muted-foreground">Build {MUSIK_BUILD}</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full max-w-[200px]">
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPage('help')}>
                        Help & FAQ
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setPage('about')}>
                        About musik
                      </Button>
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
              </div>
            )}
          </div>
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
    </div>
  );
}
