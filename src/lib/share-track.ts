import type { Track } from '@/types/music';

/** OS share sheet when available; otherwise copies “Title — Artist” to clipboard */
export async function shareTrackMeta(track: Track): Promise<void> {
  const text = `${track.title} — ${track.artist}`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: track.title,
        text,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      });
    } else {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    /* dismissed or clipboard blocked */
  }
}
