'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAudioSettingsStore } from '@/stores/audioSettingsStore';
import { attachEqualizerToAudio, applyEqualizer, resumeAudioContext } from '@/lib/equalizer-graph';

/** Wires the shared HTMLAudio element into a Web Audio 3-band path once presets can update live. */
export function EqualizerOutlet() {
  useEffect(() => {
    let prevAudio: HTMLAudioElement | null = undefined as unknown as HTMLAudioElement | null;

    const sync = async () => {
      const audio = usePlayerStore.getState().audio;
      const { eqEnabled, eqPreset } = useAudioSettingsStore.getState();

      if (audio !== prevAudio) {
        prevAudio = audio;
      }

      if (audio) {
        await attachEqualizerToAudio(audio);
        applyEqualizer(eqEnabled, eqPreset);
        await resumeAudioContext();
      }
    };

    void sync();

    const unsubAudio = usePlayerStore.subscribe(() => void sync());
    const unsubEq = useAudioSettingsStore.subscribe(() => void sync());

    return () => {
      unsubAudio();
      unsubEq();
    };
  }, []);

  return null;
}
