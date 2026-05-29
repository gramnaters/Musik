import { Track } from '@/types/music';
import { useAddonStore } from '@/stores/addonStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { useStreamingStore } from '@/stores/streamingStore';
import { applyMetadataToAudio, TagMetadata } from '@/lib/audio-tagger';
import { isCustomFormat, transcodeAudio, getExtensionFromBlob } from '@/lib/download-ffmpeg';
import { createBulkWriter, buildTrackFilename, buildAlbumFolder, SequentialFileWriter, WriterEntry } from '@/lib/download-writer';
import { generateM3U, generateCUE } from '@/lib/playlist-generator';

interface DownloadOpts {
  track: Track;
  quality?: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

async function fetchAudioWithProgress(url: string, opts: DownloadOpts): Promise<Blob> {
  const response = await fetch(url, { signal: opts.signal });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const reader = response.body?.getReader();
  const contentLength = +(response.headers.get('Content-Length') ?? 0);
  let receivedLength = 0;
  const chunks: Uint8Array[] = [];

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      if (contentLength) {
        const p = (receivedLength / contentLength) * 100;
        opts.onProgress?.(Math.round(p));
      }
    }
  } else {
    const blob = await response.blob();
    return blob;
  }

  const buffer = new Uint8Array(receivedLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return new Blob([buffer], { type: response.headers.get('Content-Type') || '' });
}

async function fetchCover(track: Track): Promise<ArrayBuffer | undefined> {
  if (!track.albumCover) return;
  try {
    const res = await fetch(track.albumCover);
    if (res.ok) return res.arrayBuffer();
  } catch {}
}

async function fetchLyrics(track: Track): Promise<string> {
  try {
    const url = new URL('/api/lyrics', window.location.origin);
    url.searchParams.append('track', track.title);
    url.searchParams.append('artist', track.artist);
    if (track.duration) url.searchParams.append('duration', String(track.duration));
    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      return data.syncedLyrics || data.plainLyrics || '';
    }
  } catch {}
  return '';
}

export async function downloadTrackEnhanced(opts: DownloadOpts): Promise<Blob> {
  const { track, quality: qualityOverride, signal } = opts;
  const { resolveRawStreamUrl } = useAddonStore.getState();
  const { streamingQuality, downloadQuality } = useStreamingStore.getState();
  const qual = qualityOverride || downloadQuality || streamingQuality || 'LOSSLESS';

  // 1. Resolve raw stream URL from addon
  let streamUrl = track.streamURL;
  if (!streamUrl || streamUrl.includes('/api/stream')) {
    const raw = await resolveRawStreamUrl({
      id: track.addonTrackId || track.id,
      title: track.title,
      artist: track.artist,
      addonId: track.addonId,
      streamURL: track.streamURL,
    } as any, qual);
    if (raw) streamUrl = raw;
  }
  if (!streamUrl) throw new Error('Could not resolve stream URL');

  // 2. Determine download quality strategy
  const isCustom = isCustomFormat(qual);
  const downloadQualityActual = isCustom ? 'LOSSLESS' : qual;

  // 3. Fetch audio at source quality
  const audioBlob = await fetchAudioWithProgress(streamUrl, opts);
  const sourceExt = getExtensionFromBlob(audioBlob);

  // 4. FFmpeg post-processing (Monochrome-style)
  let processedBlob = audioBlob;
  let finalExt = sourceExt;
  if (isCustom) {
    opts.onProgress?.(85);
    processedBlob = await transcodeAudio(audioBlob, qual, (p) => opts.onProgress?.(85 + Math.round(p * 0.05)));
    finalExt = sourceExt === 'flac' ? 'flac' : 'mp3';
  } else if (qual === 'LOSSLESS' || qual === 'HI_RES_LOSSLESS') {
    if (sourceExt === 'm4a' || sourceExt === 'mp4') {
      // Remux M4A to FLAC if lossless container is set to flac
      opts.onProgress?.(85);
      const { losslessContainer } = useStreamingStore.getState();
      if (losslessContainer === 'flac') {
        processedBlob = await transcodeAudio(audioBlob, 'FFMPEG_ALAC', (p) => opts.onProgress?.(85 + Math.round(p * 0.05)));
        finalExt = 'flac';
      }
    }
    finalExt = sourceExt;
  }

  opts.onProgress?.(90);

  // 5. Fetch cover + lyrics
  const [coverBuffer, lyricsText] = await Promise.all([
    fetchCover(track),
    fetchLyrics(track),
  ]);

  // 6. Enhanced metadata tagging
  const meta: TagMetadata = {
    title: track.title,
    artist: track.artist,
    albumArtist: track.albumArtist || track.artist,
    album: track.album || '',
    year: track.year ? parseInt(track.year) : undefined,
    trackNumber: track.trackNumber,
    discNumber: track.discNumber,
    totalTracks: track.totalTracks,
    totalDiscs: track.totalDiscs,
    isrc: track.isrc,
    upc: track.upc,
    bpm: track.bpm,
    copyright: track.copyright,
    lyrics: lyricsText,
    comment: `Downloaded via Musik | Quality: ${qual}`,
  };

  const audioBuffer = await processedBlob.arrayBuffer();
  const taggedBuffer = await applyMetadataToAudio(audioBuffer, meta, finalExt, coverBuffer);

  opts.onProgress?.(98);

  return new Blob([taggedBuffer], { type: `audio/${finalExt === 'flac' ? 'flac' : finalExt === 'm4a' ? 'mp4' : 'mpeg'}` });
}

export async function downloadTracksBulk(
  tracks: Track[],
  opts: {
    albumName?: string;
    artistName?: string;
    quality?: string;
    method?: string;
    template?: string;
    folderTemplate?: string;
  } = {}
) {
  const { updateTask } = useDownloadStore.getState();
  const { streamingQuality, downloadQuality, filenameTemplate, folderTemplate, bulkDownloadMethod } = useStreamingStore.getState();
  const qual = opts.quality || downloadQuality || streamingQuality || 'LOSSLESS';
  const method = opts.method || bulkDownloadMethod || 'sequential';
  const ftpl = opts.template || filenameTemplate || '{artist} - {title}';
  const fdtpl = opts.folderTemplate || folderTemplate || '{artist}/{album}';

  const folderName = opts.albumName && opts.artistName
    ? buildAlbumFolder({ artist: opts.artistName, album: opts.albumName, template: fdtpl })
    : '';

  const writer = await createBulkWriter(method, folderName);
  const trackPaths: (string | null)[] = [];

  async function* yieldFiles(): AsyncGenerator<WriterEntry> {
    // 1. Download all tracks, yield each immediately, collect paths
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const taskId = `bulk_${track.id}_${Date.now()}`;
      updateTask(taskId, { progress: 0, status: 'fetching' });

      try {
        const blob = await downloadTrackEnhanced({ track, quality: qual });
        const ext = getExtensionFromBlob(blob);

        const name = buildTrackFilename({
          trackNumber: track.trackNumber || i + 1,
          discNumber: track.discNumber,
          title: track.title,
          artist: track.artist,
          album: track.album,
          quality: qual.toLowerCase(),
          ext,
          template: ftpl,
        });

        const filePath = folderName ? `${folderName}/${name}` : name;
        trackPaths.push(name);
        yield { name: filePath, lastModified: new Date(), input: blob };
        updateTask(taskId, { progress: 100, status: 'done' });
      } catch (err: any) {
        trackPaths.push(null);
        updateTask(taskId, { status: 'error', error: err.message });
      }
      setTimeout(() => useDownloadStore.getState().removeTask(taskId), 3000);
    }

    // 2. Yield metadata files (m3u, cue) — SequentialFileWriter skips these; Zip/Folder writers include them
    if (tracks.length > 0 && folderName) {
      const folderLabel = opts.albumName || 'Album';
      const meta = { title: folderLabel, artist: opts.artistName || tracks[0].artist };

      const m3uContent = generateM3U(meta, tracks, trackPaths);
      yield { name: `${folderName}/${folderLabel}.m3u`, lastModified: new Date(), input: m3uContent };

      if (opts.albumName) {
        const cueContent = generateCUE(meta, tracks, trackPaths);
        yield { name: `${folderName}/${folderLabel}.cue`, lastModified: new Date(), input: cueContent };
      }
    }
  }

  await writer.write(yieldFiles());
}

export async function downloadSingleTrack(track: Track, qualityOverride?: string): Promise<void> {
  const id = track.id;
  const { updateTask, removeTask } = useDownloadStore.getState();

  try {
    updateTask(id, { progress: 0, status: 'resolving' });
    const blob = await downloadTrackEnhanced({
      track,
      quality: qualityOverride,
      onProgress: (pct) => updateTask(id, { progress: Math.round(pct) }),
    });
    updateTask(id, { progress: 98, status: 'tagging' });

    const ext = getExtensionFromBlob(blob);
    const writer = new SequentialFileWriter();
    const name = buildTrackFilename({
      trackNumber: track.trackNumber,
      title: track.title,
      artist: track.artist,
      album: track.album,
      quality: (qualityOverride || useStreamingStore.getState().downloadQuality || 'LOSSLESS').toLowerCase(),
      ext,
      template: useStreamingStore.getState().filenameTemplate,
    });

    async function* singleFile(): AsyncGenerator<WriterEntry> {
      yield { name, lastModified: new Date(), input: blob };
    }
    await writer.write(singleFile());

    updateTask(id, { progress: 100, status: 'done' });
    setTimeout(() => removeTask(id), 3000);
  } catch (err: any) {
    updateTask(id, { status: 'error', error: err.message });
    setTimeout(() => removeTask(id), 5000);
  }
}
