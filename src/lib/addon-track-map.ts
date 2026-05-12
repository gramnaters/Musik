import type { Track } from '@/types/music';
import type { AddonTrack } from '@/types/addon';
import { inferFormatFromUrl } from '@/lib/audio-quality';

export function addonTrackToTrack(t: AddonTrack): Track {
  const streamURL = t.streamURL;
  const format = t.format?.trim() || inferFormatFromUrl(streamURL);
  return {
    id: `addon_${t.addonId}_${t.id}`,
    title: t.title,
    artist: t.artist,
    album: t.album,
    albumCover: t.artworkURL || t.cover,
    duration: t.duration,
    streamURL,
    albumId: t.albumId,
    artistId: t.artistId,
    addonId: t.addonId,
    addonTrackId: t.id,
    quality: t.quality,
    format,
    explicit: t.explicit,
  };
}
