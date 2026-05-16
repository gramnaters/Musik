import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EqPreset =
  | 'flat'
  | 'bass-boost'
  | 'treble-boost'
  | 'vocal-boost'
  | 'electronic'
  | 'classical'
  | 'rock'
  | 'pop';

export type SeekbarStyle = 'classic' | 'wave' | 'minimal' | 'ios' | 'neon';

export const EQ_PRESET_LABELS: Record<EqPreset, string> = {
  flat: 'Flat',
  'bass-boost': 'Bass Boost',
  'treble-boost': 'Treble Boost',
  'vocal-boost': 'Vocal Boost',
  electronic: 'Electronic',
  classical: 'Classical',
  rock: 'Rock',
  pop: 'Pop',
};

export const SEEKBAR_STYLE_LABELS: Record<SeekbarStyle, string> = {
  classic: 'Classic',
  wave: 'Waveform',
  minimal: 'Minimalist',
  ios: 'iOS Style',
  neon: 'Neon Glow',
};

export const SEEKBAR_STYLES: SeekbarStyle[] = ['classic', 'wave', 'minimal', 'ios', 'neon'];

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
  if (typeof raw === 'string' && SEEKBAR_STYLES.includes(raw as SeekbarStyle)) {
    return raw as SeekbarStyle;
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
        state.seekbarStyle = coerceSeekbarStyle(state.seekbarStyle);
      },
    }
  )
);
