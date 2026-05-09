'use client';

import { useUIStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useAddonStore } from '@/stores/addonStore';
import {
  EQ_PRESET_LABELS,
  SEEKBAR_STYLE_LABELS,
  SEEKBAR_STYLES,
  useAudioSettingsStore,
} from '@/stores/audioSettingsStore';
import type { EqPreset, SeekbarStyle } from '@/stores/audioSettingsStore';
import { useHomeLayoutStore } from '@/stores/homeLayoutStore';
import { getEqBandPreview } from '@/lib/equalizer-graph';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings as SettingsIcon,
  Palette,
  Music,
  Trash2,
  ShieldCheck,
  Smartphone,
  Laptop,
  Monitor,
  LayoutGrid,
} from 'lucide-react';

const MUSIK_VERSION = '0.2.0';
const MUSIK_BUILD = '2026.05.10';

const PLAYER_STYLES: {
  id: 'spotify' | 'tidal' | 'apple';
  name: string;
  desc: string;
  icon: typeof Laptop;
}[] = [
  { id: 'spotify', name: 'Spotify', desc: 'Bold accents, upbeat controls.', icon: Laptop },
  { id: 'tidal', name: 'Tidal', desc: 'Minimal dark canvas & glass.', icon: Monitor },
  { id: 'apple', name: 'Apple Music', desc: 'Neutral chrome, tight layout.', icon: Smartphone },
];

export default function SettingsView() {
  const { playerTheme, setPlayerTheme } = useUIStore();
  const { volume, setVolume } = usePlayerStore();
  const { addons, clearAddonSearchCache } = useAddonStore();
  const { eqEnabled, setEqEnabled, eqPreset, setEqPreset, seekbarStyle, setSeekbarStyle } =
    useAudioSettingsStore();
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

  const bandPreview = getEqBandPreview(eqEnabled, eqPreset);

  return (
    <ScrollArea className="h-full custom-scrollbar relative">
      <div className="p-4 md:p-8 space-y-10 pb-32 max-w-4xl mx-auto relative z-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-spotify-green" />
            Settings
          </h1>
          <p className="text-muted-foreground">Home layout, player, seek bar, EQ, cache</p>
        </header>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-border/30 pb-2">
            <LayoutGrid className="w-5 h-5" />
            <h2>Home layout</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Turn homepage rows on or off (quick picks, genre discover, top 10, etc.).
          </p>
          <div className="p-6 rounded-2xl bg-card/40 border border-border/40 space-y-4 max-w-xl">
            {[
              { id: 'quick' as const, label: 'Quick picks', sub: 'Playlist + recent grid', get: showQuickPicks, set: setShowQuickPicks },
              { id: 'disc' as const, label: 'Discover (radio genres)', sub: 'Genre tiles — first 12', get: showDiscover, set: setShowDiscover },
              { id: 'top' as const, label: 'Top 10', sub: 'Made-for-you playlist strip', get: showTopTen, set: setShowTopTen },
              { id: 'recent' as const, label: 'Recently played', sub: 'Horizontal history', get: showRecentlyPlayed, set: setShowRecentlyPlayed },
              { id: 'art' as const, label: 'Recommended artists', sub: 'Artist shortcuts', get: showRecommendedArtists, set: setShowRecommendedArtists },
              { id: 'browse' as const, label: 'Browse all', sub: 'Full genre grid', get: showBrowseAll, set: setShowBrowseAll },
            ].map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <Label>{row.label}</Label>
                  <p className="text-xs text-muted-foreground">{row.sub}</p>
                </div>
                <Switch checked={row.get} onCheckedChange={row.set} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-border/30 pb-2">
            <Palette className="w-5 h-5" />
            <h2>Player style</h2>
          </div>

          <p className="text-sm text-muted-foreground -mt-2">
            Mimics Spotify, Tidal, and Apple Music chrome for the docked player — pick one workspace look.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAYER_STYLES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setPlayerTheme(theme.id)}
                className={cn(
                  'flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all text-center',
                  playerTheme === theme.id
                    ? 'border-spotify-green bg-spotify-green/5'
                    : 'border-border/40 hover:border-border bg-card/40'
                )}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300',
                    playerTheme === theme.id ? 'bg-spotify-green text-white' : 'bg-accent text-muted-foreground'
                  )}
                >
                  <theme.icon size={24} />
                </div>
                <div>
                  <p className="font-bold">{theme.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{theme.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-border/30 pb-2">
            <Music className="w-5 h-5" />
            <h2>Seek bar style</h2>
          </div>

          <div className="p-6 rounded-2xl bg-card/40 border border-border/40 space-y-4 max-w-xl">
            <Label className="text-sm font-medium">Animation &amp; look</Label>
            <Select
              value={seekbarStyle}
              onValueChange={(v: SeekbarStyle) => setSeekbarStyle(v)}
            >
              <SelectTrigger size="sm" className="w-full max-w-sm">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(70vh,380px)]">
                {SEEKBAR_STYLES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SEEKBAR_STYLE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Live CSS on the docked player, Spotify-style bar, and fullscreen player sliders.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-border/30 pb-2">
            <Music className="w-5 h-5" />
            <h2>Equalizer</h2>
          </div>

          <div className="p-8 rounded-2xl bg-card/40 border border-border/40 space-y-8">
            <div className="flex flex-row items-center justify-between gap-4">
              <div>
                <Label className="text-base font-medium">EQ</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Web Audio 3-band shaping on the HTML player (resume playback if you hear silence after toggling).
                </p>
              </div>
              <Switch checked={eqEnabled} onCheckedChange={setEqEnabled} />
            </div>

            <div className="space-y-3 max-w-xl">
              <Label className="text-sm font-medium">Preset</Label>
              <Select
                disabled={!eqEnabled}
                value={eqPreset}
                onValueChange={(v: EqPreset) => setEqPreset(v)}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Preset" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EQ_PRESET_LABELS) as EqPreset[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {EQ_PRESET_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between items-end h-36 gap-1.5 sm:gap-3">
              {bandPreview.map((h, i) => (
                <div key={`${eqPreset}-${i}`} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
                  <div className="h-full w-full max-w-[10px] mx-auto rounded-full bg-muted/25 relative overflow-hidden">
                    <div
                      className={cn(
                        'absolute bottom-0 left-0 right-0 rounded-full transition-[height] duration-500 ease-out',
                        eqEnabled
                          ? 'bg-gradient-to-t from-spotify-green to-cyan-400'
                          : 'bg-muted-foreground/25'
                      )}
                      style={{ height: `${Math.round(h * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-border/30 pb-2">
            <Music className="w-5 h-5" />
            <h2>Audio & Playback</h2>
          </div>

          <div className="space-y-6 p-6 rounded-2xl bg-card/40 border border-border/40">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Default Volume</Label>
                <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
              </div>
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={(val) => setVolume(val[0] / 100)}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Hardware Acceleration</Label>
                <p className="text-xs text-muted-foreground">Use GPU for smoother UI animations</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Crossfade Tracks</Label>
                <p className="text-xs text-muted-foreground">Smooth transition between songs</p>
              </div>
              <Switch />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-border/30 pb-2">
            <ShieldCheck className="w-5 h-5" />
            <h2>System & Cache</h2>
          </div>

          <div className="space-y-6 p-6 rounded-2xl bg-card/40 border border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Installed Addons</Label>
                <p className="text-xs text-muted-foreground">{addons.length} addons currently active</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.hash = '#addons'}>
                Manage
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-destructive">Clear addon search cache</Label>
                <p className="text-xs text-muted-foreground">Clears in-memory addon results (search, errors). Installed addons stay.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={clearAddonSearchCache}>
                <Trash2 size={14} className="mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </section>

        <footer className="text-center pt-8 border-t border-border/20 opacity-40">
          <p className="text-sm">musik v{MUSIK_VERSION} • Build {MUSIK_BUILD}</p>
        </footer>
      </div>
    </ScrollArea>
  );
}
