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
} from 'lucide-react';

const MUSIK_VERSION = '0.2.0';
const MUSIK_BUILD = '2026.05.11';

type SettingsPage =
  | 'main'
  | 'equalizer'
  | 'homelayout'
  | 'metadata'
  | 'externalImport'
  | 'storage'
  | 'downloads'
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
  const { eqEnabled, setEqEnabled, eqPreset, setEqPreset, seekbarStyle, setSeekbarStyle } = useAudioSettingsStore();
  const {
    showQuickPicks,
    setShowQuickPicks,
    showDiscover,
    setShowDiscover,
    showTopTen,
    setShowTopTen,
    showRecentlyPlayed,
    setShowRecentlyPlayed,
    showRecommendedArtists,
    setShowRecommendedArtists,
    showBrowseAll,
    setShowBrowseAll,
  } = useHomeLayoutStore();
  const { clearRecentlyPlayed, importExternalPlaylist } = useLibraryStore();

  const bandPreview = getEqBandPreview(eqEnabled, eqPreset);
  const [page, setPage] = useState<SettingsPage>('main');
  const [offlineMode, setOfflineMode] = useState(false);

  const [extUrl, setExtUrl] = useState('');
  const [extBusy, setExtBusy] = useState(false);
  const [extErr, setExtErr] = useState('');
  const [catalogTestBusy, setCatalogTestBusy] = useState(false);

  if (page === 'metadata') {
    return (
      <div className="flex flex-col h-full min-h-0 bg-black text-white">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setPage('main')}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
          >
            <ChevronLeft size={18} /> Settings
          </button>
          <span className="text-zinc-600">/</span>
          <span className="text-sm font-semibold">Metadata provider</span>
        </div>
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <div className="px-4 py-6 pb-32 max-w-lg mx-auto space-y-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Catalog provider</p>
              <p className="text-sm text-zinc-500 mt-1">
                Search (tabs) and Home rails use this source. Apple uses the public iTunes Search API (storefront
                below). Spotify uses the Web API and needs server credentials only when Spotify is selected.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-[#1c1c1e] px-4 py-4">
              <Label className="text-xs text-zinc-500">Provider</Label>
              <Select
                value={catalogProvider}
                onValueChange={(v) => setCatalogProvider(v as 'spotify' | 'apple')}
              >
                <SelectTrigger className="mt-2 w-full h-11 rounded-xl bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectItem value="apple">Apple Music (iTunes Search)</SelectItem>
                  <SelectItem value="spotify">Spotify (Web API)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-[#1c1c1e] px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Catalog region</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Apple <code className="text-zinc-400">country</code> / Spotify{' '}
                    <code className="text-zinc-400">market</code> (ISO 3166-1 alpha-2).
                  </p>
                </div>
                <Select value={appleStorefront ?? 'US'} onValueChange={(v) => setAppleStorefront(v)}>
                  <SelectTrigger className="w-full sm:w-[220px] h-10 rounded-xl bg-zinc-900 border-zinc-700 text-white shrink-0">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-64">
                    {APPLE_STOREFRONTS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-zinc-700 bg-zinc-900/80 text-white hover:bg-zinc-800"
                disabled={catalogTestBusy}
                onClick={async () => {
                  setCatalogTestBusy(true);
                  try {
                    const q = 'daft punk';
                    const res = await fetch(
                      metadataSearchUrl({
                        q,
                        provider: catalogProvider,
                        limit: 5,
                        appleCountry: appleStorefront ?? 'US',
                      })
                    );
                    const data = (await res.json()) as {
                      tracks?: unknown[];
                      error?: string;
                      detail?: string;
                    };
                    const n = data.tracks?.length ?? 0;
                    if (res.ok && n > 0 && !data.error) {
                      toast({
                        title: 'Connection OK',
                        description: `${catalogProvider === 'apple' ? 'Apple' : 'Spotify'} returned ${n} sample tracks.`,
                      });
                    } else if (data.error === 'missing_spotify_credentials' && catalogProvider === 'spotify') {
                      toast({
                        title: 'Spotify not configured',
                        description:
                          'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the server, then restart.',
                        variant: 'destructive',
                      });
                    } else if (data.error === 'spotify_http') {
                      toast({
                        title: 'Spotify request failed',
                        description: data.detail || 'HTTP error — check credentials and API access.',
                        variant: 'destructive',
                      });
                    } else {
                      toast({
                        title: 'Test failed',
                        description:
                          data.detail ||
                          data.error ||
                          (n === 0 ? 'No tracks returned — try another region or provider.' : `HTTP ${res.status}`),
                        variant: 'destructive',
                      });
                    }
                  } catch (e: unknown) {
                    toast({
                      title: 'Test failed',
                      description: e instanceof Error ? e.message : 'Network error',
                      variant: 'destructive',
                    });
                  } finally {
                    setCatalogTestBusy(false);
                  }
                }}
              >
                {catalogTestBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing…
                  </>
                ) : (
                  'Test connection'
                )}
              </Button>
              <p className="text-[11px] text-zinc-600">
                Runs the same catalog search route used by Search and Home.
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (page === 'externalImport') {
    return (
      <div className="flex flex-col h-full min-h-0 bg-black text-white">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setPage('main')}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
          >
            <ChevronLeft size={18} /> Settings
          </button>
          <span className="text-zinc-600">/</span>
          <span className="text-sm font-semibold">Import external</span>
        </div>
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <div className="px-4 py-6 pb-32 max-w-lg mx-auto space-y-4">
            <div>
              <Label className="text-zinc-500 text-xs">Spotify playlist or profile link</Label>
              <Input
                value={extUrl}
                onChange={(e) => setExtUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                className="mt-1.5 bg-zinc-900 border-zinc-700 rounded-xl text-white h-11"
              />
            </div>
            <Button
              type="button"
              disabled={extBusy || !extUrl.trim()}
              className="w-full rounded-xl bg-zinc-700 text-white hover:bg-zinc-600 h-11 font-medium"
              onClick={async () => {
                setExtBusy(true);
                setExtErr('');
                try {
                  const res = await fetch('/api/import/spotify-playlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: extUrl }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.hint || data.error || 'Import failed');
                  const tracks: Track[] = (data.tracks || []).map(
                    (t: {
                      id: string;
                      title: string;
                      artist: string;
                      album?: string;
                      albumCover?: string;
                      duration?: number;
                      streamURL?: string;
                    }) => ({
                      id: t.id,
                      title: t.title,
                      artist: t.artist,
                      album: t.album,
                      albumCover: t.albumCover,
                      duration: t.duration,
                      streamURL: t.streamURL,
                    })
                  );
                  const plId = importExternalPlaylist(data.name || 'Spotify import', tracks);
                  toast({ title: 'Playlist imported', description: `${tracks.length} tracks` });
                  setExtUrl('');
                  setPage('main');
                  setSelectedPlaylistId(plId);
                  navigateTo('library');
                } catch (e: unknown) {
                  setExtErr(e instanceof Error ? e.message : 'Import failed');
                } finally {
                  setExtBusy(false);
                }
              }}
            >
              {extBusy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Scan'}
            </Button>
            {extErr && <p className="text-sm text-red-400">{extErr}</p>}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-500">OR</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              id="csv-import-settings"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const text = await file.text();
                const lines = text.split(/\r?\n/).filter(Boolean);
                if (!lines.length) return;
                const header = lines[0].split(',').map((s) => s.trim().toLowerCase());
                const ti = header.findIndex((h) => h.includes('title') || h === 'name' || h === 'track');
                const ai = header.findIndex((h) => h.includes('artist'));
                const rows = lines.slice(1);
                const tracks: Track[] = [];
                rows.forEach((line, idx) => {
                  const cols = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
                  const title = cols[ti >= 0 ? ti : 0] || `Track ${idx + 1}`;
                  const artist = cols[ai >= 0 ? ai : 1] || 'Unknown';
                  tracks.push({
                    id: `csv_${Date.now()}_${idx}`,
                    title,
                    artist,
                    albumCover: `https://picsum.photos/seed/${encodeURIComponent(title + artist)}/300/300`,
                    streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                  });
                });
                if (!tracks.length) {
                  toast({ title: 'CSV empty', variant: 'destructive' });
                  return;
                }
                const plId = importExternalPlaylist(file.name.replace(/\.csv$/i, '') || 'CSV import', tracks);
                toast({ title: 'CSV imported', description: `${tracks.length} rows` });
                setPage('main');
                setSelectedPlaylistId(plId);
                navigateTo('library');
              }}
            />
            <label
              htmlFor="csv-import-settings"
              className="flex w-full h-11 cursor-pointer items-center justify-center rounded-xl border border-white/25 text-sm font-medium text-white hover:bg-white/5"
            >
              Import from .CSV
            </label>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (page === 'storage') {
    return (
      <div className="flex flex-col h-full min-h-0 bg-background">
        <BackHeader title="Storage & cache" onBack={() => setPage('main')} />
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <div className="pb-32">
            <SettingsSectionHeader title="Library" />
            <SettingsGroup>
              <SettingsRow
                icon={AlertCircle}
                title="Clear recently played"
                subtitle="Remove recently played history from this device"
                danger
                onPress={() => {
                  if (typeof window !== 'undefined' && window.confirm('Clear recently played history?')) {
                    clearRecentlyPlayed();
                  }
                }}
              />
            </SettingsGroup>

            <SettingsSectionHeader title="Addons" />
            <SettingsGroup>
              <SettingsRow
                icon={Trash2}
                title="Clear addon search cache"
                subtitle="Clears in-memory search results only"
                danger
                onPress={() => {
                  if (typeof window !== 'undefined' && window.confirm('Clear addon search cache?')) {
                    clearAddonSearchCache();
                  }
                }}
              />
            </SettingsGroup>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (page === 'downloads') {
    return (
      <div className="flex flex-col h-full min-h-0 bg-background">
        <BackHeader title="Downloads" onBack={() => setPage('main')} />
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <p className="px-4 py-8 text-sm text-muted-foreground">Offline downloads are not enabled in this build.</p>
        </ScrollArea>
      </div>
    );
  }

  if (page === 'about') {
    return (
      <div className="flex flex-col h-full min-h-0 bg-sidebar text-sidebar-foreground">
        <BackHeader title="About" onBack={() => setPage('main')} />
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <div className="px-6 pb-32 pt-8 max-w-md mx-auto flex flex-col items-center text-center space-y-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg,#1DB954 0%,#0ea5e9 100%)',
                boxShadow: '0 2px 8px rgba(29,185,84,0.3)',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M2 14 L2 5 L6.5 11 L9 7.5 L11.5 11 L16 5 L16 14"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">musik</h2>
              <p className="text-sm text-muted-foreground mt-1">
                v{MUSIK_VERSION} · {MUSIK_BUILD}
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A modular web music player with catalog search, playlists, and multiple player themes.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2 text-left">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-spotify-green" />
              <span>Third-party streams depend on upstream services. Prefer official sources when possible.</span>
            </p>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (page === 'equalizer') {
    return (
      <div className="flex flex-col h-full min-h-0 bg-background">
        <BackHeader title="Equalizer" onBack={() => setPage('main')} />
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <div className="pb-32 px-4 pt-4 space-y-4 max-w-lg mx-auto">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Web Audio three-band EQ. Disable for flat output.
            </p>
            <SettingsGroup>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable EQ</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Shaping applies to playback</p>
                </div>
                <Switch checked={eqEnabled} onCheckedChange={setEqEnabled} />
              </div>
              <div className="px-4 py-3 space-y-2 border-b border-border/30">
                <Label className="text-xs text-muted-foreground">Presets</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(EQ_PRESET_LABELS) as EqPreset[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={!eqEnabled}
                      onClick={() => setEqPreset(key)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        eqPreset === key
                          ? 'border-white/45 bg-white/10 text-foreground'
                          : 'border-border/40 text-muted-foreground hover:border-white/25 hover:bg-white/[0.04]',
                        !eqEnabled && 'opacity-40 pointer-events-none'
                      )}
                    >
                      {EQ_PRESET_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-end h-28 sm:h-32 gap-1.5 px-4 py-4">
                {bandPreview.map((h, i) => (
                  <div
                    key={`${eqPreset}-${i}`}
                    className="flex flex-col items-center gap-2 flex-1 h-full justify-end min-w-0"
                  >
                    <div className="h-full w-full max-w-[10px] mx-auto rounded-full bg-muted/25 relative overflow-hidden">
                      <div
                        className={cn(
                          'absolute bottom-0 left-0 right-0 rounded-full transition-[height] duration-500 ease-out',
                          eqEnabled ? 'bg-gradient-to-t from-spotify-green to-cyan-400' : 'bg-muted-foreground/25'
                        )}
                        style={{ height: `${Math.round(h * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SettingsGroup>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (page === 'homelayout') {
    return (
      <div className="flex flex-col h-full min-h-0 bg-background">
        <BackHeader title="Home page layout" onBack={() => setPage('main')} />
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <div className="pb-32 pt-2">
            <SettingsGroup>
              {[
                { label: 'Quick picks', value: showQuickPicks, set: setShowQuickPicks },
                { label: 'Discover', value: showDiscover, set: setShowDiscover },
                { label: 'Top 10', value: showTopTen, set: setShowTopTen },
                { label: 'Recently played', value: showRecentlyPlayed, set: setShowRecentlyPlayed },
                { label: 'Recommended artists', value: showRecommendedArtists, set: setShowRecommendedArtists },
                { label: 'Browse all', value: showBrowseAll, set: setShowBrowseAll },
              ].map(({ label, value, set }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-3.5 border-b border-border/30 last:border-b-0"
                >
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <Switch checked={value} onCheckedChange={set} />
                </div>
              ))}
            </SettingsGroup>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 md:px-6 py-5 flex-shrink-0 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
        <div className="pb-32 space-y-1">
          <SettingsSectionHeader title="General" />
          <SettingsGroup>
            <SettingsRow
              icon={Library}
              title="Library"
              subtitle="Playlists and saved tracks"
              onPress={() => setActiveView('library')}
            />
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border/30">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 border border-white/10 bg-zinc-900/90">
                  <Sparkles size={18} strokeWidth={1.75} className="text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">Appearance</span>
              </div>
              <Select value={playerTheme} onValueChange={(v) => setPlayerTheme(v as 'spotify' | 'tidal' | 'apple')}>
                <SelectTrigger className="w-[min(200px,52%)] h-9 rounded-lg bg-background border-border/40 text-sm shrink-0">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/40">
                  <SelectItem value="spotify">Spotify</SelectItem>
                  <SelectItem value="tidal">Tidal</SelectItem>
                  <SelectItem value="apple">Apple Music</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 border border-white/10 bg-zinc-900/90">
                <Wifi size={16} strokeWidth={1.75} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Offline mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">Only play downloaded tracks (UI only)</p>
              </div>
              <Switch checked={offlineMode} onCheckedChange={setOfflineMode} />
            </div>
          </SettingsGroup>

          <SettingsSectionHeader title="Playback" />
          <SettingsGroup>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border/30">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border border-white/10 bg-zinc-900/90">
                  <Waves size={18} strokeWidth={1.75} className="text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">Seek bar</span>
              </div>
              <Select value={seekbarStyle} onValueChange={(v) => setSeekbarStyle(v as SeekbarStyle)}>
                <SelectTrigger className="w-[min(200px,52%)] h-9 rounded-lg bg-background border-border/40 text-sm shrink-0">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/40">
                  {SEEKBAR_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEEKBAR_STYLE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SettingsRow
              icon={SlidersHorizontal}
              title="Equalizer"
              subtitle={eqEnabled ? EQ_PRESET_LABELS[eqPreset] : 'Off'}
              onPress={() => setPage('equalizer')}
            />
          </SettingsGroup>

          <SettingsSectionHeader title="Home" />
          <SettingsGroup>
            <SettingsRow
              icon={LayoutGrid}
              title="Home page layout"
              subtitle="Sections on the home screen"
              onPress={() => setPage('homelayout')}
            />
          </SettingsGroup>

          <SettingsSectionHeader title="Catalog" />
          <SettingsGroup>
            <SettingsRow
              icon={ListMusic}
              title="Metadata provider"
              subtitle="Apple Music or Spotify catalog + region"
              onPress={() => setPage('metadata')}
            />
            <SettingsRow
              icon={Link2}
              title="Import external playlist"
              subtitle="Spotify playlist / profile link or CSV"
              onPress={() => setPage('externalImport')}
            />
          </SettingsGroup>

          <SettingsSectionHeader title="Data" />
          <SettingsGroup>
            <SettingsRow
              icon={Download}
              title="Downloads"
              subtitle="Offline files (coming soon)"
              onPress={() => setPage('downloads')}
            />
            <SettingsRow
              icon={HardDrive}
              title="Storage & cache"
              subtitle="Recently played and search cache"
              onPress={() => setPage('storage')}
            />
          </SettingsGroup>

          <SettingsSectionHeader title="Support" />
          <SettingsGroup>
            <SettingsRow
              icon={Info}
              title="About this app"
              subtitle={`Version ${MUSIK_VERSION} · ${MUSIK_BUILD}`}
              onPress={() => setPage('about')}
            />
          </SettingsGroup>

          <div className="px-4 pt-6 text-center text-[11px] text-muted-foreground border-t border-border/20 mt-4">
            musik v{MUSIK_VERSION}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
