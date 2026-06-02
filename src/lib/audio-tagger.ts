// Dynamic import used below to avoid resolution issues

export interface TagMetadata {
  title?: string;
  artist?: string;
  albumArtist?: string;
  album?: string;
  year?: number;
  genre?: string;
  trackNumber?: number;
  totalTracks?: number;
  discNumber?: number;
  totalDiscs?: number;
  comment?: string;
  lyrics?: string;
  isrc?: string;
  upc?: string;
  bpm?: number;
  copyright?: string;
}

/**
 * High-performance browser-side audio tagging using taglib-ts.
 * Matches the approach used in Monochrome (js/taglib.worker.ts).
 *
 * Uses the PropertyMap + setComplexProperties API rather than the
 * format-specific tag() method, which works across FLAC, MP3, MP4, OGG, WAV.
 */
export async function applyMetadataToAudio(
  audioBuffer: ArrayBuffer,
  metadata: TagMetadata,
  format: string,
  imageBuffer?: ArrayBuffer
): Promise<ArrayBuffer> {
  const taglib = await import('../../node_modules/@dantheman827/taglib-ts/dist/index.js');
  const { ByteVector, FileRef, PropertyMap, Variant, ChunkedByteVectorStream, BlobStream, ReadStyle } = taglib as any;

  const uint8Audio = new Uint8Array(audioBuffer);
  const filename = `track.${format}`;

  try {
    const ref = await FileRef.fromByteArray(uint8Audio, filename, false, ReadStyle.Average);
    if (!ref.isValid) {
      console.warn('TagLib: File format not recognized, skipping tagging.');
      return audioBuffer;
    }

    const props: any = ref.properties();

    if (metadata.title) props.replace('TITLE', [metadata.title]);
    if (metadata.artist) props.replace('ARTIST', [metadata.artist]);
    if (metadata.album) props.replace('ALBUM', [metadata.album]);
    if (metadata.albumArtist) props.replace('ALBUMARTIST', [metadata.albumArtist]);
    if (metadata.comment) props.replace('COMMENT', [metadata.comment]);
    if (metadata.genre) props.replace('GENRE', [metadata.genre]);
    if (metadata.year) props.replace('DATE', [String(metadata.year)]);
    if (metadata.trackNumber) {
      const needsCombined = format === 'm4a' || format === 'mp4' || format === 'mp3';
      const t = needsCombined && metadata.totalTracks
        ? `${metadata.trackNumber}/${metadata.totalTracks}`
        : String(metadata.trackNumber);
      props.replace('TRACKNUMBER', [t]);
      if (!needsCombined && metadata.totalTracks) {
        props.replace('TRACKTOTAL', [String(metadata.totalTracks)]);
      }
    }
    if (metadata.discNumber) {
      const needsCombined = format === 'm4a' || format === 'mp4' || format === 'mp3';
      const d = needsCombined && metadata.totalDiscs
        ? `${metadata.discNumber}/${metadata.totalDiscs}`
        : String(metadata.discNumber);
      props.replace('DISCNUMBER', [d]);
      if (!needsCombined && metadata.totalDiscs) {
        props.replace('DISCTOTAL', [String(metadata.totalDiscs)]);
      }
    }
    if (metadata.bpm != null && Number.isFinite(metadata.bpm)) {
      props.replace('BPM', [String(Math.round(metadata.bpm))]);
    }
    if (metadata.copyright) props.replace('COPYRIGHT', [metadata.copyright]);
    if (metadata.isrc) props.replace('ISRC', [metadata.isrc]);
    if (metadata.upc) props.replace('UPC', [metadata.upc]);
    if (metadata.lyrics) {
      props.replace('LYRICS', [metadata.lyrics.replace(/\r/g, '').replace(/\n/g, '\r\n')]);
    }

    ref.setProperties(props);

    if (imageBuffer) {
      const pictureMap: Map<string, any> = new Map();
      pictureMap.set('data', Variant.fromByteVector(ByteVector.fromByteArray(new Uint8Array(imageBuffer))));
      pictureMap.set('mimeType', Variant.fromString('image/jpeg'));
      pictureMap.set('pictureType', Variant.fromInt(3));
      try {
        ref.setComplexProperties('PICTURE', [pictureMap]);
      } catch (imgErr) {
        console.error('TagLib: Failed to add cover art', imgErr);
      }
    }

    const saved = await ref.save();
    if (!saved) {
      console.error('TagLib: Failed to save changes.');
      return audioBuffer;
    }

    const file = ref.file();
    if (!file) return audioBuffer;

    const stream = file.stream();
    if (stream instanceof ChunkedByteVectorStream) {
      const data: Uint8Array = stream.data().data;
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    }
    if (stream instanceof BlobStream) {
      const blob: Blob = stream.toBlob();
      return await blob.arrayBuffer();
    }
    console.warn('TagLib: unexpected stream type after save', stream?.constructor?.name);
    return audioBuffer;
  } catch (err) {
    console.error('TagLib error:', err);
    return audioBuffer;
  }
}
