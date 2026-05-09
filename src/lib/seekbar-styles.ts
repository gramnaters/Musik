import type { SeekbarStyle } from '@/stores/audioSettingsStore';
import { cn } from '@/lib/utils';

export function seekbarWrapperClass(style: SeekbarStyle, extra?: string) {
  return cn(extra, `seekbar-style-${style}`);
}
