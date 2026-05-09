export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  icon?: string;
  contentType?: string;
  types?: string[];
  resources?: string[];
  baseURL?: string;
}

export interface AddonTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkURL?: string;
  cover?: string;
  duration?: number;
  streamURL?: string;
  url?: string;
  format?: string;
  isrc?: string;
  artistId?: string;
  albumId?: string;
  addonId?: string;
  addonName?: string;
  quality?: 'HiFi' | 'Master' | 'High' | 'Normal' | 'MQA';
}

// Helper to normalize track fields from various addon response formats
export function normalizeAddonTrack(raw: Record<string, unknown>, addonId: string, addonName: string, baseURL?: string): AddonTrack {
  const track: AddonTrack = {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? 'Unknown'),
    artist: String(raw.artist ?? raw.artistName ?? 'Unknown Artist'),
    album: raw.album ? String(raw.album) : raw.albumTitle ? String(raw.albumTitle) : undefined,
    duration: typeof raw.duration === 'number' ? raw.duration : raw.duration ? parseInt(String(raw.duration), 10) || undefined : undefined,
    streamURL: raw.streamURL ? String(raw.streamURL) : raw.url ? String(raw.url) : undefined,
    format: raw.format ? String(raw.format) : undefined,
    isrc: raw.isrc ? String(raw.isrc) : undefined,
    artistId: raw.artistId ? String(raw.artistId) : raw.artist_id ? String(raw.artist_id) : undefined,
    albumId: raw.albumId ? String(raw.albumId) : undefined,
    quality: (raw.quality ?? raw.audioQuality ?? raw.stream_quality) as any,
    addonId,
    addonName,
  };
  
  // Artwork: try artworkURL first, then albumCover, image, cover
  const artwork = raw.artworkURL ?? raw.albumCover ?? raw.image ?? raw.cover;
  if (artwork) {
    track.artworkURL = String(artwork);
    track.cover = String(artwork);
  }
  
  // Resolve relative stream URLs
  if (track.streamURL && !track.streamURL.startsWith('http') && baseURL) {
    track.streamURL = `${baseURL}${track.streamURL.startsWith('/') ? '' : '/'}${track.streamURL}`;
  }
  
  return track;
}

export interface AddonAlbum {
  id: string;
  name?: string;
  title?: string;
  artist?: string;
  artistName?: string;
  artworkURL?: string;
  cover?: string;
  image?: string;
  trackCount?: number;
  numberOfTracks?: number;
  year?: string;
  tracks?: AddonTrack[];
  addonId?: string;
}

export interface AddonArtist {
  id: string;
  name: string;
  image?: string;
  artworkURL?: string;
  genres?: string[];
  bio?: string;
}

export interface AddonPlaylist {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  artworkURL?: string;
  cover?: string;
  image?: string;
  author?: string;
  creator?: string;
  trackCount?: number;
  tracks?: AddonTrack[];
}

export interface AddonSearchResults {
  tracks?: AddonTrack[];
  albums?: AddonAlbum[];
  artists?: AddonArtist[];
  playlists?: AddonPlaylist[];
}

export interface InstalledAddon {
  manifest: AddonManifest;
  enabled: boolean;
  installedAt: number;
  lastUsed?: number;
}
