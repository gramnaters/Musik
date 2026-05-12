import { inferFormatFromUrl } from '@/lib/audio-quality';

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
  quality?: string; // Accept any quality token from addons
  explicit?: boolean;
}

/** Pull quality / tier / bitrate from common addon and API shapes. */
export function extractAddonTrackQuality(raw: Record<string, unknown>): string | undefined {
  const asString = (v: unknown): string | undefined => {
    if (v == null) return undefined;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      const s = String(v).trim();
      return s.length ? s : undefined;
    }
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const inner =
        o.name ?? o.label ?? o.quality ?? o.tier ?? o.type ?? o.level ?? o.value ?? o.id;
      if (inner != null && typeof inner !== 'object') return String(inner).trim() || undefined;
    }
    return undefined;
  };

  const keys = [
    'audioQuality',
    'quality',
    'audio_quality',
    'stream_quality',
    'streaming_quality',
    'highest_audio_quality',
    'audio_quality_level',
    'soundQuality',
    'maxStreamingBitrate',
    'bitrate',
    'br',
    'audioBitrate',
    'avgBitrate',
    'format',
    'audio_format',
    'codec',
    'tier',
    'resolution',
  ];

  for (const k of keys) {
    const s = asString(raw[k]);
    if (s) return s;
  }

  for (const wrap of ['metadata', 'audio', 'stream', 'playback', 'track']) {
    const nested = raw[wrap];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const o = nested as Record<string, unknown>;
      for (const k of keys) {
        const s = asString(o[k]);
        if (s) return s;
      }
    }
  }

  const bps = raw.bitrateBps ?? raw.bit_rate;
  if (typeof bps === 'number' && bps > 0) {
    if (bps >= 1_500_000) return 'HI_RES';
    if (bps >= 700_000) return 'LOSSLESS';
    if (bps >= 256_000) return '320';
    return String(Math.round(bps / 1000));
  }

  return undefined;
}

// Helper to normalize track fields from various addon response formats
export function normalizeAddonTrack(raw: Record<string, unknown>, addonId: string, addonName: string, baseURL?: string): AddonTrack {
  let format = raw.format ? String(raw.format) : undefined;
  const ct = raw.contentType ?? raw.mimeType ?? raw.mime_type;
  if (!format && typeof ct === 'string') {
    const lower = ct.toLowerCase();
    if (lower.includes('flac')) format = 'flac';
    else if (lower.includes('wav')) format = 'wav';
    else if (lower.includes('mpeg') || lower.includes('mp3')) format = 'mp3';
    else if (lower.includes('aac') || lower.includes('mp4')) format = 'aac';
    else if (lower.includes('opus')) format = 'opus';
  }

  const streamURLEarly = raw.streamURL ? String(raw.streamURL) : raw.url ? String(raw.url) : undefined;
  if (!format && streamURLEarly) {
    const inf = inferFormatFromUrl(streamURLEarly);
    if (inf) format = inf;
  }

  const track: AddonTrack = {
    id: String(raw.id ?? raw.trackId ?? raw.track_id ?? raw.songId ?? raw.song_id ?? ''),
    title: String(raw.title ?? 'Unknown'),
    artist: String(raw.artist ?? raw.artistName ?? 'Unknown Artist'),
    album: raw.album ? String(raw.album) : raw.albumTitle ? String(raw.albumTitle) : undefined,
    duration: typeof raw.duration === 'number' ? raw.duration : raw.duration ? parseInt(String(raw.duration), 10) || undefined : undefined,
    streamURL: streamURLEarly,
    format,
    isrc: raw.isrc ? String(raw.isrc) : undefined,
    artistId: raw.artistId ? String(raw.artistId) : raw.artist_id ? String(raw.artist_id) : undefined,
    albumId: raw.albumId ? String(raw.albumId) : undefined,
    quality: extractAddonTrackQuality(raw),
    explicit: !!(raw.explicit ?? raw.isExplicit),
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

/** Catalog / registry the user added (e.g. Eclipse store JSON). */
export interface AddonSource {
  id: string;
  name: string;
  /** Full URL to registry JSON. Empty string = built-in default catalog (`/api/addons/store`). */
  registryUrl: string;
  builtIn?: boolean;
}

export interface InstalledAddon {
  manifest: AddonManifest;
  enabled: boolean;
  installedAt: number;
  lastUsed?: number;
  /** Which catalog row installed this (`custom` = manual URL from Connections). */
  sourceId: string;
  /**
   * 8SPINE module source: for **wrapped** modules, inner template-literal body; for **bare** modules, full file text.
   * When set, search/stream use this runtime instead of HTTP `baseURL` routes.
   */
  eightspineInnerCode?: string;
  /** `wrapped` = export const … = \`…\`; `bare` = script ending in `return { … }` (e.g. Qobuz/Tidal, YouTube). */
  eightspineKind?: 'wrapped' | 'bare';
}
