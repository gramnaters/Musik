'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAddonStore } from '@/stores/addonStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Download,
  Store,
  Search,
  Globe,
  Zap,
  ChevronLeft,
  Package,
  Cloud,
  ChevronRight,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { resolveAssetUrl, parentDirUrl, proxiedRemoteUrl } from '@/lib/resolve-asset-url';

/** Icons from catalogs often hotlink CDNs; proxy avoids broken thumbnails (e.g. Claudochrome). */
function addonIconImgSrc(icon: string | undefined, baseURL: string): string | undefined {
  const resolved = resolveAssetUrl(icon?.trim(), baseURL) || icon?.trim();
  if (!resolved) return undefined;
  if (/^https?:\/\//i.test(resolved)) return proxiedRemoteUrl(resolved);
  return resolved;
}

interface StoreAddon {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version: string;
  icon?: string;
  setupUrl?: string;
  manifestUrl?: string;
  /** Native 8SPINE `.8spine` package — installed in-app by fetching and running the module (fetch is proxied). */
  eightspineOnly?: boolean;
  eightspinePackageUrl?: string;
  moduleType?: string;
  tags?: string[];
}

function ModuleSourcesScreenHeader({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between px-2 py-3 border-b border-white/10 shrink-0 bg-black">
      <button
        type="button"
        onClick={onClose}
        className="h-10 w-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        aria-label="Close"
      >
        <X size={22} strokeWidth={2} />
      </button>
      <h1 className="text-base font-semibold text-white tracking-tight">Module Sources</h1>
      <button
        type="button"
        onClick={onAdd}
        className="h-9 min-w-[2.25rem] px-3 rounded-full bg-white text-black text-lg font-light leading-none flex items-center justify-center hover:bg-white/90 transition-colors"
        aria-label="Add source"
      >
        +
      </button>
    </div>
  );
}

export default function AddonsView() {
  const {
    addons,
    sources,
    activeAddonId,
    addAddon,
    removeAddon,
    toggleAddon,
    setActiveAddon,
    fetchManifest,
    error,
    clearError,
    search,
    addSource,
    removeSource,
    dismissModuleSource,
    restoreAllModuleSources,
    hiddenModuleSourceIds,
    getPlaybackOrderedSearchAddonIds,
    movePlaybackPriority,
    playbackPriorityIds,
    cleanupBrokenAddons,
  } = useAddonStore();


  const {
    connectionsCatalogSourceId,
    setConnectionsCatalogSourceId,
    connectionsScreen,
    setConnectionsScreen,
    navigateTo,
    setSearchQuery,
  } = useUIStore();

  const visibleSources = useMemo(
    () => sources.filter((s) => !hiddenModuleSourceIds.includes(s.id)),
    [sources, hiddenModuleSourceIds]
  );

  useEffect(() => {
    if (connectionsCatalogSourceId && hiddenModuleSourceIds.includes(connectionsCatalogSourceId)) {
      setConnectionsCatalogSourceId(null);
    }
  }, [connectionsCatalogSourceId, hiddenModuleSourceIds, setConnectionsCatalogSourceId]);

  const catalogSources = useMemo(() => {
    if (!connectionsCatalogSourceId) return visibleSources;
    return visibleSources.filter((s) => s.id === connectionsCatalogSourceId);
  }, [visibleSources, connectionsCatalogSourceId]);

  const orderedPlaybackSearchIds = useMemo(
    () => getPlaybackOrderedSearchAddonIds(),
    [addons, playbackPriorityIds, getPlaybackOrderedSearchAddonIds]
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    cleanupBrokenAddons();
  }, [cleanupBrokenAddons]);


  const [installUrl, setInstallUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [bulkInstalling, setBulkInstalling] = useState(false);

  const [catalogBySource, setCatalogBySource] = useState<
    Record<string, { addons: StoreAddon[]; loading: boolean; error: string }>
  >({});
  const [storeSearch, setStoreSearch] = useState('');
  const [eclipseSetup, setEclipseSetup] = useState<{ sourceId: string; addon: StoreAddon } | null>(null);
  const [eclipseManifestUrl, setEclipseManifestUrl] = useState('');
  const [eclipseDialogBusy, setEclipseDialogBusy] = useState(false);
  const [eclipseQuality, setEclipseQuality] = useState('max');
  const [eclipseUnowned, setEclipseUnowned] = useState(true);
  const [eclipseTestQuery, setEclipseTestQuery] = useState('');
  const [eclipseTestBusy, setEclipseTestBusy] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  const fetchAllCatalogs = useCallback(async () => {
    setCatalogBySource((prev) => {
      const next = { ...prev };
      for (const s of visibleSources) {
        next[s.id] = { addons: next[s.id]?.addons ?? [], loading: true, error: '' };
      }
      return next;
    });

    const results: Record<string, { addons: StoreAddon[]; loading: boolean; error: string }> = {};

    await Promise.all(
      visibleSources.map(async (source) => {
        const fetchUrl = source.registryUrl?.trim()
          ? `/api/addons/store?url=${encodeURIComponent(source.registryUrl.trim())}`
          : '/api/addons/store';
        try {
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          results[source.id] = {
            addons: Array.isArray(data.addons) ? data.addons : [],
            loading: false,
            error: '',
          };
        } catch (err: unknown) {
          results[source.id] = {
            addons: [],
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load',
          };
        }
      })
    );

    setCatalogBySource((prev) => ({ ...prev, ...results }));
  }, [visibleSources]);

  useEffect(() => {
    void fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  const normalizeCatalogId = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');

  const storeRowMatchesInstalled = (
    row: StoreAddon,
    manifestId: string,
    baseURL?: string,
    installSourceUrl?: string
  ) => {
    const mid = manifestId.trim();
    const rid = row.id.trim();
    if (!mid || !rid) return false;
    if (mid === rid) return true;
    if (normalizeCatalogId(mid) === normalizeCatalogId(rid)) return true;

    const rowUrls = [row.manifestUrl, row.eightspinePackageUrl, row.setupUrl]
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter(Boolean);

    const instInstall = (installSourceUrl || '').trim().replace(/\/$/, '');
    if (instInstall) {
      const low = instInstall.toLowerCase();
      for (const raw of rowUrls) {
        const t = raw.replace(/\/$/, '');
        if (t && t.toLowerCase() === low) return true;
      }
    }

    const instBase = (baseURL || '').replace(/\/$/, '');
    if (!instBase) return false;

    for (const raw of rowUrls) {
      const trimmed = raw.replace(/\/$/, '');
      if (trimmed && trimmed === instBase) return true;
    }
    return false;
  };

  const rowInstallUrl = (a: StoreAddon) =>
    (a.eightspinePackageUrl || a.manifestUrl || a.setupUrl || '').trim();

  const isCatalogRowInstallable = (a: StoreAddon) =>
    a.eightspineOnly ? Boolean(a.eightspinePackageUrl?.trim()) : Boolean(rowInstallUrl(a));

  // Install from store
  const handleStoreInstall = async (addon: StoreAddon, sourceId: string) => {
    const installSource = rowInstallUrl(addon);
    if (!installSource) return;

    setInstallingId(`${sourceId}:${addon.id}`);
    setInstallError('');
    setEclipseSetup(null);
    try {
      const { manifest, eightspineInnerCode, eightspineKind } = await fetchManifest(installSource);
      addAddon(manifest, { sourceId, installSourceUrl: installSource, eightspineInnerCode, eightspineKind });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to install addon';
      setInstallError(message);
      const setupOnly =
        !addon.eightspineOnly &&
        (addon.setupUrl || '').trim() &&
        !(addon.manifestUrl || '').trim();
      if (setupOnly) {
        setEclipseSetup({ sourceId, addon });
        setEclipseManifestUrl('');
      }
    } finally {
      setInstallingId(null);
    }
  };

  // Manual URL install
  const handleInstall = async (url: string) => {
    setInstalling(true);
    setInstallError('');
    try {
      const { manifest, eightspineInnerCode, eightspineKind } = await fetchManifest(url);
      addAddon(manifest, {
        sourceId: 'custom',
        installSourceUrl: url.trim(),
        eightspineInnerCode,
        eightspineKind,
      });
      setInstallUrl('');
      setDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to install addon';
      setInstallError(message);
    } finally {
      setInstalling(false);
    }
  };

  const runEclipseTestSearch = useCallback(async () => {
    const q = eclipseTestQuery.trim();
    if (!q) return;
    setEclipseTestBusy(true);
    try {
      setSearchQuery(q);
      await search(q);
      navigateTo('search');
      toast({ title: 'Search', description: `Results for "${q}" on Search.` });
    } catch (e: unknown) {
      toast({
        title: 'Search failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setEclipseTestBusy(false);
    }
  }, [eclipseTestQuery, search, setSearchQuery, navigateTo]);

  const isInstalled = (row: StoreAddon) =>
    addons.some((a) =>
      storeRowMatchesInstalled(row, a.manifest.id, a.manifest.baseURL, a.installSourceUrl)
    );

  const isInstallingStoreAddon = (sourceId: string, id: string) => installingId === `${sourceId}:${id}`;

  const countCatalogInstallable = () => {
    let n = 0;
    for (const s of visibleSources) {
      const list = catalogBySource[s.id]?.addons ?? [];
      for (const a of list) {
        if (!isCatalogRowInstallable(a)) continue;
        if (isInstalled(a)) continue;
        n += 1;
      }
    }
    return n;
  };

  const handleInstallAllEclipse = async () => {
    const n = countCatalogInstallable();
    if (n === 0) {
      toast({
        title: 'Nothing to install',
        description: 'Everything in your catalogs is already installed, or no rows have a valid install URL.',
      });
      return;
    }
    
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Install ${n} addon(s) from all catalogs? Only install sources you trust. This may take a minute.`
      )
    ) {
      return;
    }

    setBulkInstalling(true);
    setInstallError('');
    let ok = 0;
    let fail = 0;

    const toInstall: Array<{ sourceId: string; addon: StoreAddon; src: string }> = [];
    for (const s of visibleSources) {
      const list = catalogBySource[s.id]?.addons ?? [];
      for (const a of list) {
        if (!isCatalogRowInstallable(a) || isInstalled(a)) continue;
        const src = rowInstallUrl(a);
        if (src) toInstall.push({ sourceId: s.id, addon: a, src });
      }
    }

    // Process in parallel batches of 3
    const batchSize = 3;
    for (let i = 0; i < toInstall.length; i += batchSize) {
      const batch = toInstall.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async ({ sourceId, addon, src }) => {
          setInstallingId(`${sourceId}:${addon.id}`);
          try {
            const { manifest, eightspineInnerCode, eightspineKind } = await fetchManifest(src);
            addAddon(manifest, {
              sourceId,
              installSourceUrl: src,
              eightspineInnerCode,
              eightspineKind,
            });
            ok += 1;
          } catch (e) {
            console.error(`Failed to install ${addon.name}`, e);
            fail += 1;
          }
        })
      );
      // Small pause between batches
      if (i + batchSize < toInstall.length) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setInstallingId(null);
    setBulkInstalling(false);
    toast({
      title: 'Bulk install finished',
      description: `Installed: ${ok}. Failed: ${fail}.`,
    });
  };

  const filterRows = (list: StoreAddon[]) =>
    storeSearch.trim()
      ? list.filter(
          (a) =>
            a.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
            a.description?.toLowerCase().includes(storeSearch.toLowerCase()) ||
            a.author?.toLowerCase().includes(storeSearch.toLowerCase())
        )
      : list;

  const enabledAddons = addons.filter((a) => a.enabled);

  if (!mounted) return null;

  if (connectionsScreen === 'sources') {
    return (
      <div className="flex flex-col h-full min-h-0 bg-black text-white">
        <ModuleSourcesScreenHeader
          onClose={() => setConnectionsScreen('home')}
          onAdd={() => setSourceDialogOpen(true)}
        />
        <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
          <div className="pb-32 px-3 pt-2 space-y-3">
            {hiddenModuleSourceIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-2xl border border-zinc-700 bg-[#262626] text-white hover:bg-zinc-800 font-medium gap-2"
                onClick={() => restoreAllModuleSources()}
              >
                <RotateCcw className="w-4 h-4" />
                Restore hidden catalogs
              </Button>
            )}
            {visibleSources.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8 rounded-2xl border border-dashed border-zinc-800">
                No module sources visible. Restore catalogs above or add a custom registry.
              </p>
            ) : (
              <>
                {visibleSources.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-stretch gap-0 rounded-2xl border border-zinc-800 bg-[#1a1a1a] overflow-hidden"
                  >
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 p-3.5 text-left min-w-0 hover:bg-white/[0.04] transition-colors"
                      onClick={() => {
                        setConnectionsScreen('browse');
                        setConnectionsCatalogSourceId(s.id);
                      }}
                    >
                      <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                        <Cloud size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {s.registryUrl?.trim() ? s.registryUrl : 'Built-in default catalog'}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-zinc-500 shrink-0 self-center" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="shrink-0 w-12 flex items-center justify-center border-l border-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (s.builtIn) dismissModuleSource(s.id);
                        else removeSource(s.id);
                        if (connectionsCatalogSourceId === s.id) setConnectionsCatalogSourceId(null);
                      }}
                      aria-label={s.builtIn ? `Hide ${s.name}` : `Remove ${s.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-2xl border border-zinc-700 bg-[#262626] text-white hover:bg-zinc-800 font-medium"
              onClick={() => setSourceDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </div>
        </ScrollArea>
        <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
          <DialogContent className="bg-zinc-950 border-white/20 text-foreground sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add module source</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Display name</Label>
                <Input
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="My catalog"
                  className="bg-zinc-900 border-white/15 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Registry JSON URL</Label>
                <Input
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://…/index.json"
                  className="bg-zinc-900 border-white/15 rounded-xl"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 rounded-full bg-white text-black hover:bg-white/90"
                  disabled={!newSourceName.trim() || !newSourceUrl.trim()}
                  onClick={() => {
                    addSource(newSourceName.trim(), newSourceUrl.trim());
                    setNewSourceName('');
                    setNewSourceUrl('');
                    setSourceDialogOpen(false);
                    void fetchAllCatalogs();
                  }}
                >
                  Save
                </Button>
                <Button variant="outline" className="rounded-full border-white/25" onClick={() => setSourceDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const moduleCard =
    'rounded-2xl border border-zinc-800 bg-[#1a1a1a] shadow-none';

  return (
    <>
      <ScrollArea className="h-full min-h-0 custom-scrollbar">
        <div className="p-4 md:p-6 space-y-5 pb-40 bg-black text-white min-h-full">
        {connectionsScreen === 'home' && (
          <>
            <div className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-1 pt-1">
              <span className="w-9" aria-hidden />
              <h1 className="text-center text-base font-semibold tracking-tight text-white">Modules</h1>
              <button
                type="button"
                onClick={() => setConnectionsScreen('sources')}
                className="rounded-full bg-white text-black text-xs font-semibold px-3 py-1.5 hover:bg-white/90 shrink-0"
              >
                Sources
              </button>
            </div>
            {addons.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-10 rounded-2xl border border-dashed border-zinc-800">
                No modules installed. Tap Install module to browse catalogs.
              </p>
            ) : (
              <div className="space-y-3">
                {orderedPlaybackSearchIds.length >= 2 && (
                  <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Playback & search priority</p>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                        When resolving a stream or searching, the app tries modules from top to bottom. If one fails,
                        the next is used. Home uses this order when “Prefer modules for Home” is on in Settings.
                      </p>
                    </div>
                    <ul className="space-y-1.5">
                      {orderedPlaybackSearchIds.map((id) => {
                        const addon = addons.find((a) => a.manifest.id === id);
                        if (!addon) return null;
                        return (
                          <li
                            key={id}
                            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#1a1a1a] px-3 py-2"
                          >
                            <span className="flex-1 min-w-0 text-sm text-zinc-200 truncate">
                              {addon.manifest.name}
                            </span>
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                type="button"
                                className="h-7 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                                aria-label={`Move ${addon.manifest.name} up`}
                                onClick={() => movePlaybackPriority(id, -1)}
                              >
                                <ChevronUp className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="h-7 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                                aria-label={`Move ${addon.manifest.name} down`}
                                onClick={() => movePlaybackPriority(id, 1)}
                              >
                                <ChevronDown className="size-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {addons.map((addon) => {
                  const shortId = addon.manifest.id.split('.').pop() || addon.manifest.id.slice(0, 8);
                  const tagList = (addon.manifest.resources || []).slice(0, 8);
                  return (
                    <div
                      key={addon.manifest.id}
                      className={cn('rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-4 space-y-3', moduleCard)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 shrink-0 flex items-center justify-center">
                            {(() => {
                              const raw = addon.manifest.icon?.trim();
                              const imgSrc = addonIconImgSrc(raw, addon.manifest.baseURL || '');
                              if (imgSrc) {
                                return (
                                  <img
                                    src={imgSrc}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                );
                              }
                              if (raw && raw.length <= 4) {
                                return <span className="text-2xl leading-none select-none">{raw}</span>;
                              }
                              return <Puzzle className="w-6 h-6 text-zinc-500" />;
                            })()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{addon.manifest.name}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              <span className="inline-block rounded-md bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 mr-1">
                                #{shortId}
                              </span>
                              <span>v{addon.manifest.version}</span>
                            </p>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <Switch checked={addon.enabled} onCheckedChange={() => toggleAddon(addon.manifest.id)} />
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">Installed user module.</p>
                      {tagList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tagList.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/25 text-white/90 bg-black/40"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {confirmDelete === addon.manifest.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 h-10 rounded-full"
                              onClick={() => {
                                removeAddon(addon.manifest.id);
                                setConfirmDelete(null);
                              }}
                            >
                              Confirm remove
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10 rounded-full border-zinc-700"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 h-10 rounded-full border-zinc-700 bg-[#262626] text-zinc-200 hover:bg-zinc-800"
                              onClick={() => setConfirmDelete(addon.manifest.id)}
                            >
                              Uninstall
                            </Button>
                            <Button
                              type="button"
                              className="flex-1 h-10 rounded-full bg-white text-black font-semibold hover:bg-white/90"
                              onClick={() => {
                                const u = addon.manifest.baseURL?.trim();
                                if (u) {
                                  window.open(
                                    u.startsWith('http') ? u : `https://${u}`,
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                } else {
                                  setActiveAddon(addon.manifest.id);
                                  setConnectionsScreen('browse');
                                  setConnectionsCatalogSourceId(null);
                                }
                              }}
                            >
                              Open
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="pt-2">
              <Button
                type="button"
                className="w-full h-12 rounded-2xl bg-[#262626] border border-zinc-700 text-white font-medium hover:bg-zinc-800"
                onClick={() => {
                  setConnectionsScreen('browse');
                  setConnectionsCatalogSourceId(null);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Install module
              </Button>
            </div>
          </>
        )}

        {connectionsScreen === 'browse' && (
          <>
        {/* Header — 8SPINE Browse Modules */}
        <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1 pt-1">
          {connectionsCatalogSourceId ? (
            <button
              type="button"
              className="h-9 w-9 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
              onClick={() => {
                setConnectionsCatalogSourceId(null);
                setConnectionsScreen('sources');
              }}
              aria-label="Back to sources"
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              className="h-9 w-9 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
              onClick={() => {
                setConnectionsScreen('home');
                setConnectionsCatalogSourceId(null);
              }}
              aria-label="Back to modules"
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
          )}
          <h1 className="text-center text-base font-semibold tracking-tight text-white">Browse modules</h1>
          <span className="w-9" aria-hidden />
        </div>
        {connectionsCatalogSourceId && (
          <p className="text-center text-[11px] text-zinc-500 -mt-2">
            {sources.find((s) => s.id === connectionsCatalogSourceId)?.name ?? 'Catalog'}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-zinc-700 bg-[#262626] text-white rounded-full hover:bg-zinc-800"
                >
                  <Globe size={16} className="mr-1" />
                  Custom URL
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/20 text-foreground sm:max-w-md">
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

        {/* ── Catalog sources (Settings → Sources adds more) ── */}
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Catalogs</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Browse and install modules from the sources you added.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={bulkInstalling}
                onClick={() => void handleInstallAllEclipse()}
              >
                {bulkInstalling ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
                Install all from catalogs
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => void fetchAllCatalogs()}
              >
                <RefreshCw size={14} className="mr-1" />
                Refresh all
              </Button>
            </div>
          </div>

          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search across all catalogs…"
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              className="pl-9 h-10 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20"
            />
            {storeSearch && (
              <button
                type="button"
                onClick={() => setStoreSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {catalogSources.map((source) => {
            const cat = catalogBySource[source.id];
            const loading = cat?.loading ?? true;
            const err = cat?.error ?? '';
            const rows = filterRows(cat?.addons ?? []);

            const catSection =
              (source.registryUrl || '').toLowerCase().includes('8spine') ||
              (source.name || '').toLowerCase().includes('8spine')
                ? 'MODULES'
                : 'MUSIC';

            return (
              <div key={source.id} className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 px-1">{catSection}</p>
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <Store size={14} className="text-zinc-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-400 truncate">{source.name}</p>
                    <p className="text-[10px] text-zinc-600 truncate">{source.registryUrl || 'Default registry'}</p>
                  </div>
                </div>

                {loading && rows.length === 0 && (
                  <div className="flex items-center gap-3 py-8 justify-center text-zinc-500 text-sm">
                    <Loader2 size={18} className="animate-spin text-white" />
                    Loading…
                  </div>
                )}

                {err && !loading && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-sm">
                    <WifiOff size={16} className="text-zinc-500 shrink-0" />
                    <p className="text-zinc-400">{err}</p>
                    <Button variant="ghost" size="sm" className="ml-auto text-xs text-white" onClick={() => void fetchAllCatalogs()}>
                      Retry
                    </Button>
                  </div>
                )}

                {!loading && !err && rows.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {rows.map((addon) => {
                      const installed = isInstalled(addon);
                      const installedAddon = addons.find((a) =>
                        storeRowMatchesInstalled(addon, a.manifest.id, a.manifest.baseURL, a.installSourceUrl)
                      );
                      const isActive = installedAddon?.manifest.id === activeAddonId;
                      const currentlyInstalling = isInstallingStoreAddon(source.id, addon.id);
                      const desc = (addon.description || '').trim();
                      const tagList = addon.tags?.length ? addon.tags : [];
                      const installFrom = rowInstallUrl(addon);
                      const pageHref =
                        typeof window !== 'undefined' ? window.location.href : 'https://localhost/';
                      let iconBase = typeof window !== 'undefined' ? window.location.origin : '';
                      if (installFrom) {
                        try {
                          iconBase = parentDirUrl(new URL(installFrom, pageHref).href);
                        } catch {
                          try {
                            iconBase = parentDirUrl(installFrom);
                          } catch {
                            /* keep origin */
                          }
                        }
                      } else if (source.registryUrl?.trim()) {
                        try {
                          iconBase = parentDirUrl(source.registryUrl.trim());
                        } catch {
                          /* keep */
                        }
                      }
                      const catalogIconSrc = addonIconImgSrc(addon.icon?.trim(), iconBase);

                      return (
                        <motion.div
                          key={`${source.id}-${addon.id}`}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'flex flex-col rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-4 gap-3 transition-colors min-w-0',
                            installed && isActive && 'ring-1 ring-white/30 border-zinc-600',
                            !installed && 'hover:border-zinc-600'
                          )}
                        >
                          <div className="flex gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                              {catalogIconSrc ? (
                                <img
                                  src={catalogIconSrc}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : addon.icon ? (
                                <span className="text-2xl leading-none" aria-hidden>
                                  {addon.icon}
                                </span>
                              ) : (
                                <Package className="w-7 h-7 text-zinc-500" strokeWidth={1.5} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-semibold text-white leading-tight break-words">
                                {addon.name}
                              </p>
                              <p className="text-xs text-zinc-500 mt-1 break-words">
                                {addon.author ? `by ${addon.author}` : 'Catalog'}
                                {' · '}v{addon.version}
                              </p>
                            </div>
                          </div>
                          {desc && (
                            <p className="text-[11px] text-zinc-400 normal-case tracking-normal leading-relaxed break-words whitespace-pre-wrap">
                              {desc}
                            </p>
                          )}
                          {tagList.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {tagList.slice(0, 6).map((t) => (
                                <span
                                  key={t}
                                  className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-white/25 text-white/90 bg-black/40"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-end pt-1">
                            {installed ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-600 px-4 py-2 text-xs font-semibold text-white">
                                <Check size={14} className="shrink-0" />
                                Installed
                              </span>
                            ) : currentlyInstalling ? (
                              <Loader2 size={18} className="text-white animate-spin" />
                            ) : (
                              <Button
                                type="button"
                                className="rounded-full bg-white text-black font-semibold px-5 py-2 h-auto hover:bg-white/90 shadow-none border-0"
                                onClick={() => void handleStoreInstall(addon, source.id)}
                              >
                                <Download size={16} className="mr-2 shrink-0" />
                                Install
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {!loading && !err && rows.length === 0 && storeSearch.trim() && (
                  <p className="text-sm text-muted-foreground py-2">No matches in {source.name}.</p>
                )}
              </div>
            );
          })}

          {storeSearch.trim() &&
            !catalogSources.some((s) => filterRows(catalogBySource[s.id]?.addons ?? []).length > 0) &&
            catalogSources.every((s) => {
              const c = catalogBySource[s.id];
              return c && !c.loading && !c.error;
            }) && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No addons matching &quot;{storeSearch}&quot; in any catalog.
              </div>
            )}
        </div>

        <div className="pt-2">
          <Button
            type="button"
            className="w-full h-12 rounded-2xl bg-[#262626] border border-zinc-700 text-white font-medium hover:bg-zinc-800"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Install module
          </Button>
        </div>
        </>
        )}

      </div>
      </ScrollArea>

      <Dialog
        open={eclipseSetup != null}
        onOpenChange={(open) => {
          if (!open) {
            setEclipseSetup(null);
            setEclipseManifestUrl('');
            setEclipseDialogBusy(false);
            setEclipseTestQuery('');
            setEclipseQuality('max');
            setEclipseUnowned(true);
          }
        }}
      >
        <DialogContent className="bg-black border-zinc-800 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-semibold leading-snug">
              {eclipseSetup?.addon.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-zinc-500 text-center leading-relaxed -mt-1">
            Connect to external music sources and stream tracks through this player after install.
          </p>

          <div className="rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-3 space-y-2 mt-2">
            <p className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 rounded-full border border-zinc-500" aria-hidden />
              Settings
            </p>
            <p className="text-[11px] text-zinc-500">Preferred streaming quality (stored on this device only).</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'mp3', label: 'MP3 320kbps' },
                { id: 'cd', label: 'CD — FLAC 16bit/44.1kHz' },
                { id: 'hi', label: 'Hi-Res — 24bit/44.1kHz–96kHz' },
                { id: 'max', label: 'Hi-Res Max — 24bit/192kHz' },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setEclipseQuality(o.id)}
                  className={cn(
                    'w-full text-left text-sm font-medium rounded-xl px-3 py-2.5 border transition-colors',
                    eclipseQuality === o.id
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-3 border-b border-zinc-800">
            <div>
              <p className="text-sm font-medium text-white">Use for unowned media</p>
              <p className="text-[11px] text-zinc-500">Stream unowned tracks using this module</p>
            </div>
            <Switch checked={eclipseUnowned} onCheckedChange={setEclipseUnowned} />
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Search size={16} className="text-zinc-400" />
              Test the module
            </p>
            <Input
              value={eclipseTestQuery}
              onChange={(e) => setEclipseTestQuery(e.target.value)}
              placeholder="Search for songs…"
              className="bg-zinc-900 border-zinc-700 rounded-xl text-white placeholder:text-zinc-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && eclipseTestQuery.trim()) void runEclipseTestSearch();
              }}
            />
            <Button
              type="button"
              className="w-full rounded-full bg-zinc-700 text-white font-semibold hover:bg-zinc-600"
              disabled={eclipseTestBusy || !eclipseTestQuery.trim()}
              onClick={() => void runEclipseTestSearch()}
            >
              {eclipseTestBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          <p className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800">
            If the catalog only lists a setup URL, open the provider page and paste the manifest URL below.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full border-zinc-700 bg-zinc-900 text-white justify-center"
            onClick={() => {
              const u = eclipseSetup?.addon.setupUrl;
              if (u) window.open(u, '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2 shrink-0" />
            Open setup page
          </Button>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Manifest URL</label>
            <Input
              value={eclipseManifestUrl}
              onChange={(e) => setEclipseManifestUrl(e.target.value)}
              placeholder="https://…/manifest.json"
              className="bg-zinc-900 border-zinc-700 rounded-xl text-white"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              className="flex-1 rounded-full bg-white text-black hover:bg-white/90 font-semibold"
              disabled={eclipseDialogBusy}
              onClick={async () => {
                if (!eclipseSetup) return;
                const tryUrl = eclipseManifestUrl.trim() || eclipseSetup.addon.setupUrl?.trim() || '';
                if (!tryUrl) return;
                setEclipseDialogBusy(true);
                setInstallError('');
                try {
                  const { manifest, eightspineInnerCode, eightspineKind } = await fetchManifest(tryUrl);
                  addAddon(manifest, {
                    sourceId: eclipseSetup.sourceId,
                    installSourceUrl: tryUrl,
                    eightspineInnerCode,
                    eightspineKind,
                  });
                  toast({ title: 'Installed', description: `${manifest.name} is ready. Try Test above or open Search.` });
                  setEclipseSetup(null);
                  setEclipseManifestUrl('');
                } catch (e: unknown) {
                  setInstallError(e instanceof Error ? e.message : 'Install failed');
                } finally {
                  setEclipseDialogBusy(false);
                }
              }}
            >
              {eclipseDialogBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Install'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-zinc-700 text-white"
              onClick={() => {
                setEclipseSetup(null);
                setEclipseManifestUrl('');
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
