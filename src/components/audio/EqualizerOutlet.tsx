'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAudioSettingsStore } from '@/stores/audioSettingsStore';
import { useStreamingStore } from '@/stores/streamingStore';
import { attachEqualizerToAudio, applyEqualizer, resumeAudioContext, setMonoAudio } from '@/lib/equalizer-graph';

/** Wires the shared HTMLAudio element into a Web Audio 3-band path + mono + log volume. */
export function EqualizerOutlet() {
  useEffect(() => {
    let prevAudio: HTMLAudioElement | null = undefined as unknown as HTMLAudioElement | null;

    const sync = async () => {
      const audio = usePlayerStore.getState().audio;
      const { eqEnabled, eqPreset } = useAudioSettingsStore.getState();
      const { monoAudio } = useStreamingStore.getState();

      if (audio !== prevAudio) {
        prevAudio = audio;
      }

      if (audio) {
        await attachEqualizerToAudio(audio);
        applyEqualizer(eqEnabled, eqPreset);
        setMonoAudio(monoAudio);
        await resumeAudioContext();
      }
    };

    void sync();

    const unsubAudio = usePlayerStore.subscribe(() => void sync());
    const unsubEq = useAudioSettingsStore.subscribe(() => void sync());
    const unsubStream = useStreamingStore.subscribe(() => void sync());

    return () => {
      unsubAudio();
      unsubEq();
      unsubStream();
    };
  }, []);

  return null;
}
