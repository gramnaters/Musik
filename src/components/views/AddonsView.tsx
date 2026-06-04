'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAddonStore, getEightspineApi } from '@/stores/addonStore';
import { useStreamingStore } from '@/stores/streamingStore';
import { useUIStore } from '@/stores/uiStore';
import { addonTrackToTrack } from '@/lib/addon-track-map';
import { pickStreamUrlFromEightspineResult } from '@/lib/eightspine-runtime';
import { usePlayerStore } from '@/stores/playerStore';
import type { Track } from '@/types/music';

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
  Music,
  List,
  Box,
  GripHorizontal,
} from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
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
    setPlaybackPriorityIds,
    playbackPriorityIds,
    cleanupBrokenAddons,
    searchWithAddon,
    resolveStreamUrl,
    useModulesOnGo: storeUseModulesOnGo,
    useModuleFallback: storeUseModuleFallback,
    setUseModulesOnGo,
    setUseModuleFallback,
    checkForUpdates,
    installPendingUpdate,
    isUpdating,
    pendingUpdates,
    lastUpdateCheck,
  } = useAddonStore();


  const {
    connectionsCatalogSourceId,
    setConnectionsCatalogSourceId,
    connectionsScreen,
    setConnectionsScreen,
    navigateTo,
    setSearchQuery,
  } = useUIStore();

  const { addInstance, setSelectedUrl, apiInstances, streamingInstances, qobuzInstances } = useStreamingStore();

  const visibleSources = useMemo(
    () => sources.filter((s) => {
      if (hiddenModuleSourceIds.includes(s.id)) return false;
      const url = (s.registryUrl || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      if (url.includes('jsdelivr') || name.includes('jsdelivr') || name.includes('js delivr')) return false;
      return true;
    }),
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
  const [showReorder, setShowReorder] = useState(false);
  const [reorderItems, setReorderItems] = useState<string[]>([]);
  // Toggles persisted in addonStore — no local state needed


  const [catalogBySource, setCatalogBySource] = useState<
    Record<string, { addons: StoreAddon[]; loading: boolean; error: string }>
  >({});
  const [storeSearch, setStoreSearch] = useState('');
  const [eclipseSetup, setEclipseSetup] = useState<{ sourceId: string; addon: StoreAddon } | null>(null);
  const [eclipseManifestUrl, setEclipseManifestUrl] = useState('');
  const [eclipseDialogBusy, setEclipseDialogBusy] = useState(false);
  const [eclipseQuality, setEclipseQuality] = useState('max');
  const [eclipseFallback, setEclipseFallback] = useState('flexible');
  const [eclipseUnowned, setEclipseUnowned] = useState(true);
  const [eclipseTestQuery, setEclipseTestQuery] = useState('');
  const [eclipseTestBusy, setEclipseTestBusy] = useState(false);
  const [eclipseTestResults, setEclipseTestResults] = useState<Track[]>([]);
  const [eclipsePlayingTestId, setEclipsePlayingTestId] = useState<string | null>(null);
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

    // Direct URL match
    if (instBase) {
      for (const raw of rowUrls) {
        const trimmed = raw.replace(/\/$/, '');
        if (trimmed && trimmed === instBase) return true;
      }
    }

    // Match by last dotted segment — only when both IDs use dot notation (e.g. com.eclipse.community.spotiflac)
    const midSegments = mid.split('.');
    const ridSegments = rid.split('.');
    if (midSegments.length >= 2 && ridSegments.length >= 2) {
      const midLast = midSegments.pop();
      const ridLast = ridSegments.pop();
      if (midLast && ridLast && midLast === ridLast) return true;
    }

    // Origin match — only for token-based URLs where path looks like a token hex
    if (instBase) {
      try {
        const instUrl = new URL(instBase);
        const instOrigin = instUrl.origin.toLowerCase();
        // Only match by origin if the installed baseURL has a token-like path
        const hasTokenPath = /\/[a-f0-9]{10,}/i.test(instUrl.pathname);
        if (hasTokenPath) {
          for (const raw of rowUrls) {
            if (raw) {
              const rowOrigin = new URL(raw).origin.toLowerCase();
              if (rowOrigin === instOrigin) return true;
            }
          }
        }
      } catch {
        // ignore invalid URLs
      }
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

    const setupOnly =
      !addon.eightspineOnly &&
      (addon.setupUrl || '').trim() &&
      !(addon.manifestUrl || '').trim();

    setInstallingId(`${sourceId}:${addon.id}`);
    setInstallError('');
    setEclipseSetup(null);
    try {
      if ((addon as any).isInstance) {
        const type = (addon as any).instanceType || 'api';
        addInstance(type, addon.setupUrl || '', addon.name);
        setSelectedUrl(type, addon.setupUrl || '');
        toast({ title: 'Instance Added', description: `${addon.name} is now your active ${type.toUpperCase()} server.` });
        return;
      }

      if (setupOnly) {
        // Try to auto-resolve manifest, then show setup dialog
        let autoUrl = '';
        try {
          const { manifest } = await fetchManifest(installSource);
          autoUrl = manifest.baseURL ? manifest.baseURL + '/manifest.json' : installSource;
        } catch {
          autoUrl = '';
        }
        setEclipseSetup({ sourceId, addon });
        setEclipseManifestUrl(autoUrl);
        return;
      }

      const { manifest, eightspineInnerCode, eightspineKind } = await fetchManifest(installSource);
      addAddon(manifest, { sourceId, installSourceUrl: installSource, eightspineInnerCode, eightspineKind });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to install addon';
      setInstallError(message);
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

  /** Resolve the addon's functional base URL — calls fetchManifest if needed for token-based addons. */
  const resolveEclipseBase = useCallback(async (): Promise<string> => {
    // Prefer manifestUrl from the dialog
    const mu = eclipseManifestUrl.trim();
    if (mu) {
      const u = new URL(mu);
      return u.origin + u.pathname.replace(/\/[^/]*$/, '/');
    }
    // Fall back to setupUrl, but try to generate a token first
    const su = eclipseSetup?.addon.setupUrl?.trim();
    if (!su) throw new Error('No setup URL configured');
    try {
      const { manifest } = await fetchManifest(su);
      if (manifest.baseURL) return manifest.baseURL.replace(/\/$/, '') + '/';
    } catch {
      // Generate failed — use setupUrl directly (may 404 for token-based addons)
    }
    const u = new URL(su);
    return u.origin + u.pathname.replace(/\/[^/]*$/, '/');
  }, [eclipseManifestUrl, eclipseSetup, fetchManifest]);

  const runEclipseTestSearch = useCallback(async () => {
    const q = eclipseTestQuery.trim();
    if (!q) return;
    setEclipseTestBusy(true);
    setEclipseTestResults([]);
    setInstallError('');
    try {
      const installed = eclipseSetup ? addons.find((a) => a.manifest.id === eclipseSetup.addon.id) : null;
      if (installed?.eightspineInnerCode) {
        const api = await getEightspineApi(installed);
        if (typeof api.searchTracks !== 'function') {
          throw new Error('Module has no searchTracks() function');
        }
        const results = await searchWithAddon(installed.manifest.id, q);
        const storeError = useAddonStore.getState().error;
        if (storeError) throw new Error(storeError);
        const tracks = (results.tracks || []).map(addonTrackToTrack);
        setEclipseTestResults(tracks);
        if (tracks.length === 0) {
          toast({ title: 'No results', description: `No tracks found for "${q}".` });
        }
      } else {
        const base = await resolveEclipseBase();
        const proxyUrl = `/api/addons/proxy?url=${encodeURIComponent(`${base}search?q=${encodeURIComponent(q)}&limit=10`)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Search returned HTTP ${res.status}${body ? ': ' + body.slice(0, 80) : ''}`);
        }
        const data = await res.json();
        const rawTracks: any[] = data.tracks || data.data?.items || data.items || data.results || [];
        const tracks: Track[] = rawTracks.map((t: any, i: number) => ({
          id: String(t.id ?? t.trackId ?? i),
          title: String(t.title ?? t.name ?? 'Unknown'),
          artist: String(t.artist ?? t.artistName ?? t.artists?.[0]?.name ?? 'Unknown'),
          album: t.album ? (typeof t.album === 'string' ? t.album : t.album.title ?? t.album.name) : undefined,
          albumCover: t.artworkURL ?? t.albumCover ?? t.album?.cover ?? t.cover,
          duration: typeof t.duration === 'number' ? t.duration : undefined,
          addonTrackId: String(t.id ?? ''),
          streamURL: t.streamURL ?? t.url,
          quality: t.audioQuality ?? t.quality,
        }));
        setEclipseTestResults(tracks);
        if (tracks.length === 0) {
          const hasOther = Array.isArray(data.albums) && data.albums.length > 0 ||
            Array.isArray(data.artists) && data.artists.length > 0 ||
            Array.isArray(data.playlists) && data.playlists.length > 0;
          if (hasOther) {
            toast({
              title: 'No tracks',
              description: `No tracks found, but the addon returned ${data.albums?.length || 0} album(s), ${data.artists?.length || 0} artist(s), ${data.playlists?.length || 0} playlist(s). Try a different query.`,
            });
          } else {
            toast({ title: 'No results', description: `No tracks found for "${q}".` });
          }
        }
      }
    } catch (e: unknown) {
      toast({
        title: 'Search failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setEclipseTestBusy(false);
    }
  }, [eclipseTestQuery, resolveEclipseBase, eclipseSetup, addons, searchWithAddon]);

  const playEclipseTestTrack = useCallback(async (track: Track) => {
    if (!track.id) return;
    setEclipsePlayingTestId(track.addonTrackId || track.id);
    try {
      const installed = eclipseSetup ? addons.find((a) => a.manifest.id === eclipseSetup.addon.id) : null;
      let streamUrl = '';
      if (installed?.eightspineInnerCode) {
        const api = await getEightspineApi(installed);
        const getTrackStreamUrl = (api.getTrackStreamUrl ?? api.getStreamUrl ?? api.getTrackUrl ?? api.streamUrl) as Function | undefined;
        if (typeof getTrackStreamUrl === 'function') {
          const targetId = track.addonTrackId || track.id;
          const out = getTrackStreamUrl.length >= 3
            ? await getTrackStreamUrl(targetId, 'HIGH', { settings: {} })
            : getTrackStreamUrl.length >= 2
              ? await getTrackStreamUrl(targetId, 'HIGH')
              : await getTrackStreamUrl(targetId);
          streamUrl = pickStreamUrlFromEightspineResult(out);
        }
        if (!streamUrl) throw new Error('Module did not return a stream URL');
        if (!streamUrl.startsWith('/api/') && !streamUrl.startsWith('blob:')) {
          streamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
        }
      } else {
        const base = await resolveEclipseBase();
        const qualityParam = eclipseQuality ? `?quality=${encodeURIComponent(eclipseQuality)}` : '';
        const proxyUrl = `/api/addons/proxy?url=${encodeURIComponent(`${base}stream/${track.addonTrackId || track.id}${qualityParam}`)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const data = await res.json();
          streamUrl = data.url ?? data.streamURL ?? data.streamUrl ?? '';
        }
        if (!streamUrl) throw new Error('Could not resolve stream URL');
      }
      const playTrack: Track = { ...track, streamURL: streamUrl };
      usePlayerStore.getState().play(playTrack, [playTrack], 0);
    } catch (e: unknown) {
      toast({
        title: 'Playback failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setEclipsePlayingTestId(null);
    }
  }, [resolveEclipseBase, eclipseQuality, eclipseSetup, addons]);

  const isInstalled = (row: StoreAddon) => {
    if ((row as any).isInstance) {
      const type = (row as any).instanceType || 'api';
      if (type === 'api') return apiInstances.some((inst) => inst.url === row.setupUrl);
      if (type === 'streaming') return streamingInstances.some((inst) => inst.url === row.setupUrl);
      if (type === 'qobuz') return qobuzInstances.some((inst) => inst.url === row.setupUrl);
    }
    return addons.some((a) =>
      storeRowMatchesInstalled(row, a.manifest.id, a.manifest.baseURL, a.installSourceUrl)
    );
  };

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
      : list.filter((a) => {
          const n = (a.name || '').toLowerCase();
          const d = (a.description || '').toLowerCase();
          // Exclude jsDelivr mirrors from 8SPINE community registry
          if (n.includes('jsdelivr') || n.includes('js delivr') || n.includes('mirror')) return false;
          if (d.includes('jsdelivr') || d.includes('js delivr')) return false;
          return true;
        });

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

  return (
    <>
      <ScrollArea className="h-full min-h-0 custom-scrollbar">
        <div className="p-4 md:p-6 space-y-5 pb-40 bg-black text-white min-h-full">
        {connectionsScreen === 'home' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pt-1 pb-1">
              <button
                type="button"
                onClick={() => navigateTo('home')}
                className="h-10 w-10 flex items-center justify-center -ml-1.5 text-white hover:bg-white/5 rounded-full transition-colors"
                aria-label="Back"
              >
                <ChevronLeft size={22} strokeWidth={2} />
              </button>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => checkForUpdates()}
                  disabled={isUpdating}
                  className="rounded-full bg-white/10 text-white text-sm font-semibold px-4 py-2 hover:bg-white/20 shrink-0 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating ? (
                    <><Loader2 size={14} className="animate-spin" /> Checking...</>
                  ) : (
                    'Check Updates'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionsScreen('sources')}
                  className="rounded-full bg-white text-black text-sm font-semibold px-5 py-2 hover:bg-white/90 shrink-0"
                >
                  Sources
                </button>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="rounded-full bg-white text-black w-9 h-9 flex items-center justify-center hover:bg-white/90 shrink-0"
                  title="Install custom module"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {addons.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-10 rounded-3xl border border-dashed border-zinc-800">
                No modules installed. Tap Install module to browse catalogs.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Section 1 — Global Settings */}
                <div className="bg-[#0a0a0a] rounded-[28px] p-6 space-y-6 border border-white/[0.06] sm:max-w-[calc(66.666%-0.5rem)] shadow-lg shadow-black/30">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Music className="w-5 h-5 text-white mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-white leading-snug">Use modules to play music on the go</p>
                        <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">Stream unowned tracks using installed modules</p>
                      </div>
                    </div>
                    <Switch checked={storeUseModulesOnGo} onCheckedChange={setUseModulesOnGo} />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-white leading-snug">Module Fallback</p>
                      <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">If playback fails, try the next active module</p>
                    </div>
                    <Switch checked={storeUseModuleFallback} onCheckedChange={setUseModuleFallback} />
                  </div>

                  <div className="h-px bg-zinc-800" />

                  <button
                    type="button"
                    className="flex items-center justify-between w-full"
                    onClick={() => {
                      setReorderItems([...orderedPlaybackSearchIds]);
                      setShowReorder(true);
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <List className="w-5 h-5 text-white" />
                      <span className="text-[14px] font-semibold text-white">Reorder Active Modules</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8A8A8A]" />
                  </button>
                </div>

                {/* Section 2 — Installed Modules */}
                <div>
                  <h2 className="text-[13px] font-semibold tracking-[0.04em] text-[#8A8A8A] px-0.5 uppercase">
                    Installed Modules
                    {lastUpdateCheck && Object.keys(pendingUpdates).length === 0 && lastUpdateCheck > Date.now() - 3000 && (
                      <span className="ml-2 text-[10px] text-green-400 font-normal normal-case">All up to date</span>
                    )}
                    {Object.keys(pendingUpdates).length > 0 && (
                      <span className="ml-2 text-[10px] text-cyan-400 font-normal normal-case">{Object.keys(pendingUpdates).length} update{Object.keys(pendingUpdates).length > 1 ? 's' : ''} available</span>
                    )}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                    {addons.map((addon) => {
                      const tagList = (addon.manifest.resources || []).slice(0, 8);
                      return (
                        <div
                          key={addon.manifest.id}
                          className="bg-[#1A1A1A] rounded-[24px] p-5 space-y-4"
                        >
                          {/* Top row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-11 h-11 rounded-2xl bg-[#262626] flex items-center justify-center shrink-0">
                                <Box className="w-[18px] h-[18px] text-zinc-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-white truncate max-w-[140px]">{addon.manifest.name}</p>
                                  <span className="shrink-0 text-[11px] text-zinc-500">v{addon.manifest.version}</span>
                                  {pendingUpdates[addon.manifest.id] && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); installPendingUpdate(addon.manifest.id); }}
                                      className="shrink-0 text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold bg-cyan-400/10 rounded-md px-2 py-0.5"
                                      title={`Update to v${pendingUpdates[addon.manifest.id]}`}
                                    >
                                      Update available
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                              <Switch checked={addon.enabled} onCheckedChange={() => toggleAddon(addon.manifest.id)} />
                            </div>
                          </div>

                          <p className="text-[13px] text-[#8A8A8A]">Installed user module.</p>

                          {tagList.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {tagList.map((t) => (
                                <span
                                  key={t}
                                  className="text-[11px] font-medium text-[#CCCCCC] bg-[#262626] rounded-full px-3 py-1.5"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Bottom actions */}
                          <div className="flex gap-3 pt-1">
                            {confirmDelete === addon.manifest.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 h-12 rounded-[20px] font-semibold text-sm"
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
                                  className="h-12 rounded-[20px] border-zinc-700 font-semibold text-sm"
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
                                  className="flex-1 h-12 rounded-[20px] border-zinc-700 bg-[#262626] text-zinc-300 hover:bg-zinc-700 font-semibold text-sm"
                                  onClick={() => setConfirmDelete(addon.manifest.id)}
                                >
                                  Uninstall
                                </Button>
                                <Button
                                  type="button"
                                  className="flex-1 h-12 rounded-[20px] bg-white text-black font-semibold text-sm hover:bg-white/90"
                                  onClick={() => {
                                    const s = sources.find((s2) => s2.id === addon.sourceId) || sources[0];
                                    setEclipseSetup({ sourceId: s?.id || 'custom', addon: {
                                      id: addon.manifest.id,
                                      name: addon.manifest.name,
                                      description: addon.manifest.description,
                                      version: addon.manifest.version,
                                      author: addon.manifest.author,
                                      eightspineOnly: !!addon.eightspineInnerCode,
                                      setupUrl: addon.manifest.baseURL,
                                      manifestUrl: addon.manifest.baseURL ? addon.manifest.baseURL + '/manifest.json' : undefined,
                                    } as StoreAddon });
                                    setEclipseManifestUrl(addon.manifest.baseURL ? addon.manifest.baseURL + '/manifest.json' : '');
                                    setEclipseQuality(String(addon.config?.quality || 'max'));
                                    setEclipseFallback(String(addon.config?.fallback || 'flexible'));
                                    setEclipseUnowned(addon.config?.unowned !== false);
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
                </div>
              </div>
            )}

          </>
        )}

        {/* Install dialog — always available, opened via + button in header */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-zinc-950 border-white/20 text-foreground sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">Install Module</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Module manifest URL or base URL (any format)</label>
                <Input
                  placeholder="https://example.com/addon/manifest.json"
                  value={installUrl}
                  onChange={(e) => setInstallUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && installUrl.trim()) handleInstall(installUrl); }}
                  className="bg-background border-border text-foreground"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground mt-2">Supports 8SPINE, Eclipse, REST API, and custom modules — just paste the URL.</p>
              </div>
              {installError && <p className="text-sm text-red-400">{installError}</p>}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleInstall(installUrl)}
                  disabled={!installUrl.trim() || installing}
                  className="flex-1 bg-white text-black font-semibold hover:bg-white/90 rounded-full"
                >
                  {installing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Install
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-zinc-700 font-semibold"
                  onClick={() => {
                    setDialogOpen(false);
                    setConnectionsScreen('browse');
                    setConnectionsCatalogSourceId(null);
                  }}
                >
                  Browse Sources
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
            <Button
              variant="outline"
              className="border-zinc-700 bg-[#262626] text-white rounded-full hover:bg-zinc-800"
              onClick={() => setDialogOpen(true)}
            >
              <Globe size={16} className="mr-1" />
              Custom URL
            </Button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
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
                            ) : addon.setupUrl && !addon.manifestUrl ? (
                              <Button
                                type="button"
                                className="rounded-full bg-white text-black font-semibold px-5 py-2 h-auto hover:bg-white/90 shadow-none border-0"
                                onClick={() => void handleStoreInstall(addon, source.id)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                Configure
                              </Button>
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

      {/* Module Settings right-side panel */}
      {eclipseSetup != null && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60"
            onClick={() => {
              setEclipseSetup(null);
              setEclipseManifestUrl('');
              setEclipseDialogBusy(false);
              setEclipseTestQuery('');
              setEclipseTestResults([]);
              setEclipsePlayingTestId(null);
              setEclipseQuality('max');
              setEclipseFallback('flexible');
              setEclipseUnowned(true);
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
            className="fixed right-0 top-0 bottom-0 z-[110] w-full max-w-md bg-black border-l border-white/10 flex flex-col"
          >
            <div className="flex flex-col h-full">
              <div className="shrink-0 px-5 pt-12 pb-3">
                <div className="flex items-center justify-center relative">
                  <button
                    type="button"
                    onClick={() => {
                      setEclipseSetup(null);
                      setEclipseManifestUrl('');
                      setEclipseTestResults([]);
                      setEclipsePlayingTestId(null);
                    }}
                    className="absolute left-0 h-9 w-9 flex items-center justify-center text-white hover:bg-white/5 rounded-full transition-colors"
                    aria-label="Back"
                  >
                    <ChevronLeft size={22} strokeWidth={2} />
                  </button>
                  <h2 className="text-lg font-medium text-white tracking-tight">
                    {eclipseSetup?.addon.name}
                  </h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-[18px] custom-scrollbar">
                {/* Module Info Card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#121212] rounded-[28px] p-6 space-y-4 border border-white/[0.05]"
                >
                  <div className="flex gap-4">
                    <div className="w-[72px] h-[72px] rounded-2xl bg-[#262626] flex items-center justify-center shrink-0 border border-zinc-800">
                      <Box className="w-7 h-7 text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-[17px] font-semibold text-white leading-tight">
                        {eclipseSetup?.addon.name}
                      </p>
                      <p className="text-[13px] text-zinc-500 mt-0.5">
                        Version {eclipseSetup?.addon.version} by {eclipseSetup?.addon.author}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const chips = eclipseSetup?.addon.tags;
                    if (!chips || chips.length === 0) {
                      const inst = addons.find(a => a.manifest.id === eclipseSetup?.addon.id);
                      const res = inst?.manifest.resources;
                      if (!res || res.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-2">
                          {res.map(r => (
                            <span key={r} className="text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full border border-white/20 text-white/90 bg-black/30">
                              {r === 'search' ? 'Search' : r === 'stream' ? 'Stream' : r === 'catalog' ? 'Catalog' : r}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-wrap gap-2">
                        {chips.map(t => (
                          <span key={t} className="text-[10px] font-semibold tracking-wide px-3 py-1 rounded-full border border-white/20 text-white/90 bg-black/30">
                            {t}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  <p className="text-[13px] text-zinc-400 leading-relaxed">
                    {eclipseSetup?.addon.description || 'Connect to external music sources and stream tracks directly.'}
                  </p>
                </motion.div>

                {/* Settings Card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  className="bg-[#121212] rounded-[28px] p-6 space-y-4 border border-white/[0.05]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Settings</p>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Preferred streaming quality (stored locally on device only)
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { id: 'mp3', label: 'MP3 320Kbps' },
                      { id: 'cd', label: 'CD — FLAC 16bit / 44.1kHz' },
                      { id: 'hi', label: 'Hi-Res — 24bit / 44.1–96kHz' },
                      { id: 'max', label: 'Hi-Res Max — 24bit / 192kHz' },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setEclipseQuality(o.id)}
                        className={cn(
                          'w-full text-left text-sm font-medium rounded-[18px] px-4 py-3 border transition-all duration-150',
                          eclipseQuality === o.id
                            ? 'bg-white text-black border-white'
                            : 'bg-transparent text-zinc-300 border-zinc-700 hover:border-zinc-500'
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Quality Fallback */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="bg-[#121212] rounded-[28px] p-6 space-y-4 border border-white/[0.05]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Quality Fallback</p>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Allow fallback if preferred quality is unavailable
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { id: 'flexible', label: 'Flexible' },
                      { id: 'strict', label: 'Strict' },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setEclipseFallback(o.id)}
                        className={cn(
                          'w-full text-left text-sm font-medium rounded-[18px] px-4 py-3 border transition-all duration-150',
                          eclipseFallback === o.id
                            ? 'bg-white text-black border-white'
                            : 'bg-transparent text-zinc-300 border-zinc-700 hover:border-zinc-500'
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Use for unowned media */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                  className="flex items-center justify-between gap-3 bg-[#121212] rounded-[28px] px-6 py-5 border border-white/[0.05]"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Download className="w-[18px] h-[18px] text-white mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white leading-snug">Use for unowned media</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">Stream unowned tracks using this module</p>
                    </div>
                  </div>
                  <Switch checked={eclipseUnowned} onCheckedChange={setEclipseUnowned} />
                </motion.div>

                {/* Test the module */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                  className="bg-[#121212] rounded-[28px] p-6 space-y-4 border border-white/[0.05]"
                >
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Search size={16} className="text-zinc-400" />
                    Test the module
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={eclipseTestQuery}
                        onChange={(e) => setEclipseTestQuery(e.target.value)}
                        placeholder="Search for songs..."
                        className="bg-black border-zinc-700 rounded-[14px] text-white placeholder:text-zinc-600 h-14 pr-9 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && eclipseTestQuery.trim()) void runEclipseTestSearch();
                        }}
                      />
                      {eclipseTestQuery && (
                        <button
                          type="button"
                          onClick={() => { setEclipseTestQuery(''); setEclipseTestResults([]); }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <Button
                      type="button"
                      className="shrink-0 rounded-[14px] bg-white text-black font-semibold px-5 h-14 hover:bg-white/90 shadow-none border-0"
                      disabled={eclipseTestBusy || !eclipseTestQuery.trim()}
                      onClick={() => void runEclipseTestSearch()}
                    >
                      {eclipseTestBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                    </Button>
                  </div>

                  {eclipseTestResults.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar -mx-1 px-1">
                      <p className="text-[11px] text-zinc-500 font-medium">{eclipseTestResults.length} results</p>
                      {eclipseTestResults.slice(0, 8).map((t, i) => (
                        <button
                          key={t.id || i}
                          type="button"
                          className="w-full flex items-center gap-3 py-2.5 rounded-[14px] hover:bg-zinc-800/50 transition-colors text-left group"
                          onClick={() => void playEclipseTestTrack(t)}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                            {t.albumCover ? (
                              <img src={t.albumCover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-5 h-5 text-zinc-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-white truncate leading-snug">{t.title}</p>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {t.artist}{t.album ? ` · ${t.album}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.quality && (
                              <span className={cn(
                                'text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md',
                                t.quality === 'LOSSLESS' || t.quality === 'HI-RES'
                                  ? 'bg-emerald-900/50 text-emerald-300'
                                  : 'bg-zinc-800 text-zinc-400'
                              )}>
                                {t.quality === 'HI-RES' ? 'HI-RES' : t.quality}
                              </span>
                            )}
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                              {eclipsePlayingTestId === (t.addonTrackId || t.id) ? (
                                <Loader2 size={14} className="animate-spin text-white" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-0.5"><polygon points="5,3 19,12 5,21"/></svg>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {eclipseTestResults.length === 0 && !eclipseTestBusy && (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                      <Music className="w-10 h-10 mb-3" />
                      <p className="text-sm font-medium text-zinc-500">Search for music</p>
                    </div>
                  )}
                </motion.div>

                {/* Setup / Manifest — hidden for 8SPINE modules */}
                {!eclipseSetup?.addon.eightspineOnly && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.25 }}
                    className="bg-[#121212] rounded-[28px] p-6 space-y-4 border border-white/[0.05]"
                  >
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      If setup URL exists, open provider page and paste manifest.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-[18px] border-zinc-700 bg-zinc-900/50 text-white justify-center h-11 text-sm"
                      onClick={() => {
                        const u = eclipseManifestUrl || eclipseSetup?.addon.setupUrl;
                        if (u) try { window.open(new URL(u).origin, '_blank', 'noopener,noreferrer'); } catch {}
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2 shrink-0" />
                      Open setup page
                    </Button>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-500 font-medium">Manifest URL</label>
                      <Input
                        value={eclipseManifestUrl}
                        onChange={(e) => setEclipseManifestUrl(e.target.value)}
                        placeholder="https://.../manifest.json"
                        className="bg-black border-zinc-700 rounded-[14px] text-white text-sm h-11"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Fixed footer */}
              <div className="shrink-0 px-5 pt-3 pb-5 border-t border-zinc-800/50">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-[18px] border-zinc-700 text-white h-14 text-sm font-semibold"
                    onClick={() => {
                      setEclipseSetup(null);
                      setEclipseManifestUrl('');
                      setEclipseTestResults([]);
                      setEclipsePlayingTestId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-[18px] bg-white text-black hover:bg-white/90 font-semibold h-14 text-sm"
                    disabled={eclipseDialogBusy}
                    onClick={async () => {
                      if (!eclipseSetup) return;
                      setEclipseDialogBusy(true);
                      setInstallError('');
                      try {
                        const isReconfig = addons.some(a => a.manifest.id === eclipseSetup.addon.id);
                        if (eclipseSetup.addon.eightspineOnly) {
                          const existing = addons.find(a => a.manifest.id === eclipseSetup.addon.id);
                          if (existing) {
                            addAddon(existing.manifest, {
                              sourceId: eclipseSetup.sourceId,
                              installSourceUrl: existing.installSourceUrl,
                              eightspineInnerCode: existing.eightspineInnerCode,
                              eightspineKind: existing.eightspineKind,
                              config: {
                                quality: eclipseQuality,
                                fallback: eclipseFallback,
                                unowned: eclipseUnowned,
                              },
                            });
                          }
                          toast({ title: 'Configured', description: `${eclipseSetup.addon.name} settings saved.` });
                          setEclipseSetup(null);
                          setEclipseManifestUrl('');
                          setEclipseTestResults([]);
                          setEclipsePlayingTestId(null);
                        } else {
                          const tryUrl = eclipseManifestUrl.trim() || eclipseSetup.addon.setupUrl?.trim() || '';
                          if (!tryUrl) throw new Error('No manifest URL configured');
                          const { manifest, eightspineInnerCode, eightspineKind } = await fetchManifest(tryUrl);
                          addAddon(manifest, {
                            sourceId: eclipseSetup.sourceId,
                            installSourceUrl: tryUrl,
                            eightspineInnerCode,
                            eightspineKind,
                            config: {
                              quality: eclipseQuality,
                              fallback: eclipseFallback,
                              unowned: eclipseUnowned,
                            },
                          });
                          toast({ title: isReconfig ? 'Configured' : 'Installed', description: `${manifest.name} is ready.` });
                          setEclipseSetup(null);
                          setEclipseManifestUrl('');
                          setEclipseTestResults([]);
                          setEclipsePlayingTestId(null);
                        }
                      } catch (e: unknown) {
                        setInstallError(e instanceof Error ? e.message : 'Install failed');
                      } finally {
                        setEclipseDialogBusy(false);
                      }
                    }}
                  >
                    {eclipseDialogBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : (addons.some(a => a.manifest.id === (eclipseSetup?.addon.id || '')) ? 'Save' : 'Install')}
                  </Button>
                </div>
                {installError && (
                  <p className="text-[11px] text-red-400 text-center mt-2">{installError}</p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Reorder Modules right-side panel */}
      {showReorder && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60"
            onClick={() => setShowReorder(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
            className="fixed right-0 top-0 bottom-0 z-[110] w-full max-w-md bg-black border-l border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 pt-12 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowReorder(false)}
                className="h-9 w-9 flex items-center justify-center -ml-1 text-white hover:bg-white/5 rounded-full transition-colors"
                aria-label="Back"
              >
                <ChevronLeft size={22} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaybackPriorityIds(reorderItems);
                  setShowReorder(false);
                }}
                className="text-white font-semibold text-sm hover:text-white/80 transition-colors"
              >
                Done
              </button>
            </div>

            <h1 className="text-[28px] font-bold text-white px-5 mt-0 leading-tight shrink-0">
              Reorder Modules
            </h1>

            <p className="text-[13px] text-white/65 px-5 mt-2 leading-relaxed shrink-0">
              Drag to change priority. Top module is used first.
            </p>

            <div className="flex-1 overflow-y-auto px-5 mt-5 custom-scrollbar">
              {reorderItems.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-10">
                  No modules available to reorder.
                </p>
              ) : (
                <Reorder.Group axis="y" values={reorderItems} onReorder={setReorderItems} className="space-y-3 pb-10">
                  {reorderItems.map((id) => {
                    const a = addons.find((ad) => ad.manifest.id === id);
                    if (!a) return null;
                    return (
                      <Reorder.Item key={id} value={id} className="list-none">
                        <motion.div
                          whileDrag={{
                            scale: 1.02,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            zIndex: 10,
                          }}
                          className="rounded-[20px] bg-gradient-to-b from-[#111111] to-[#141414] border border-[rgba(255,255,255,.06)] h-[72px] flex items-center px-4 gap-3 select-none cursor-grab active:cursor-grabbing"
                        >
                          <GripHorizontal className="w-5 h-5 text-zinc-500 shrink-0" />
                          <span className="flex-1 text-[16px] font-medium text-white leading-tight truncate min-w-0">
                            {a.manifest.name}
                          </span>
                          <span className="text-[11px] text-zinc-500 shrink-0 whitespace-nowrap">
                            #{addons.indexOf(a) + 1}
                          </span>
                        </motion.div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              )}
            </div>
          </motion.div>
        </>
      )}
    </>
  );
}
