'use client';

import { useUIStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useAddonStore } from '@/stores/addonStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Music, 
  Download, 
  Trash2, 
  ShieldCheck,
  Smartphone,
  Laptop,
  Monitor
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsView() {
  const { playerTheme, setPlayerTheme } = useUIStore();
  const { volume, setVolume } = usePlayerStore();
  const { addons, clearCache } = useAddonStore();

  const themes: { id: 'spotify' | 'tidal' | 'apple', name: string, icon: any }[] = [
    { id: 'spotify', name: 'Spotify Classic', icon: Laptop },
    { id: 'tidal', name: 'Tidal Liquify', icon: Monitor },
    { id: 'apple', name: 'Apple Music', icon: Smartphone }
  ];

  return (
    <ScrollArea className="h-full custom-scrollbar relative">
      <div className="p-4 md:p-8 space-y-10 pb-32 max-w-4xl mx-auto relative z-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-spotify-green" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your player preferences and addons</p>
        </header>

        {/* UI Theme Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-border/30 pb-2">
            <Palette className="w-5 h-5" />
            <h2>Appearance</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <motion.button
                key={theme.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPlayerTheme(theme.id)}
                className={cn(
                  "flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all text-center",
                  playerTheme === theme.id 
                    ? "border-spotify-green bg-spotify-green/5" 
                    : "border-border/40 hover:border-border bg-card/40"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  playerTheme === theme.id ? "bg-spotify-green text-white" : "bg-accent text-muted-foreground"
                )}>
                  <theme.icon size={24} />
                </div>
                <div>
                  <p className="font-bold">{theme.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {theme.id === 'tidal' ? 'Premium Glassmorphism' : 'Standard Native Look'}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Audio Section */}
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

        {/* Equalizer Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-border/30 pb-2">
            <Music className="w-5 h-5" />
            <h2>Audio Equalizer</h2>
          </div>
          
          <div className="p-8 rounded-2xl bg-card/40 border border-border/40 space-y-8">
            <div className="flex justify-between items-end h-40 gap-4">
              {[60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000].map((freq, i) => {
                const heights = ["45%", "65%", "55%", "75%", "50%", "40%", "60%", "70%", "50%", "45%"];
                return (
                  <div key={freq} className="flex flex-col items-center gap-4 flex-1 h-full">
                    <div className="h-full w-2 bg-muted/20 rounded-full relative overflow-hidden group cursor-ns-resize">
                      <motion.div 
                        initial={{ height: "50%" }}
                        animate={{ height: heights[i] }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute bottom-0 w-full bg-gradient-to-t from-spotify-green to-cyan-400 rounded-full"
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-bold rotate-45 mt-4">
                      {freq >= 1000 ? `${freq/1000}k` : freq}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-2">
              {['Flat', 'Bass Boost', 'Electronic', 'Classical', 'Jazz', 'Pop'].map((preset) => (
                <Button key={preset} variant="outline" size="sm" className="text-[10px] h-7 px-3 rounded-full hover:border-spotify-green hover:text-spotify-green">
                  {preset}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Addons Section */}
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
                <Label className="text-destructive">Clear All Cache</Label>
                <p className="text-xs text-muted-foreground">Removes all downloaded track metadata and images</p>
              </div>
              <Button variant="destructive" size="sm" onClick={clearCache}>
                <Trash2 size={14} className="mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-border/20 opacity-40">
          <p className="text-sm">BeatBoss v0.2.0 • Build 2026.05.09</p>
          <p className="text-xs mt-1">Made with ❤️ for HiFi Music Lovers</p>
        </footer>
      </div>
    </ScrollArea>
  );
}
