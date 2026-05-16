export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: string;
  types?: string[];
  resources?: string[];
  baseURL?: string;
  author?: string;
}

export interface AddonSearchResults {
  tracks?: AddonTrack[];
  albums?: AddonAlbum[];
  artists?: AddonArtist[];
  playlists?: AddonPlaylist[];
}

export interface AddonTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  duration?: number;
  streamURL?: string;
  addonId?: string;
  addonName?: string;
  albumId?: string;
  artistId?: string;
}

export interface AddonAlbum {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  trackCount?: number;
  year?: string;
  tracks?: AddonTrack[];
}

export interface AddonArtist {
  id: string;
  name: string;
  image?: string;
  genres?: string[];
}

export interface AddonPlaylist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  author?: string;
  trackCount?: number;
  tracks?: AddonTrack[];
}

export interface InstalledAddon {
  manifest: AddonManifest;
  enabled: boolean;
  installedAt: number;
  lastUsed?: number;
}
