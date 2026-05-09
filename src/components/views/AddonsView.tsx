'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAddonStore } from '@/stores/addonStore';
import { useUIStore } from '@/stores/uiStore';
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
import {
  Plus,
  Trash2,
  Puzzle,
  Check,
  X,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  ExternalLink,
  Download,
  Store,
  Search,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AddonManifest } from '@/types/addon';

interface StoreAddon {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string;
  icon?: string;
  setupUrl?: string;
  manifestUrl?: string;
}

const ECLIPSE_STORE_NAME = 'Eclipse Addon Store';

export default function AddonsView() {
  const { playerTheme } = useUIStore();
  const {
    addons,
    activeAddonId,
    addAddon,
    removeAddon,
    toggleAddon,
    setActiveAddon,
    fetchManifest,
    error,
    clearError,
  } = useAddonStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [installUrl, setInstallUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  // Store state
  const [storeAddons, setStoreAddons] = useState<StoreAddon[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [storeSearch, setStoreSearch] = useState('');

  // Fetch Eclipse addon store registry
  const fetchStoreRegistry = useCallback(async () => {
    setStoreLoading(true);
    setStoreError('');
    try {
      const res = await fetch('/api/addons/store');
      if (!res.ok) throw new Error(`Failed to fetch store (${res.status})`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (Array.isArray(data.addons)) {
        setStoreAddons(data.addons);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load addon store';
      setStoreError(message);
    } finally {
      setStoreLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreRegistry();
  }, [fetchStoreRegistry]);

  // Install from store
  const handleStoreInstall = async (addon: StoreAddon) => {
    const installSource = addon.manifestUrl || addon.setupUrl || '';
    if (!installSource) return;

    setInstallingId(addon.id);
    setInstallError('');
    try {
      const manifest = await fetchManifest(installSource);
      await addAddon(manifest);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to install addon';
      setInstallError(message);
    } finally {
      setInstallingId(null);
    }
  };

  // Manual URL install
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

  const isInstalled = (storeAddonId: string) => {
    return addons.some((a) => a.manifest.id === storeAddonId);
  };

  const isInstallingStoreAddon = (id: string) => installingId === id;

  // Filter store addons by search
  const filteredStoreAddons = storeSearch.trim()
    ? storeAddons.filter(
        (a) =>
          a.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
          a.description?.toLowerCase().includes(storeSearch.toLowerCase()) ||
          a.author?.toLowerCase().includes(storeSearch.toLowerCase())
      )
    : storeAddons;

  const enabledAddons = addons.filter((a) => a.enabled);

  if (!mounted) return null;

  return (
    <ScrollArea className="h-full custom-scrollbar">
      <div className="p-4 md:p-8 space-y-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Addons</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse and install Eclipse-compatible addons to stream music
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border text-foreground">
                  <Globe size={16} className="mr-1" />
                  Custom URL
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Install from URL</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Addon manifest URL or base URL
                    </label>
                    <Input
                      placeholder="https://example.com/addon/ or manifest.json"
                      value={installUrl}
                      onChange={(e) => setInstallUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && installUrl.trim()) {
                          handleInstall(installUrl);
                        }
                      }}
                      className="bg-background border-border text-foreground"
                      autoFocus
                    />
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
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      <X size={14} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Installation Failed</p>
                        <p className="text-xs opacity-80 mt-1">{installError}</p>
                        <p className="text-xs opacity-60 mt-1">
                          Make sure the URL is correct and the addon server is online.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Error banner */}
        {(error || installError) && (
          <div
            className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm cursor-pointer"
            onClick={() => {
              clearError();
              setInstallError('');
            }}
          >
            <X size={14} />
            {error || installError}
            <span className="ml-auto text-xs opacity-70">Click to dismiss</span>
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap size={14} className={enabledAddons.length > 0 ? 'text-spotify-green' : 'text-muted-foreground'} />
            <span>{enabledAddons.length} active</span>
          </div>
          <div className="flex items-center gap-2">
            <Puzzle size={14} />
            <span>{addons.length} installed</span>
          </div>
          {activeAddonId && (
            <div className="flex items-center gap-2">
              <Wifi size={14} className="text-spotify-green" />
              <span>
                Searching via{' '}
                {addons.find((a) => a.manifest.id === activeAddonId)?.manifest.name || 'addon'}
              </span>
            </div>
          )}
          {!activeAddonId && addons.length > 0 && (
            <div className="flex items-center gap-2 text-yellow-500">
              <WifiOff size={14} />
              <span>No active addon selected</span>
            </div>
          )}
        </div>

        {/* ── Eclipse Addon Store ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Store size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{ECLIPSE_STORE_NAME}</h2>
                <p className="text-xs text-muted-foreground">
                  Official community addons from eclipsemusic.app
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={fetchStoreRegistry}
              disabled={storeLoading}
            >
              <RefreshCw size={16} className={storeLoading ? 'animate-spin' : ''} />
            </Button>
          </div>

          {/* Store search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search addons..."
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              className="pl-9 h-9 bg-foreground/5 border-none rounded-full text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground/20"
            />
            {storeSearch && (
              <button
                onClick={() => setStoreSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Store loading */}
          {storeLoading && storeAddons.length === 0 && (
            <div className="flex items-center gap-3 py-12 justify-center">
              <Loader2 size={20} className="animate-spin text-spotify-green" />
              <span className="text-sm text-muted-foreground">Loading addon store...</span>
            </div>
          )}

          {/* Store error */}
          {storeError && !storeLoading && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/20 border border-border/20 text-sm">
              <WifiOff size={16} className="text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground">{storeError}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Check your internet connection and try again.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs"
                onClick={fetchStoreRegistry}
              >
                <RefreshCw size={12} className="mr-1" />
                Retry
              </Button>
            </div>
          )}

          {/* Store addon grid */}
          {!storeLoading && !storeError && filteredStoreAddons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStoreAddons.map((addon) => {
                const installed = isInstalled(addon.id);
                const currentlyInstalling = isInstallingStoreAddon(addon.id);
                const isActive = addons.find((a) => a.manifest.id === addon.id)?.manifest.id === activeAddonId;

                return (
                  <motion.div
                    key={addon.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border transition-all',
                      playerTheme === 'tidal'
                        ? 'bg-white/5 backdrop-blur-md border-white/10'
                        : installed
                          ? isActive
                            ? 'bg-card border-spotify-green/50 ring-1 ring-spotify-green/20'
                            : 'bg-card border-spotify-green/30'
                          : 'bg-card border-border/30 hover:border-border/50'
                    )}
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-accent flex items-center justify-center">
                      {addon.icon ? (
                        <img
                          src={addon.icon}
                          alt={addon.name}
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
                        <p className="text-sm font-semibold text-foreground truncate">{addon.name}</p>
                        <span className="text-[10px] text-muted-foreground">v{addon.version}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {addon.description || addon.author || 'Eclipse addon'}
                      </p>
                      {addon.author && (
                        <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                          by {addon.author}
                        </p>
                      )}
                    </div>

                    {/* Install / Status */}
                    <div className="flex-shrink-0">
                      {installed ? (
                        <div className="flex items-center gap-1.5 text-spotify-green">
                          <Check size={14} />
                          <span className="text-[10px] font-medium">{isActive ? 'ACTIVE' : 'INSTALLED'}</span>
                        </div>
                      ) : currentlyInstalling ? (
                        <Loader2 size={16} className="text-spotify-green animate-spin" />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-spotify-green/50 text-spotify-green hover:bg-spotify-green/10 hover:text-spotify-green"
                          onClick={() => handleStoreInstall(addon)}
                        >
                          <Download size={12} className="mr-1" />
                          Install
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!storeLoading && !storeError && filteredStoreAddons.length === 0 && storeSearch.trim() && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No addons matching &quot;{storeSearch}&quot;
              </p>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="p-4 rounded-lg bg-accent/30 border border-border/20">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Shield size={14} className="text-spotify-green" />
            How Eclipse Addons Work
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-spotify-green mt-0.5">1.</span>
              Browse the store above and click <strong>Install</strong> on any addon
            </li>
            <li className="flex items-start gap-2">
              <span className="text-spotify-green mt-0.5">2.</span>
              The addon is set as active automatically — it&apos;s your search provider
            </li>
            <li className="flex items-start gap-2">
              <span className="text-spotify-green mt-0.5">3.</span>
              Go to <strong>Search</strong> and type any song, artist, or album
            </li>
            <li className="flex items-start gap-2">
              <span className="text-spotify-green mt-0.5">4.</span>
              Click a track to play it — Musik proxies the stream through its server
            </li>
            <li className="flex items-start gap-2">
              <span className="text-spotify-green mt-0.5">5.</span>
              Use the <strong>Custom URL</strong> button to install any Eclipse-compatible addon by URL
            </li>
          </ul>
        </div>

        {/* ── Installed Addons ── */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">
            Installed ({addons.length})
          </h2>

          {addons.length === 0 ? (
            <div className="text-center py-12">
              <Puzzle size={48} className="text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No addons installed</p>
              <p className="text-sm text-muted-foreground/70 mb-4">
                Install from the Eclipse Addon Store above to start streaming music
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {addons.map((addon) => {
                  const isActive = addon.manifest.id === activeAddonId;
                  return (
                    <motion.div
                      key={addon.manifest.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer',
                        isActive
                          ? 'bg-card border-spotify-green/50 ring-1 ring-spotify-green/20'
                          : addon.enabled
                            ? 'bg-card border-border/30 hover:border-border/50'
                            : 'bg-accent/20 border-border/10 opacity-60'
                      )}
                      onClick={() => {
                        if (addon.enabled && !isActive) {
                          setActiveAddon(addon.manifest.id);
                        }
                      }}
                    >
                      {/* Active indicator (radio button) */}
                      <div className="flex-shrink-0">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            isActive ? 'border-spotify-green' : 'border-border'
                          )}
                        >
                          {isActive && <div className="w-2.5 h-2.5 rounded-full bg-spotify-green" />}
                        </div>
                      </div>

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
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-spotify-green/20 text-spotify-green font-semibold">
                              ACTIVE
                            </span>
                          )}
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
                        {(addon.manifest.resources || []).slice(0, 3).map((res) => (
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
                        onCheckedChange={(e) => {
                          e.stopPropagation();
                          toggleAddon(addon.manifest.id);
                        }}
                      />

                      {/* Delete */}
                      {confirmDelete === addon.manifest.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(addon.manifest.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
