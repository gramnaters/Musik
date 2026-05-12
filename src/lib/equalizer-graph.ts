import type { EqPreset } from '@/stores/audioSettingsStore';

type Band = { low: number; mid: number; high: number };

const PRESET_GAINS: Record<EqPreset, Band> = {
  flat: { low: 0, mid: 0, high: 0 },
  bass_boost: { low: 7, mid: 1, high: -1 },
  treble_boost: { low: -1, mid: 0, high: 6 },
  vocal: { low: -2, mid: 4, high: 2 },
  rock: { low: 5, mid: -1, high: 4 },
  pop: { low: 2, mid: 3, high: 2 },
  jazz: { low: 3, mid: 1, high: 3 },
  classical: { low: 2, mid: 0, high: 3 },
  electronic: { low: 6, mid: 2, high: 4 },
  dance: { low: 7, mid: 1, high: 3 },
  hip_hop: { low: 8, mid: 2, high: -1 },
  acoustic: { low: 1, mid: 3, high: 4 },
  podcast: { low: -3, mid: 5, high: 2 },
  latenight: { low: 4, mid: -1, high: -2 },
  stadium: { low: 3, mid: 2, high: 5 },
  movie: { low: 6, mid: 3, high: 4 },
  voice_boost: { low: -3, mid: 6, high: 3 },
};

let ctx: AudioContext | null = null;
let source: MediaElementAudioSourceNode | null = null;
let low: BiquadFilterNode | null = null;
let mid: BiquadFilterNode | null = null;
let high: BiquadFilterNode | null = null;
let wiredElement: HTMLAudioElement | null = null;

function ensureContext(): AudioContext {
  if (!ctx && typeof window !== 'undefined') {
    const AudioCtxConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxConstructor) {
      ctx = new AudioCtxConstructor();
    } else {
      throw new Error('Web Audio unsupported');
    }
  }
  if (!ctx) {
    throw new Error('AudioContext unavailable');
  }
  return ctx;
}

export async function resumeAudioContext(): Promise<void> {
  if (ctx?.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
}

function wireOnce(audio: HTMLAudioElement): boolean {
  if (wiredElement === audio && source && low && mid && high) {
    return true;
  }
  if (source && wiredElement && wiredElement !== audio) {
    return false;
  }

  try {
    const c = ensureContext();
    source = c.createMediaElementSource(audio);
    low = c.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 200;
    mid = c.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1200;
    mid.Q.value = 0.85;
    high = c.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 4800;
    source.connect(low);
    low.connect(mid);
    mid.connect(high);
    high.connect(c.destination);
    wiredElement = audio;
    return true;
  } catch {
    /** Element may already have a MediaElementAudioSource node from a previous lifecycle */
    return false;
  }
}

/** Connect graph once — must not detach from the same HTMLMediaElement afterward */
export async function attachEqualizerToAudio(audio: HTMLAudioElement | null) {
  if (!audio || typeof window === 'undefined') return;

  wireOnce(audio);
  await resumeAudioContext();
}

/** Normalized bar heights (~0.2–1) for a minimalist EQ preview graphic */
export function getEqBandPreview(enabled: boolean, preset: EqPreset): number[] {
  const base = PRESET_GAINS.flat;
  const band = enabled ? PRESET_GAINS[preset] ?? base : base;
  const interpolate = (
    idx: number,
    total: number
  ): number => {
    const t = total <= 1 ? 0 : idx / (total - 1); // 0..1 across spectrum
    const lowW = Math.max(0, 1 - t * 3);
    const midW = Math.max(0, 1 - Math.abs(t - 0.47) * 4);
    const highW = Math.max(0, (t - 0.45) * 2.8);
    const sum = lowW + midW + highW + 0.001;
    const db = (band.low * lowW + band.mid * midW + band.high * highW) / sum;
    return Math.min(1, Math.max(0.2, 0.45 + db * 0.045));
  };
  const n = 12;
  return Array.from({ length: n }, (_, i) => interpolate(i, n));
}

export function applyEqualizer(enabled: boolean, preset: EqPreset) {
  if (!ctx || !low || !mid || !high) return;

  const g = enabled ? PRESET_GAINS[preset] ?? PRESET_GAINS.flat : PRESET_GAINS.flat;
  const t = ctx.currentTime + 0.02;
  try {
    low.gain.linearRampToValueAtTime(g.low, t);
    mid.gain.linearRampToValueAtTime(g.mid, t);
    high.gain.linearRampToValueAtTime(g.high, t);
  } catch {
    /* noop */
  }
}
