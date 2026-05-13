import type { Track } from '@/types/music';
import type { AddonTrack } from '@/types/addon';
import { toast } from '@/hooks/use-toast';
import { inferFormatFromUrl, classifyAudioDelivery } from '@/lib/audio-quality';
import { useAddonStore } from '@/stores/addonStore';
import { resolvePlayableUrlViaAddonChain } from '@/lib/addon-stream-resolve';

function resolveStreamURL(track: Track): string | null {
  const t = track as Track & { url?: string };
  return (t.streamURL || t.url || null)?.trim() || null;
}

async function resolveAddonUpstream(track: Track): Promise<string | null> {
  if (!track.addonId || !track.addonTrackId) return null;
  try {
    const proxied = await useAddonStore.getState().resolveStreamUrl({
      id: track.addonTrackId,
      title: track.title,
      artist: track.artist,
      addonId: track.addonId,
      streamURL: track.streamURL,
    } as AddonTrack);
    const m = proxied.match(/^\/api\/stream\?url=(.+)$/);
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  } catch {
    return null;
  }
}

function extensionFromContentType(ct: string | null | undefined): string | undefined {
  if (!ct) return undefined;
  const base = ct.split(';')[0].trim().toLowerCase();
  if (base.includes('flac') || base === 'audio/x-flac') return 'flac';
  if (base.includes('wav')) return 'wav';
  if (base.includes('ogg')) return 'ogg';
  if (base.includes('opus')) return 'opus';
  if (base.includes('mpeg') || base === 'audio/mp3') return 'mp3';
  if (base.includes('aac') || base.includes('mp4') || base === 'audio/x-m4a') return 'm4a';
  if (base === 'application/octet-stream') return undefined;
  return undefined;
}

function safeFilename(track: Track, ext: string): string {
  const base = `${track.title}`.replace(/[<>:"/\\|?*]+/g, '').trim().slice(0, 120) || 'track';
  const cleanExt = ext.replace(/^\./, '').toLowerCase() || 'mp3';
  return `${base}.${cleanExt}`;
}

function pickExtension(track: Track, contentType: string | null): string {
  const fromMime = extensionFromContentType(contentType);
  if (fromMime) return fromMime;
  const fromUrl = inferFormatFromUrl(resolveStreamURL(track) || track.streamURL);
  if (fromUrl) return fromUrl;
  const fromPath = /\.(mp3|m4a|aac|opus|wav|ogg|flac)(\?|$)/i.exec(track.streamURL || '')?.[1];
  if (fromPath) return fromPath.toLowerCase();
  return 'mp3';
}

function humanFormat(ext: string, contentType: string | null): string {
  const e = ext.toLowerCase();
  if (e === 'flac') return 'FLAC (lossless)';
  if (e === 'wav') return 'WAV (lossless PCM)';
  if (e === 'mp3') return 'MP3 (lossy)';
  if (e === 'm4a' || e === 'aac') return 'AAC (typically lossy)';
  if (contentType) return contentType.split(';')[0].trim();
  return e.toUpperCase();
}

function deliveryRank(track: Track, url: string): number {
  const d = classifyAudioDelivery({ ...track, streamURL: url, format: inferFormatFromUrl(url) });
  if (d === 'lossless_hint') return 3;
  if (d === 'unknown') return 1;
  return 0;
}

async function pickBestDownloadUrl(track: Track): Promise<string | null> {
  const direct = resolveStreamURL(track);
  const addonUp = await resolveAddonUpstream(track);
  const ordered = useAddonStore.getState().getPlaybackOrderedSearchAddonIds();
  const chain =
    ordered.length > 0
      ? await resolvePlayableUrlViaAddonChain(
          track,
          ordered,
          useAddonStore.getState().searchWithAddon,
          useAddonStore.getState().resolveStreamUrl
        )
      : null;

  const candidates: { url: string; rank: number }[] = [];
  const push = (url: string | null | undefined) => {
    if (!url?.trim()) return;
    const u = url.trim();
    candidates.push({ url: u, rank: deliveryRank(track, u) });
  };

  push(direct);
  push(addonUp);
  push(chain);

  if (candidates.length === 0) return null;

  let best = candidates[0]!;
  for (const c of candidates) {
    if (c.rank > best.rank) best = c;
  }

  const catalogHi =
    classifyAudioDelivery(track) === 'lossless_hint' ||
    /lossless|flac|alac|hi[\s-]?res|hires|master|mqaa|studio/i.test(track.quality || '');
  if (catalogHi && best.rank < 3) {
    const losslessHit = candidates.find((c) => c.rank >= 3);
    if (losslessHit) return losslessHit.url;
  }

  return best.url;
}

export async function downloadCurrentTrack(track: Track | null): Promise<void> {
  if (!track) {
    toast({ title: 'Nothing playing', variant: 'destructive' });
    return;
  }

  const upstream = await pickBestDownloadUrl(track);
  if (!upstream) {
    toast({
      title: 'No stream URL',
      description: 'Install a streaming module, or pick a row that resolves from your addon.',
      variant: 'destructive',
    });
    return;
  }

  const proxyURL = `/api/stream?url=${encodeURIComponent(upstream)}`;
  toast({ title: 'Starting download…' });

  try {
    const res = await fetch(proxyURL);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const ct = res.headers.get('Content-Type');
    const trackForExt = { ...track, streamURL: upstream };
    const ext = pickExtension(trackForExt, ct);
    const losslessFile = ext === 'flac' || ext === 'wav';

    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = safeFilename(track, ext);
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);

    const fmt = humanFormat(ext, ct);
    let description = `Saved as ${fmt}.`;
    const catalogHi =
      classifyAudioDelivery(track) === 'lossless_hint' ||
      /lossless|flac|alac|hi[\s-]?res|hires|master/i.test(track.quality || '');
    if (!losslessFile && catalogHi) {
      description +=
        ' Catalog lists a lossless tier, but every resolved URL was compressed (preview or CDN). Use a module that exposes FLAC for this track if you need a lossless file.';
    } else if (!losslessFile) {
      description += ' File matches the stream the player used.';
    }

    toast({ title: 'Download saved', description });
  } catch {
    toast({
      title: 'Download failed',
      description: 'The source may block saving or timed out.',
      variant: 'destructive',
    });
  }
}
