export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArtist?: string;
  albumCover?: string;
  albumId?: string;
  artistId?: string;
  duration?: number; // seconds
  isrc?: string;
  upc?: string;
  bpm?: number;
  trackNumber?: number;
  discNumber?: number;
  totalTracks?: number;
  totalDiscs?: number;
  copyright?: string;
  streamURL?: string;
  format?: string;
  addonId?: string;
  addonTrackId?: string;
  quality?: string;
  explicit?: boolean;
  genres?: string[];
  year?: string;
  releaseDate?: string;
  replayGainTrack?: number;
  replayGainAlbum?: number;
  replayGainTrackPeak?: number;
  replayGainAlbumPeak?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  trackCount?: number;
  year?: string;
  tracks?: Track[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  trackCount?: number;
  tracks?: Track[];
  createdAt?: number;
}

/** Podcast / show row from catalog search (Apple or Spotify). */
export interface CatalogPodcast {
  id: string;
  title: string;
  author?: string;
  description?: string;
  cover?: string;
  episodeCount?: number;
  externalUrl?: string;
}

export interface Artist {
  id: string;
  name: string;
  image?: string;
  genres?: string[];
}

export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: string;
  contentType?: 'music' | 'audiobook' | 'podcast';
  types?: string[];
  resources?: string[];
  baseURL?: string;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export interface LyricLine {
  time: number; // ms
  text: string;
}
