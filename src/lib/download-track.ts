import { Track } from '@/types/music';
import { useAddonStore } from '@/stores/addonStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { useStreamingStore } from '@/stores/streamingStore';
import { applyMetadataToAudio, TagMetadata } from '@/lib/audio-tagger';
import { createBulkWriter, buildTrackFilename, buildAlbumFolder, SequentialFileWriter, WriterEntry } from '@/lib/download-writer';
import { generateM3U, generateCUE } from '@/lib/playlist-generator';

function detectAudioFormat(view: DataView, mimeType = ''): string | null {
  // FLAC: "fLaC"
  if (view.byteLength >= 4 &&
      view.getUint8(0) === 0x66 && view.getUint8(1) === 0x4c &&
      view.getUint8(2) === 0x61 && view.getUint8(3) === 0x43) {
    return 'flac';
  }
  // OGG: "OggS"
  if (view.byteLength >= 4 &&
      view.getUint8(0) === 0x4f && view.getUint8(1) === 0x67 &&
      view.getUint8(2) === 0x67 && view.getUint8(3) === 0x53) {
    return 'ogg';
  }
  // MP4/M4A: "ftyp" at offset 4
  if (view.byteLength >= 8 &&
      view.getUint8(4) === 0x66 && view.getUint8(5) === 0x74 &&
      view.getUint8(6) === 0x79 && view.getUint8(7) === 0x70) {
    return 'mp4';
  }
  // MP3 ID3v2 tag: "ID3"
  if (view.byteLength >= 3 &&
      view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
    return 'mp3';
  }
  // MP3 frame sync: 0xFF 0xFB/0xFA/0xF3/0xF2
  if (view.byteLength >= 2 && view.getUint8(0) === 0xff && (view.getUint8(1) & 0xe0) === 0xe0) {
    return 'mp3';
  }
  // RIFF/WAVE
  if (view.byteLength >= 12 &&
      view.getUint8(0) === 0x52 && view.getUint8(1) === 0x49 &&
      view.getUint8(2) === 0x46 && view.getUint8(3) === 0x46 &&
      view.getUint8(8) === 0x57 && view.getUint8(9) === 0x41 &&
      view.getUint8(10) === 0x56 && view.getUint8(11) === 0x45) {
    return 'wav';
  }
  // MIME fallback
  const mt = (mimeType || '').toLowerCase();
  if (mt === 'audio/flac') return 'flac';
  if (mt === 'audio/ogg' || mt === 'audio/opus') return 'ogg';
  if (mt === 'audio/mp4' || mt === 'audio/x-m4a') return 'm4a';
  if (mt === 'audio/mp3' || mt === 'audio/mpeg') return 'mp3';
  if (mt === 'audio/wav' || mt === 'audio/x-wav') return 'wav';
  return null;
}

async function getExtensionFromBlob(blob: Blob): Promise<string> {
  let view: DataView;
  try {
    const buf = await blob.slice(0, 12).arrayBuffer();
    view = new DataView(buf);
  } catch {
    view = new DataView(new ArrayBuffer(0));
  }
  const format = detectAudioFormat(view, blob.type);
  if (format === 'mp4') return 'm4a';
  if (format) return format;
  // Last resort: trust the response Content-Type
  const mt = (blob.type || '').toLowerCase();
  if (mt.includes('flac')) return 'flac';
  if (mt.includes('ogg') || mt.includes('opus')) return 'ogg';
  if (mt.includes('mp4') || mt.includes('m4a')) return 'm4a';
  if (mt.includes('mpeg') || mt.includes('mp3')) return 'mp3';
  if (mt.includes('wav')) return 'wav';
  // Default to flac — jimmy/spotiflac addons serve lossless by default
  return 'flac';
}

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

async function fetchCover(track: Track, size?: number): Promise<ArrayBuffer | undefined> {
  if (!track.albumCover) return;
  try {
    let url = track.albumCover;
    if (size) {
      url = url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
    }
    const res = await fetch(url);
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
  const { streamingQuality, downloadQuality, embedLyricsInFiles, embedCoverArtInFiles, coverArtSize } = useStreamingStore.getState();
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

  // 2. Fetch audio at requested quality
  const audioBlob = await fetchAudioWithProgress(streamUrl, opts);
  const ext = await getExtensionFromBlob(audioBlob);

  opts.onProgress?.(90);

  // 5. Fetch cover + lyrics (respect settings)
  const [coverBuffer, lyricsText] = await Promise.all([
    embedCoverArtInFiles !== false ? fetchCover(track, coverArtSize || undefined) : Promise.resolve(undefined),
    embedLyricsInFiles !== false ? fetchLyrics(track) : Promise.resolve(''),
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

  const audioBuffer = await audioBlob.arrayBuffer();
  const taggedBuffer = await applyMetadataToAudio(audioBuffer, meta, ext, coverBuffer);

  opts.onProgress?.(98);

  return new Blob([taggedBuffer], { type: `audio/${ext === 'flac' ? 'flac' : ext === 'm4a' ? 'mp4' : 'mpeg'}` });
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
  const { streamingQuality, downloadQuality, filenameTemplate, folderTemplate, bulkDownloadMethod, writeArtistsSeparately, downloadConcurrentCount } = useStreamingStore.getState();
  const qual = opts.quality || downloadQuality || streamingQuality || 'LOSSLESS';
  const method = opts.method || bulkDownloadMethod || 'sequential';
  const ftpl = opts.template || filenameTemplate || '{artist} - {title}';
  const fdtpl = opts.folderTemplate || folderTemplate || '{artist}/{album}';

  const folderName = opts.albumName && opts.artistName
    ? buildAlbumFolder({ artist: opts.artistName, album: opts.albumName, template: fdtpl })
    : '';

  const writer = await createBulkWriter(method, folderName);
  const trackPaths: (string | null)[] = [];
  const concurrency = Math.max(1, Math.min(downloadConcurrentCount || 3, tracks.length));

  async function* yieldFiles(): AsyncGenerator<WriterEntry> {
    let idx = 0;
    async function processOne(track: Track, i: number): Promise<void> {
      const taskId = `bulk_${track.id}_${Date.now()}`;
      updateTask(taskId, { progress: 0, status: 'fetching' });
      try {
        const blob = await downloadTrackEnhanced({ track, quality: qual });
        const ext = await getExtensionFromBlob(blob);
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
        const filePath = folderName ? `${folderName}/${name}` : (writeArtistsSeparately && track.artist ? `${track.artist}/${name}` : name);
        trackPaths[i] = name;
        entries.push({ name: filePath, lastModified: new Date(), input: blob });
        updateTask(taskId, { progress: 100, status: 'done' });
      } catch (err: any) {
        trackPaths[i] = null;
        updateTask(taskId, { status: 'error', error: err.message });
      }
      setTimeout(() => useDownloadStore.getState().removeTask(taskId), 3000);
    }

    const entries: WriterEntry[] = [];
    let nextIdx = 0;

    const workers: Promise<void>[] = [];
    for (let w = 0; w < concurrency; w++) {
      workers.push((async () => {
        while (nextIdx < tracks.length) {
          const i = nextIdx++;
          await processOne(tracks[i], i);
        }
      })());
    }
    await Promise.all(workers);

    for (const entry of entries) {
      yield entry;
    }

    // Yield metadata files (m3u, cue)
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

    const ext = await getExtensionFromBlob(blob);
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
