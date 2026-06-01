import type { Track } from '@/types/music';
import { inferFormatFromUrl } from '@/lib/audio-quality';

/** Map `/api/metadata/search` track JSON into app `Track` with honest codec hints for quality badges. */
export function mapMetadataSearchTrack(x: Record<string, unknown>): Track {
  const streamURL = x.streamURL ? String(x.streamURL) : undefined;
  const explicit =
    x.explicit === true ||
    x.explicit === 'true' ||
    x.trackExplicitness === 'explicit' ||
    x.trackExplicitness === 'explicit_edited';
  return {
    id: String(x.id ?? ''),
    title: String(x.title ?? ''),
    artist: String(x.artist ?? ''),
    album: x.album ? String(x.album) : undefined,
    albumCover: x.albumCover ? String(x.albumCover) : undefined,
    albumId: x.albumId ? String(x.albumId) : undefined,
    artistId: x.artistId ? String(x.artistId) : undefined,
    isrc: x.isrc ? String(x.isrc) : undefined,
    duration: typeof x.duration === 'number' ? x.duration : undefined,
    streamURL,
    format: inferFormatFromUrl(streamURL),
    quality: typeof x.quality === 'string' ? x.quality : undefined,
    explicit: Boolean(explicit),
  };
}
