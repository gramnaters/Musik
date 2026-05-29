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
 * High-performance browser-side audio tagging using TagLib.
 * Matches the premium experience of monochrome.tf
 */
export async function applyMetadataToAudio(
  audioBuffer: ArrayBuffer,
  metadata: TagMetadata,
  format: string,
  imageBuffer?: ArrayBuffer
): Promise<ArrayBuffer> {
  // Use dynamic import to help Next.js/Turbopack resolve the module correctly
  const { FileRef, ByteVector } = await import('../../node_modules/@dantheman827/taglib-ts/dist/index.js');
  
  const uint8Audio = new Uint8Array(audioBuffer);
  const filename = `track.${format}`;

  try {
    // Open file reference (virtual filesystem in memory)
    const ref = await FileRef.fromByteArray(uint8Audio, filename, false);
    if (!ref.isValid) {
      console.warn('TagLib: File format not recognized, skipping tagging.');
      return audioBuffer;
    }

    const tag = ref.tag();
    if (tag) {
      if (metadata.title) tag.title = metadata.title;
      if (metadata.artist) tag.artist = metadata.artist;
      if (metadata.album) tag.album = metadata.album;
      if (metadata.comment) tag.comment = metadata.comment;
      if (metadata.genre) tag.genre = metadata.genre;
      if (metadata.year) tag.year = metadata.year;
      if (metadata.trackNumber) tag.track = metadata.trackNumber;
      if (metadata.totalTracks) tag.setProperty('TRACKTOTAL', String(metadata.totalTracks));
      if (metadata.discNumber) tag.disc = metadata.discNumber;
      if (metadata.totalDiscs) tag.setProperty('DISCTOTAL', String(metadata.totalDiscs));
      if (metadata.albumArtist) tag.setProperty('ALBUMARTIST', metadata.albumArtist);
      if (metadata.isrc) tag.setProperty('ISRC', metadata.isrc);
      if (metadata.upc) tag.setProperty('UPC', metadata.upc);
      if (metadata.bpm) tag.setProperty('BPM', String(metadata.bpm));
      if (metadata.copyright) tag.setProperty('COPYRIGHT', metadata.copyright);

      if (metadata.lyrics) {
        tag.setProperty('LYRICS', metadata.lyrics);
      }

      // Add Cover Art
      if (imageBuffer) {
        try {
          const pictureData = ByteVector.fromArray(new Uint8Array(imageBuffer));
          tag.setComplexProperties('PICTURE', [
            {
              data: pictureData,
              mimeType: 'image/jpeg',
              pictureType: 3, // Front Cover
              description: 'Front Cover'
            }
          ]);
        } catch (imgErr) {
          console.error('TagLib: Failed to add cover art', imgErr);
        }
      }
    }

    // Save changes
    const saved = await ref.save();
    if (!saved) {
      console.error('TagLib: Failed to save changes.');
      return audioBuffer;
    }

    const file = ref.file();
    if (!file) return audioBuffer;
    
    const stream = file.stream() as any;
    const finalData = stream.data().data;

    ref.close();
    return finalData.buffer;
  } catch (err) {
    console.error('TagLib error:', err);
    return audioBuffer;
  }
}
