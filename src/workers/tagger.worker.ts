import { FileRef, Id3v2Tag, FlacFile, Mp4File, ByteVector } from '@dantheman827/taglib-ts';

interface TaggerMetadata {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  year?: number;
  genre?: string;
  trackNumber?: number;
  discNumber?: number;
  comment?: string;
}

interface TaggerMessage {
  audioBuffer: ArrayBuffer;
  imageBuffer?: ArrayBuffer;
  metadata: TaggerMetadata;
  format: string;
}

self.onmessage = async (e: MessageEvent<TaggerMessage>) => {
  const { audioBuffer, imageBuffer, metadata, format } = e.data;

  try {
    const uint8Audio = new Uint8Array(audioBuffer);
    const filename = `track.${format}`;
    
    // Open file reference
    const ref = await FileRef.fromByteArray(uint8Audio, filename, false);
    if (!ref.isValid) {
      throw new Error('Invalid audio file format');
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
    }

    // Embed Image - Format specific
    if (imageBuffer) {
      const uint8Image = new Uint8Array(imageBuffer);
      const file = ref.file();
      
      try {
        if (format === 'mp3' && file instanceof MpegFile) {
          // Add to ID3v2
          // ... implementation varies, checking taglib-ts docs/source
          // For now let's try a generic approach if available
        }
      } catch (imgErr) {
        console.error('Image embedding failed:', imgErr);
      }
    }

    const saved = await ref.save();
    if (!saved) throw new Error('Failed to save tagged file');

    // Get the modified buffer
    const stream = ref.file()?.stream() as any;
    const finalBuffer = stream.data().data;

    self.postMessage({ success: true, audioBuffer: finalBuffer.buffer }, [finalBuffer.buffer]);
  } catch (err) {
    self.postMessage({ success: false, error: err instanceof Error ? err.message : 'Tagging failed' });
  }
};
