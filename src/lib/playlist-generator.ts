import { Track } from '@/types/music';

function sanitize(s: string): string {
  return s.replace(/[<>:"/\\|?*]/g, '').trim();
}

export function generateM3U(
  meta: { title?: string; artist?: string },
  tracks: Track[],
  trackPaths: (string | null)[],
): string {
  let content = '#EXTM3U\n';
  if (meta.title) content += `#PLAYLIST:${sanitize(meta.title)}\n`;
  if (meta.artist) content += `#ARTIST:${meta.artist}\n`;
  content += `#DATE:${new Date().toISOString().split('T')[0]}\n\n`;

  tracks.forEach((track, i) => {
    const path = trackPaths[i];
    if (!path) return;
    const dur = Math.round(track.duration || 0);
    content += `#EXTINF:${dur},${track.artist} - ${track.title}\n${path}\n\n`;
  });

  return content;
}

export function generateCUE(
  meta: { title?: string; artist?: string },
  tracks: Track[],
  trackPaths: (string | null)[],
): string {
  const performer = meta.artist || 'Unknown Artist';
  const title = meta.title || 'Unknown Album';

  let content = `PERFORMER "${performer}"\n`;
  content += `TITLE "${title}"\n`;

  tracks.forEach((track, i) => {
    const path = trackPaths[i];
    if (!path) return;
    const tn = String(track.trackNumber || i + 1).padStart(2, '0');
    const ext = (path.split('.').pop() || 'FLAC').toUpperCase();
    content += `FILE "${path}" ${ext}\n`;
    content += `  TRACK ${tn} AUDIO\n`;
    content += `    TITLE "${track.title || 'Unknown Track'}"\n`;
    content += `    PERFORMER "${track.artist || performer}"\n`;
    content += `    INDEX 01 00:00:00\n`;
  });

  return content;
}
