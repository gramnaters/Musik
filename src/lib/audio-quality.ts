import type { Track } from '@/types/music';

export type QualityBadge = {
  label: string;
};

const AUDIO_QUALITIES = {
  DOLBY_ATMOS: 'DOLBY_ATMOS',
  HI_RES_LOSSLESS: 'HI_RES_LOSSLESS',
  LOSSLESS: 'LOSSLESS',
  HIGH: 'HIGH',
  LOW: 'LOW',
} as const;

const QUALITY_PRIORITY = ['DOLBY_ATMOS', 'HI_RES_LOSSLESS', 'LOSSLESS', 'HIGH', 'LOW'];

const QUALITY_TOKENS: Record<string, string[]> = {
  DOLBY_ATMOS: ['DOLBY_ATMOS', 'ATMOS'],
  HI_RES_LOSSLESS: [
    'HI_RES_LOSSLESS', 'HIRES_LOSSLESS', 'HIRESLOSSLESS',
    'HIFI_PLUS', 'HI_RES_FLAC', 'HI_RES', 'HIRES',
    'MASTER', 'MASTER_QUALITY', 'MQA', 'MAX',
  ],
  LOSSLESS: ['LOSSLESS', 'HIFI', 'FLAC', 'ALAC', 'CD', 'CDQUALITY', 'HI_FI', 'HIFI'],
  HIGH: ['HIGH', 'HIGH_QUALITY', 'PREMIUM'],
  LOW: ['LOW', 'LOW_QUALITY'],
};

function normalizeToken(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function pickBestQuality(candidates: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestRank = Infinity;

  for (const candidate of candidates) {
    if (!candidate) continue;
    const rank = QUALITY_PRIORITY.indexOf(candidate);
    const currentRank = rank === -1 ? Infinity : rank;
    if (currentRank < bestRank) {
      best = candidate;
      bestRank = currentRank;
    }
  }
  return best;
}

function normalizeQualityToken(value: string): string | null {
  if (!value) return null;
  const token = normalizeToken(value);

  for (const [quality, aliases] of Object.entries(QUALITY_TOKENS)) {
    if (aliases.includes(token)) return quality;
  }
  return null;
}

export function getQualityBadge(raw?: string | null): QualityBadge | null {
  if (!raw) return null;
  const q = String(raw).trim();
  if (!q) return null;

  const normalized = normalizeQualityToken(q);
  if (!normalized) {
    const norm = q.toLowerCase().replace(/[\s_-]+/g, '');
    if (norm.includes('320') || norm.includes('mp3') || norm.includes('aac')) {
      return { label: 'HIGH' };
    }
    return null;
  }

  if (normalized === AUDIO_QUALITIES.DOLBY_ATMOS) {
    return { label: 'ATMOS' };
  }
  if (normalized === AUDIO_QUALITIES.HI_RES_LOSSLESS) {
    return { label: 'HD' };
  }
  if (normalized === AUDIO_QUALITIES.LOSSLESS) {
    return { label: 'HIFI' };
  }
  if (normalized === AUDIO_QUALITIES.HIGH) {
    return { label: 'HIGH' };
  }
  if (normalized === AUDIO_QUALITIES.LOW) {
    return { label: 'LOW' };
  }

  return null;
}
