/**
 * Extra catalog rails (metadata search) when no addon — Spotify-like discovery rows.
 * Uses the same `/api/metadata/search` as the rest of the app (search, not official charts API).
 */
export const HOME_CATALOG_RAILS: {
  id: string;
  title: string;
  query: string;
  subtitle?: string;
}[] = [
  { id: 'viral', title: 'Viral hits', query: 'viral tiktok trending songs', subtitle: 'What’s everywhere right now' },
  { id: 'throwbacks', title: 'Throwbacks', query: 'greatest hits classics 80s 90s 2000s', subtitle: 'All-time favorites' },
  { id: 'rising', title: 'Rising', query: 'new artists breakout 2025', subtitle: 'Fresh faces' },
];

/** Mood / mix tiles on Home — query is sent to the first search-capable installed module. */
export const HOME_MOOD_MIXES: { id: string; label: string; subtitle: string; query: string; gradient: string }[] = [
  {
    id: 'focus',
    label: 'Focus',
    subtitle: 'Deep work',
    query: 'focus ambient study',
    gradient: 'linear-gradient(135deg,#0f172a,#38bdf8)',
  },
  {
    id: 'sad',
    label: 'Sad Songs',
    subtitle: 'Mood mix',
    query: 'sad songs emotional',
    gradient: 'linear-gradient(135deg,#4c1d95,#a855f7)',
  },
  {
    id: 'party',
    label: 'Party',
    subtitle: 'Energy',
    query: 'party dance hits',
    gradient: 'linear-gradient(135deg,#9a3412,#fb923c)',
  },
  {
    id: 'workout',
    label: 'Workout',
    subtitle: 'High tempo',
    query: 'workout fitness beats',
    gradient: 'linear-gradient(135deg,#14532d,#4ade80)',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    subtitle: 'Wind down',
    query: 'sleep calm piano',
    gradient: 'linear-gradient(135deg,#312e81,#818cf8)',
  },
  {
    id: 'feelgood',
    label: 'Feel Good',
    subtitle: 'Sunshine',
    query: 'feel good pop happy',
    gradient: 'linear-gradient(135deg,#ca8a04,#fde047)',
  },
];
