/** Search landing tiles — real imagery + catalog queries (not literal tile titles). */
export const SEARCH_CATEGORY_TILES: {
  id: string;
  label: string;
  /** Curated query for Apple/Spotify metadata search */
  catalogQuery: string;
  /** Optional subtitle in hub header */
  subtitle?: string;
  /** Hero image (Unsplash, stable IDs) */
  coverImage: string;
  /** Tint overlay on top of photo */
  gradient: string;
}[] = [
  {
    id: 'top',
    label: 'Top Charts',
    catalogQuery: 'billboard chart hits popular',
    subtitle: 'Charting tracks',
    coverImage:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(127,29,29,0.92), rgba(249,115,22,0.55))',
  },
  {
    id: 'hits',
    label: 'Hits',
    catalogQuery: 'hit songs radio favorites',
    subtitle: 'Big singles',
    coverImage:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(202,138,4,0.9), rgba(253,224,71,0.45))',
  },
  {
    id: 'new',
    label: 'New Music',
    catalogQuery: 'new releases 2024 2025 music',
    subtitle: 'Fresh drops',
    coverImage:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(30,58,138,0.92), rgba(99,102,241,0.5))',
  },
  {
    id: 'pop',
    label: 'Pop',
    catalogQuery: 'pop hits chart singles',
    subtitle: 'Mainstream pop',
    coverImage:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(194,65,12,0.88), rgba(251,146,60,0.45))',
  },
  {
    id: 'hiphop',
    label: 'Hip-Hop',
    catalogQuery: 'hip hop rap hits',
    subtitle: 'Beats & bars',
    coverImage:
      'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(88,28,135,0.9), rgba(168,85,247,0.5))',
  },
  {
    id: 'country',
    label: 'Country',
    catalogQuery: 'country music hits nashville',
    subtitle: 'Story & twang',
    coverImage:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(154,52,18,0.88), rgba(253,186,116,0.45))',
  },
  {
    id: 'dance',
    label: 'Dance',
    catalogQuery: 'edm dance electronic festival',
    subtitle: 'Club energy',
    coverImage:
      'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(12,74,110,0.9), rgba(56,189,248,0.45))',
  },
  {
    id: 'rock',
    label: 'Rock',
    catalogQuery: 'rock anthems classic alternative',
    subtitle: 'Guitar-driven',
    coverImage:
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(124,45,18,0.9), rgba(234,88,12,0.45))',
  },
  {
    id: 'rnb',
    label: 'R&B',
    catalogQuery: 'rnb soul contemporary hits',
    subtitle: 'Smooth vocals',
    coverImage:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(76,29,149,0.9), rgba(192,132,252,0.45))',
  },
  {
    id: 'electronic',
    label: 'Electronic',
    catalogQuery: 'electronic synth ambient house',
    subtitle: 'Synthesizers',
    coverImage:
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(19,78,74,0.9), rgba(45,212,191,0.45))',
  },
  {
    id: 'chill',
    label: 'Chill',
    catalogQuery: 'chill lofi relax study',
    subtitle: 'Low tempo',
    coverImage:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(22,78,99,0.9), rgba(34,211,238,0.4))',
  },
  {
    id: 'workout',
    label: 'Workout',
    catalogQuery: 'workout gym motivation high energy',
    subtitle: 'Push tempo',
    coverImage:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(20,83,45,0.9), rgba(74,222,128,0.45))',
  },
];
