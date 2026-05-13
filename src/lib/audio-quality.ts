import type { Track } from '@/types/music';

export type QualityBadge = {
  label: string;
};

/** How the stream is most likely encoded for end-user playback. */
export type DeliveryClass = 'lossless_hint' | 'lossy' | 'unknown';

const AUDIO_QUALITIES = {
  DOLBY_ATMOS: 'DOLBY_ATMOS',
  HI_RES_LOSSLESS: 'HI_RES_LOSSLESS',
  LOSSLESS: 'LOSSLESS',
  HIGH: 'HIGH',
  LOW: 'LOW',
} as const;

const QUALITY_PRIORITY = ['DOLBY_ATMOS', 'HI_RES_LOSSLESS', 'LOSSLESS', 'HIGH', 'LOW'];

const QUALITY_TOKENS: Record<string, string[]> = {
  DOLBY_ATMOS: ['DOLBY_ATMOS', 'ATMOS', 'SPATIAL', 'DOLBY', '360RA', '360REALITY'],
  HI_RES_LOSSLESS: [
    'HI_RES_LOSSLESS',
    'HIRES_LOSSLESS',
    'HIRESLOSSLESS',
    'HIFI_PLUS',
    'HI_RES_FLAC',
    'HI_RES',
    'HIRES',
    'MASTER',
    'MASTER_QUALITY',
    'MQA',
    'MAX',
    'ULTRAHD',
    'UHD',
    'STUDIO',
  ],
  LOSSLESS: [
    'LOSSLESS',
    'HIFI',
    'FLAC',
    'ALAC',
    'CD',
    'CDQUALITY',
    'HI_FI',
    'FLACLOSSLESS',
    '161LOSSLESS',
    '241LOSSLESS',
    '320LOSSLESS',
    '441LOSSLESS',
    'BITPERFECT',
  ],
  HIGH: ['HIGH', 'HIGH_QUALITY', 'PREMIUM', 'VERYHIGH', 'VERY_HIGH', 'EXCELLENT', 'OPTIMAL'],
  LOW: ['LOW', 'LOW_QUALITY', 'NORMAL', 'DATA_SAVER', 'ECONOMY'],
};

const BUCKET_LABEL: Record<string, string> = {
  DOLBY_ATMOS: 'ATMOS',
  HI_RES_LOSSLESS: 'HD',
  LOSSLESS: 'HIFI',
  HIGH: 'HIGH',
  LOW: 'LOW',
};

const BUCKET_TOOLTIP: Record<string, string> = {
  DOLBY_ATMOS: 'Dolby Atmos spatial audio',
  HI_RES_LOSSLESS: 'Hi-Res Lossless',
  LOSSLESS: 'Lossless',
  HIGH: 'High quality (compressed)',
  LOW: 'Lower bitrate / data saver',
};

function normalizeToken(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function normalizeQualityToken(value: string): string | null {
  if (!value) return null;
  const token = normalizeToken(value);

  for (const [quality, aliases] of Object.entries(QUALITY_TOKENS)) {
    if (aliases.includes(token)) return quality;
  }

  for (const [quality, aliases] of Object.entries(QUALITY_TOKENS)) {
    for (const a of aliases) {
      if (a.length < 4) continue;
      if (token.includes(a) || (a.length <= token.length + 2 && a.includes(token))) return quality;
    }
  }

  const t = token;
  if (t.includes('LOSSLESS') || t.includes('FLAC') || t.includes('ALAC')) {
    return t.includes('HI') && (t.includes('RES') || t.includes('HIRES')) ? 'HI_RES_LOSSLESS' : 'LOSSLESS';
  }
  if (t.includes('ATMOS') || t.includes('SPATIAL') || t.includes('360')) return 'DOLBY_ATMOS';
  if (t.includes('MASTER') || t.includes('MQA') || t.includes('MAX')) return 'HI_RES_LOSSLESS';

  return null;
}

/**
 * Classify what the playable stream likely is. Addon catalogs often advertise "Master"
 * while the CDN URL is still MP3/AAC — we treat that as lossy so badges stay honest.
 */
export function classifyAudioDelivery(track: Pick<Track, 'format' | 'streamURL' | 'quality'>): DeliveryClass {
  const url = (track.streamURL || '').toLowerCase();
  const fmt = (track.format || '').toLowerCase();
  const blob = `${url} ${fmt}`;

  if (/\b(flac|alac|wav|pcm|audio\/flac|audio\/wav)\b/.test(blob) || /\.(flac|wav)(\?|$)/i.test(url)) {
    return 'lossless_hint';
  }
  if (
    /\b(mp3|mpeg|aac|opus|m4a|audio\/mpeg|audio\/aac|audio\/mp4|audio\/opus|mp4a)\b/.test(blob) ||
    /\.(mp3|aac|m4a|opus|ogg)(\?|$)/i.test(url)
  ) {
    return 'lossy';
  }

  const hasDeliveryHint = Boolean((track.streamURL || '').trim() || (track.format || '').trim());
  const marketingHi = /master|hi[\s-]?res|max|mqa|ultra|studio|lossless|hifi/i.test(track.quality || '');
  if (hasDeliveryHint && marketingHi && !/flac|alac|wav|pcm|audio\/flac|audio\/wav/i.test(blob)) {
    return 'lossy';
  }

  return 'unknown';
}

function lossyBadgeLabel(track: Pick<Track, 'format' | 'streamURL'>): QualityBadge {
  const u = (track.streamURL || '').toLowerCase();
  const f = (track.format || '').toLowerCase();
  if (f.includes('mp3') || u.includes('.mp3')) return { label: 'MP3' };
  if (f.includes('aac') || f.includes('m4a') || u.includes('.m4a') || u.includes('.aac')) return { label: 'AAC' };
  if (f.includes('opus') || u.includes('.opus')) return { label: 'OPUS' };
  if (f.includes('ogg') || u.includes('.ogg')) return { label: 'OGG' };
  return { label: 'AAC' };
}

function lossyTooltip(track: Pick<Track, 'quality' | 'format' | 'streamURL'>): string {
  const catalog = (track.quality || '').trim();
  const fmt = lossyBadgeLabel(track).label;
  if (catalog && !/^(mp3|aac|opus|ogg)$/i.test(catalog)) {
    return `${fmt} stream — catalog lists “${catalog}” (marketing tier may not match the file you hear or download).`;
  }
  return `${fmt} — compressed stream (not lossless).`;
}

function losslessTooltip(bucket: string, raw?: string | null): string {
  const base = BUCKET_TOOLTIP[bucket] || bucket;
  if (raw?.trim()) return `${base} — source: ${raw.trim()}`;
  return base;
}

/** Guess container/codec from URL path (many addon CDNs omit accurate Content-Type in the client). */
export function inferFormatFromUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const m = /\.(flac|mp3|aac|m4a|opus|ogg|wav)(\?|#|$)/i.exec(url);
  return m ? m[1].toLowerCase() : undefined;
}

/** Monochrome-style list pill: only Hi-Res (HD) and Dolby Atmos — no MP3/AAC/HIGH/CD lossless pill. */
export function getQualityBadgeForTrack(track: Pick<Track, 'quality' | 'format' | 'streamURL'> | null | undefined): QualityBadge | null {
  if (!track) return null;
  const raw = track.quality?.trim();
  if (!raw) return null;
  const normalized = normalizeQualityToken(raw);
  if (normalized === 'DOLBY_ATMOS') return { label: 'ATMOS' };
  if (normalized === 'HI_RES_LOSSLESS') return { label: 'HD' };
  return null;
}

/** Tooltip for the small quality pill (Monochrome: HD = Hi-Res Lossless, ATMOS = spatial). */
export function getQualityTooltip(track: Pick<Track, 'quality' | 'format' | 'streamURL'> | null | undefined): string {
  if (!track) return 'Quality';
  const raw = track.quality?.trim();
  const normalized = raw ? normalizeQualityToken(raw) : null;
  if (normalized === 'DOLBY_ATMOS') return 'Dolby Atmos spatial audio';
  if (normalized === 'HI_RES_LOSSLESS') return 'Hi-Res Lossless';

  const delivery = classifyAudioDelivery(track);
  if (delivery === 'lossy') {
    const inf = inferFormatFromUrl(track.streamURL);
    if (inf === 'mp3' || inf === 'm4a' || inf === 'aac' || inf === 'opus' || inf === 'ogg') {
      return 'Standard compressed audio — no quality badge (same idea as Monochrome for non Hi‑Res).';
    }
    return 'Compressed stream.';
  }
  if (delivery === 'lossless_hint') {
    return raw
      ? `Lossless stream (${raw}) — list shows HD only when the catalog marks Hi‑Res Lossless.`
      : 'Lossless stream — HD badge only for Hi‑Res Lossless in the catalog.';
  }
  if (raw) return raw;
  return 'Playback quality';
}

/** @deprecated Prefer getQualityBadgeForTrack — kept for call sites that only have a raw string. */
export function getQualityBadge(raw?: string | null): QualityBadge | null {
  if (!raw) return null;
  return getQualityBadgeForTrack({ quality: raw, format: undefined, streamURL: undefined });
}
