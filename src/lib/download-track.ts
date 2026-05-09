import type { Track } from '@/types/music';
import { toast } from '@/hooks/use-toast';

function resolveStreamURL(track: Track): string | null {
  const t = track as Track & { url?: string };
  return (t.streamURL || t.url || null)?.trim() || null;
}

function safeFilename(track: Track): string {
  const base = `${track.title}`.replace(/[<>:"/\\|?*]+/g, '').trim().slice(0, 120) || 'track';
  const extGuess = /\.(mp3|m4a|aac|opus|wav|ogg|flac)(\?|$)/i.exec(track.streamURL || '')?.[1] || 'mp3';
  return `${base}.${extGuess}`;
}

/**
 * Streams through our /api/stream proxy (same-origin) and saves as a file — similar to tidal.wtf-style grabs.
 */
export async function downloadCurrentTrack(track: Track | null): Promise<void> {
  if (!track) {
    toast({ title: 'Nothing playing', variant: 'destructive' });
    return;
  }
  const upstream = resolveStreamURL(track);
  if (!upstream) {
    toast({ title: 'No stream URL', description: 'Play a track with an audio URL first.', variant: 'destructive' });
    return;
  }

  const proxyURL = `/api/stream?url=${encodeURIComponent(upstream)}`;
  toast({ title: 'Starting download…' });

  try {
    const res = await fetch(proxyURL);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = safeFilename(track);
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
    toast({ title: 'Download saved' });
  } catch {
    toast({ title: 'Download failed', description: 'The source may block saving or timed out.', variant: 'destructive' });
  }
}
