import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EqPreset =
  | 'flat'
  | 'bass_boost'
  | 'treble_boost'
  | 'vocal'
  | 'rock'
  | 'pop'
  | 'jazz'
  | 'classical'
  | 'electronic'
  | 'dance'
  | 'hip_hop'
  | 'acoustic'
  | 'podcast'
  | 'latenight'
  | 'stadium'
  | 'movie'
  | 'voice_boost';

export const SEEKBAR_STYLES = [
  'classic',
  'wavy',
  'slim',
  'glow',
  'gradient',
  'dotted',
  'bounce',
  'equalizer',
  'heartbeat',
  'liquid',
  'rainbow',
  'neon',
  'vinyl',
  'fire',
  'pixel',
  'breathing',
  'cassette',
  'waveform',
] as const;

export type SeekbarStyle = (typeof SEEKBAR_STYLES)[number];

interface AudioSettingsState {
  eqEnabled: boolean;
  eqPreset: EqPreset;
  seekbarStyle: SeekbarStyle;
}

interface AudioSettingsActions {
  setEqEnabled: (v: boolean) => void;
  setEqPreset: (p: EqPreset) => void;
  setSeekbarStyle: (s: SeekbarStyle) => void;
}

function coerceSeekbarStyle(raw: unknown): SeekbarStyle {
  const legacy: Record<string, SeekbarStyle> = {
    default: 'classic',
    heart: 'heartbeat',
  };
  if (typeof raw === 'string') {
    if ((SEEKBAR_STYLES as readonly string[]).includes(raw)) return raw as SeekbarStyle;
    if (legacy[raw]) return legacy[raw];
  }
  return 'classic';
}

export const useAudioSettingsStore = create<AudioSettingsState & AudioSettingsActions>()(
  persist(
    (set) => ({
      eqEnabled: false,
      eqPreset: 'flat',
      seekbarStyle: 'classic',
      setEqEnabled: (eqEnabled) => set({ eqEnabled }),
      setEqPreset: (eqPreset) => set({ eqPreset }),
      setSeekbarStyle: (seekbarStyle) => set({ seekbarStyle: coerceSeekbarStyle(seekbarStyle) }),
    }),
    {
      name: 'musik-audio-settings',
      onRehydrateStorage: () => (state, error) => {
        if (error || !state?.seekbarStyle) return;
        const fixed = coerceSeekbarStyle(state.seekbarStyle);
        if (fixed !== state.seekbarStyle) {
          useAudioSettingsStore.getState().setSeekbarStyle(fixed);
        }
      },
    }
  )
);

export const EQ_PRESET_LABELS: Record<EqPreset, string> = {
  flat: 'Flat',
  bass_boost: 'Bass Boost',
  treble_boost: 'Treble Boost',
  vocal: 'Vocal',
  rock: 'Rock',
  pop: 'Pop',
  jazz: 'Jazz',
  classical: 'Classical',
  electronic: 'Electronic',
  dance: 'Dance / Club',
  hip_hop: 'Hip-Hop',
  acoustic: 'Acoustic',
  podcast: 'Podcast / Talk',
  latenight: 'Late Night',
  stadium: 'Stadium',
  movie: 'Movie',
  voice_boost: 'Voice Boost',
};

export const SEEKBAR_STYLE_LABELS: Record<SeekbarStyle, string> = {
  classic: 'Classic',
  wavy: 'Wavy',
  slim: 'Slim',
  glow: 'Glow',
  gradient: 'Gradient',
  dotted: 'Dotted',
  bounce: 'Bounce',
  equalizer: 'Equalizer',
  heartbeat: 'Heartbeat',
  liquid: 'Liquid',
  rainbow: 'Rainbow',
  neon: 'Neon',
  vinyl: 'Vinyl',
  fire: 'Fire',
  pixel: 'Pixel',
  breathing: 'Breathing',
  cassette: 'Cassette',
  waveform: 'Waveform',
};
