'use client';

import { useState } from 'react';
import { useAddonStore } from '@/stores/addonStore';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Puzzle, Check, X, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AddonManifest } from '@/types/addon';

const POPULAR_ADDONS = [
  {
    name: 'Eclipse Music Search',
    url: 'https://addons.eclipse-music.com/addons/search/',
    description: 'Search and stream music from multiple sources',
  },
  {
    name: 'A2z-Music',
    url: 'https://addons.eclipse-music.com/addons/a2z/',
    description: 'Stream music from A2z sources',
  },
  {
    name: 'HugeFusion',
    url: 'https://addons.eclipse-music.com/addons/hugefusion/',
    description: 'HugeFusion music streaming addon',
  },
];

export default function AddonsView() {
  const {
    addons,
    addAddon,
    removeAddon,
    toggleAddon,
    fetchManifest,
    error,
    clearError,
  } = useAddonStore();

  const [installUrl, setInstallUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleInstall = async (url: string) => {
    setInstalling(true);
    setInstallError('');
    try {
      const manifest = await fetchManifest(url);
      await addAddon(manifest);
      setInstallUrl('');
      setDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to install addon';
      setInstallError(message);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <ScrollArea className="h-full custom-scrollbar">
      <div className="p-4 md:p-8 space-y-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Addons</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Install Eclipse-compatible addons to stream music
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-spotify-green hover:bg-spotify-green-hover text-white">
                <Plus size={18} className="mr-1" />
                Install Addon
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Install Addon</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Addon manifest URL
                  </label>
                  <Input
                    placeholder="https://example.com/addon/manifest.json"
                    value={installUrl}
                    onChange={(e) => setInstallUrl(e.target.value)}
                    className="bg-background border-border text-foreground"
                    autoFocus
                  />
                </div>

                {/* Quick install popular addons */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Popular addons:</p>
                  <div className="space-y-2">
                    {POPULAR_ADDONS.map((addon) => (
                      <button
                        key={addon.url}
                        onClick={() => handleInstall(addon.url)}
                        disabled={installing}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors',
                          'bg-accent/50 hover:bg-accent border border-border/30',
                          'disabled:opacity-50'
                        )}
                      >
                        <Puzzle size={18} className="text-spotify-green flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{addon.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{addon.description}</p>
                        </div>
                        {addons.find((a) => addon.url.includes(a.manifest.id?.toLowerCase() || a.manifest.name?.toLowerCase() || '')) ? (
                          <Check size={16} className="text-spotify-green flex-shrink-0" />
                        ) : (
                          <Plus size={16} className="text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleInstall(installUrl)}
                    disabled={!installUrl.trim() || installing}
                    className="flex-1 bg-spotify-green hover:bg-spotify-green-hover text-white"
                  >
                    {installing ? (
                      <Loader2 size={16} className="animate-spin mr-1" />
                    ) : null}
                    Install
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setInstallError('');
                    }}
                    className="border-border text-foreground"
                  >
                    Cancel
                  </Button>
                </div>

                {installError && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
                    <X size={14} />
                    {installError}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm cursor-pointer"
            onClick={clearError}
          >
            <X size={14} />
            {error}
            <span className="ml-auto text-xs opacity-70">Click to dismiss</span>
          </div>
        )}

        {/* How it works */}
        <div className="p-4 rounded-lg bg-accent/30 border border-border/20">
          <h3 className="text-sm font-semibold text-foreground mb-2">How Eclipse Addons Work</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Addons provide a <code className="bg-accent px-1 rounded">/manifest.json</code> endpoint</li>
            <li>• They expose search, stream, album, artist, and playlist endpoints</li>
            <li>• Musik proxies requests through its server to avoid CORS issues</li>
            <li>• Install an addon URL, then search for music across all enabled addons</li>
          </ul>
        </div>

        {/* Installed addons list */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">
            Installed ({addons.length})
          </h2>

          {addons.length === 0 ? (
            <div className="text-center py-16">
              <Puzzle size={48} className="text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No addons installed</p>
              <p className="text-sm text-muted-foreground/70">
                Install an Eclipse-compatible addon to start streaming music
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {addons.map((addon) => (
                  <motion.div
                    key={addon.manifest.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                      addon.enabled
                        ? 'bg-card border-border/30'
                        : 'bg-accent/20 border-border/10 opacity-60'
                    )}
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-accent flex items-center justify-center">
                      {addon.manifest.icon ? (
                        <img
                          src={addon.manifest.icon}
                          alt={addon.manifest.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Puzzle size={24} className="text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {addon.manifest.name}
                        </p>
                        <span className="text-xs text-muted-foreground">v{addon.manifest.version}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {addon.manifest.description || addon.manifest.id}
                      </p>
                      {addon.manifest.baseURL && (
                        <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                          {addon.manifest.baseURL}
                        </p>
                      )}
                    </div>

                    {/* Resources tags */}
                    <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                      {addon.manifest.resources?.slice(0, 3).map((res) => (
                        <span
                          key={res}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium"
                        >
                          {res}
                        </span>
                      ))}
                      {(addon.manifest.resources?.length || 0) > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{(addon.manifest.resources?.length || 0) - 3}
                        </span>
                      )}
                    </div>

                    {/* Toggle */}
                    <Switch
                      checked={addon.enabled}
                      onCheckedChange={() => toggleAddon(addon.manifest.id)}
                    />

                    {/* Delete */}
                    {confirmDelete === addon.manifest.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => {
                            removeAddon(addon.manifest.id);
                            setConfirmDelete(null);
                          }}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => setConfirmDelete(addon.manifest.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
