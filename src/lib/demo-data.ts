import { Track, Playlist } from '@/types/music';

const COVER_COLORS = [
  '8c67ab', 'e61e32', 'ba5d07', '1e3264', 'e8115b',
  '148a08', '537aa7', '8d67ab', '1db954', 'dc148c',
  'e1118b', 'b49bc8', '503750', '477d95', 'a56752',
];

function cover(seed: number): string {
  return `https://picsum.photos/seed/${seed}/300/300`;
}

export const demoTracks: Track[] = [
  { id: 't1', title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', albumCover: cover(101), albumId: 'a1', artistId: 'ar1', duration: 244, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', quality: 'Master', genres: ['Pop', 'Dance/Electronic'] },
  { id: 't2', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', albumCover: cover(102), albumId: 'a2', artistId: 'ar2', duration: 200, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', quality: 'HiFi', genres: ['Pop', 'R&B'] },
  { id: 't3', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', albumCover: cover(103), albumId: 'a3', artistId: 'ar3', duration: 355, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', quality: 'Master', genres: ['Rock'] },
  { id: 't4', title: 'Stairway to Heaven', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', albumCover: cover(104), albumId: 'a4', artistId: 'ar4', duration: 482, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', quality: 'HiFi', genres: ['Rock'] },
  { id: 't5', title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', album: 'Appetite for Destruction', albumCover: cover(105), albumId: 'a5', artistId: 'ar5', duration: 356, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', quality: 'High', genres: ['Rock'] },
  { id: 't6', title: 'Lose Yourself', artist: 'Eminem', album: '8 Mile Soundtrack', albumCover: cover(106), albumId: 'a6', artistId: 'ar6', duration: 326, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', quality: 'HiFi', genres: ['Hip-Hop'] },
  { id: 't7', title: 'Billie Jean', artist: 'Michael Jackson', album: 'Thriller', albumCover: cover(107), albumId: 'a7', artistId: 'ar7', duration: 294, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', quality: 'Master', genres: ['Pop', 'R&B'] },
  { id: 't8', title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', albumCover: cover(108), albumId: 'a8', artistId: 'ar8', duration: 301, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', quality: 'HiFi', genres: ['Rock', 'Indie'] },
  { id: 't9', title: 'Imagine', artist: 'John Lennon', album: 'Imagine', albumCover: cover(109), albumId: 'a9', artistId: 'ar9', duration: 187, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', quality: 'Normal', genres: ['Rock'] },
  { id: 't10', title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', albumCover: cover(110), albumId: 'a10', artistId: 'ar10', duration: 391, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', quality: 'Master', genres: ['Rock'] },
  { id: 't11', title: 'Sunset Lover', artist: 'Petit Biscuit', album: 'Presence', albumCover: cover(111), albumId: 'a11', artistId: 'ar11', duration: 238, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', quality: 'HiFi', genres: ['Dance/Electronic', 'Ambient'] },
  { id: 't12', title: 'Intro', artist: 'The xx', album: 'xx', albumCover: cover(112), albumId: 'a12', artistId: 'ar12', duration: 127, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', quality: 'High', genres: ['Indie', 'Ambient'] },
  { id: 't13', title: 'Breathe', artist: 'Télépopmusik', album: 'Genetic World', albumCover: cover(113), albumId: 'a13', artistId: 'ar13', duration: 282, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', quality: 'HiFi', genres: ['Dance/Electronic'] },
  { id: 't14', title: 'Dancing in the Moonlight', artist: 'King Harvest', album: 'Dancing in the Moonlight', albumCover: cover(114), albumId: 'a14', artistId: 'ar14', duration: 252, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', quality: 'Normal', genres: ['Pop'] },
  { id: 't15', title: 'Electric Feel', artist: 'MGMT', album: 'Oracular Spectacular', albumCover: cover(115), albumId: 'a15', artistId: 'ar15', duration: 229, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', quality: 'High', genres: ['Indie', 'Pop'] },
  { id: 't16', title: 'Wicked Game', artist: 'Chris Isaak', album: 'Heart Shaped World', albumCover: cover(116), albumId: 'a16', artistId: 'ar16', duration: 254, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', quality: 'HiFi', genres: ['Pop'] },
  { id: 't17', title: 'Crimson Kiss', artist: 'Luna Echo', album: 'Velvet Skies', albumCover: cover(117), albumId: 'a17', artistId: 'ar17', duration: 216, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', quality: 'Master', genres: ['Dance/Electronic'] },
  { id: 't18', title: 'Neon Dreams', artist: 'Synthwave Collective', album: 'Retro Future', albumCover: cover(118), albumId: 'a18', artistId: 'ar18', duration: 198, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', quality: 'High', genres: ['Dance/Electronic'] },
  { id: 't19', title: 'Ocean Waves', artist: 'Ambient Seas', album: 'Deep Blue', albumCover: cover(119), albumId: 'a19', artistId: 'ar19', duration: 312, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', quality: 'Normal', genres: ['Ambient'] },
  { id: 't20', title: 'Starlight', artist: 'Muse', album: 'Black Holes and Revelations', albumCover: cover(120), albumId: 'a20', artistId: 'ar20', duration: 241, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', quality: 'HiFi', genres: ['Rock'] },
  { id: 't21', title: 'Under Pressure', artist: 'Queen & David Bowie', album: 'Hot Space', albumCover: cover(121), albumId: 'a21', artistId: 'ar21', duration: 248, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', quality: 'Master', genres: ['Rock', 'Pop'] },
  { id: 't22', title: 'Purple Rain', artist: 'Prince', album: 'Purple Rain', albumCover: cover(122), albumId: 'a22', artistId: 'ar22', duration: 520, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', quality: 'Master', genres: ['R&B', 'Pop'] },
  { id: 't23', title: 'Take On Me', artist: 'a-ha', album: 'Hunting High and Low', albumCover: cover(123), albumId: 'a23', artistId: 'ar23', duration: 225, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', quality: 'HiFi', genres: ['Pop'] },
  { id: 't24', title: 'Wake Me Up', artist: 'Avicii', album: 'True', albumCover: cover(124), albumId: 'a24', artistId: 'ar24', duration: 249, streamURL: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', quality: 'High', genres: ['Dance/Electronic', 'Pop'] },
];

export const demoPlaylists: Playlist[] = [
  {
    id: 'pl1',
    name: 'Chill Vibes',
    description: 'Relax and unwind with these chill tracks',
    cover: cover(201),
    tracks: [demoTracks[0], demoTracks[10], demoTracks[11], demoTracks[12], demoTracks[15], demoTracks[18]],
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'pl2',
    name: 'Rock Classics',
    description: 'The greatest rock anthems of all time',
    cover: cover(202),
    tracks: [demoTracks[2], demoTracks[3], demoTracks[4], demoTracks[7], demoTracks[8], demoTracks[9], demoTracks[20]],
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'pl3',
    name: 'Hip-Hop Hits',
    description: 'Top hip-hop bangers',
    cover: cover(203),
    tracks: [demoTracks[5], demoTracks[6], demoTracks[13], demoTracks[14], demoTracks[23]],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'pl4',
    name: 'Electronic Dreams',
    description: 'Synthwave and electronic masterpieces',
    cover: cover(204),
    tracks: [demoTracks[0], demoTracks[10], demoTracks[14], demoTracks[17], demoTracks[19], demoTracks[23]],
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'pl5',
    name: '80s Nostalgia',
    description: 'The best of the 1980s',
    cover: cover(205),
    tracks: [demoTracks[3], demoTracks[6], demoTracks[8], demoTracks[9], demoTracks[15], demoTracks[20], demoTracks[21], demoTracks[22]],
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'pl6',
    name: 'Discover Weekly',
    description: 'Your personal mix of fresh music',
    cover: cover(206),
    tracks: [demoTracks[16], demoTracks[17], demoTracks[18], demoTracks[19], demoTracks[22], demoTracks[23]],
    createdAt: Date.now() - 86400000 * 1,
  },
];

export const browseCategories = [
  { id: 'c1', name: 'Pop', color: '#8c67ab' },
  { id: 'c2', name: 'Rock', color: '#e61e32' },
  { id: 'c3', name: 'Hip-Hop', color: '#ba5d07' },
  { id: 'c4', name: 'Indie', color: '#1e3264' },
  { id: 'c5', name: 'Dance/Electronic', color: '#e8115b' },
  { id: 'c6', name: 'R&B', color: '#dc148c' },
  { id: 'c7', name: 'Jazz', color: '#477d95' },
  { id: 'c8', name: 'Classical', color: '#7d4b32' },
  { id: 'c9', name: 'Country', color: '#a56752' },
  { id: 'c10', name: 'Metal', color: '#1db954' },
  { id: 'c11', name: 'Blues', color: '#503750' },
  { id: 'c12', name: 'Folk & Acoustic', color: '#148a08' },
  { id: 'c13', name: 'Latin', color: '#e1118b' },
  { id: 'c14', name: 'Podcasts', color: '#537aa7' },
  { id: 'c15', name: 'Audiobooks', color: '#8d67ab' },
  { id: 'c16', name: 'Ambient', color: '#b49bc8' },
];

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
