import type { Track } from '@/types/music';
import type { AddonTrack } from '@/types/addon';
import { toast } from '@/hooks/use-toast';
import { inferFormatFromUrl, classifyAudioDelivery } from '@/lib/audio-quality';
import { useAddonStore } from '@/stores/addonStore';

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

/** Prefer MIME from the actual HTTP response (after /api/stream proxy). */
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

/**
 * Streams through our /api/stream proxy (same-origin) and saves as a file.
 * Filename extension follows the upstream Content-Type when the proxy exposes it.
 */
export async function downloadCurrentTrack(track: Track | null): Promise<void> {
  if (!track) {
    toast({ title: 'Nothing playing', variant: 'destructive' });
    return;
  }
  let upstream = resolveStreamURL(track);
  if (!upstream) {
    upstream = await resolveAddonUpstream(track);
  }
  if (!upstream) {
    toast({
      title: 'No stream URL',
      description: 'Play the track first, or pick a result that streams from your addon.',
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
    const ext = pickExtension(track, ct);
    const delivery = classifyAudioDelivery(track);
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
    if (!losslessFile && delivery === 'lossless_hint') {
      description += ' Catalog suggests lossless, but this URL delivered a compressed format.';
    } else if (!losslessFile) {
      description += ' Most addon/CDN streams are MP3 or AAC even when the catalog says Hi‑Res.';
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
