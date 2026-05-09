export type QualityBadgeTone = 'neutral' | 'highlight';

export type QualityBadge = {
  label: string;
  tone: QualityBadgeTone;
};

/**
 * Normalizes various quality strings into a small set of user-facing badges,
 * matching common TIDAL/Monochrome conventions.
 *
 * Notes:
 * - We intentionally hide "Normal"/unknown to avoid misleading users.
 * - Addons may return arbitrary strings (e.g. "LOSSLESS", "HI_RES", "24BIT").
 */
export function getQualityBadge(raw?: string | null): QualityBadge | null {
  if (!raw) return null;
  const q = String(raw).trim();
  if (!q) return null;

  const norm = q.toLowerCase().replace(/[\s_-]+/g, '');

  // Hide low/unknown labels
  if (norm === 'normal' || norm === 'low' || norm === 'standard') return null;

  // Atmos / immersive
  if (norm.includes('atmos') || norm.includes('360') || norm.includes('spatial')) {
    return { label: 'ATMOS', tone: 'highlight' };
  }

  // Master / MQA / Hi-Res
  if (
    norm === 'master' ||
    norm === 'mqa' ||
    norm.includes('hires') ||
    norm.includes('hireslossless') ||
    norm.includes('24bit') ||
    norm.includes('24') && norm.includes('bit')
  ) {
    return { label: 'HI‑RES', tone: 'highlight' };
  }

  // Lossless / HiFi (CD quality)
  if (
    norm === 'hifi' ||
    norm === 'lossless' ||
    norm.includes('flac') ||
    norm.includes('alac') ||
    norm.includes('cd')
  ) {
    return { label: 'LOSSLESS', tone: 'neutral' };
  }

  // High / AAC / MP3 320
  if (norm === 'high' || norm.includes('320') || norm.includes('aac') || norm.includes('mp3')) {
    return { label: 'HIGH', tone: 'neutral' };
  }

  // Unknown value: don't lie; hide it.
  return null;
}

