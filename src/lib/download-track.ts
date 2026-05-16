import { Track } from '@/types/music';
import { useAddonStore } from '@/stores/addonStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { inferFormatFromUrl } from '@/lib/audio-quality';
import { applyMetadataToAudio } from '@/lib/audio-tagger';

/**
 * Ported from Monochrome's api.js and downloads.js
 * Handles one-click download with metadata.
 */
export async function downloadTrackOneClick(track: Track) {
  const { resolveStreamUrl } = useAddonStore.getState();
  const { updateTask, removeTask } = useDownloadStore.getState();
  const id = track.id;

  try {
    updateTask(id, { progress: 0, status: 'resolving' });

    // 1. Resolve Stream URL
    let streamUrl = track.streamURL;
    if (!streamUrl && track.addonId && track.addonTrackId) {
      streamUrl = await resolveStreamUrl({
        id: track.addonTrackId,
        title: track.title,
        artist: track.artist,
        addonId: track.addonId,
      } as any);
    }

    if (!streamUrl) throw new Error('Could not resolve stream URL');

    updateTask(id, { progress: 10, status: 'fetching' });

    // 2. Fetch the audio file
    const response = await fetch(streamUrl);
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
          const p = 10 + (receivedLength / contentLength) * 70;
          updateTask(id, { progress: Math.round(p) });
        }
      }
    } else {
      const blob = await response.blob();
      chunks.push(new Uint8Array(await blob.arrayBuffer()));
      receivedLength = chunks[0].length;
    }

    const audioBuffer = new Uint8Array(receivedLength);
    let offset = 0;
    for (const chunk of chunks) {
      audioBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    updateTask(id, { progress: 85, status: 'tagging' });

    // 3. Fetch Lyrics (matches monochrome.tf premium tagging)
    let lyricsText = '';
    try {
      const lyricsUrl = new URL('/api/lyrics', window.location.origin);
      lyricsUrl.searchParams.append('track', track.title);
      lyricsUrl.searchParams.append('artist', track.artist);
      if (track.duration) lyricsUrl.searchParams.append('duration', track.duration.toString());
      
      const lyricsRes = await fetch(lyricsUrl.toString());
      if (lyricsRes.ok) {
        const lyricsData = await lyricsRes.json();
        lyricsText = lyricsData.syncedLyrics || lyricsData.plainLyrics || '';
      }
    } catch (err) {
      console.warn('Failed to fetch lyrics for tagging:', err);
    }

    // 4. Add Metadata using TagLib (Premium experience like Monochrome)
    const format = track.format || inferFormatFromUrl(streamUrl) || 'mp3';
    
    let coverBuffer: ArrayBuffer | undefined;
    if (track.albumCover) {
      try {
        const imgRes = await fetch(track.albumCover);
        if (imgRes.ok) {
          coverBuffer = await imgRes.arrayBuffer();
        }
      } catch (err) {
        console.warn('Failed to fetch cover for tagging:', err);
      }
    }

    const taggedBuffer = await applyMetadataToAudio(
      audioBuffer.buffer,
      {
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        year: track.year ? parseInt(track.year) : undefined,
        trackNumber: track.trackNumber,
        lyrics: lyricsText,
      },
      format,
      coverBuffer
    );


    updateTask(id, { progress: 95 });

    // 4. Trigger Download
    const finalBlob = new Blob([taggedBuffer], { 
      type: format === 'flac' ? 'audio/flac' : format === 'm4a' ? 'audio/mp4' : 'audio/mpeg' 
    });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    const safeTitle = track.title.replace(/[<>:"/\\|?*]/g, '');
    const safeArtist = track.artist.replace(/[<>:"/\\|?*]/g, '');
    a.href = url;
    a.download = `${safeArtist} - ${safeTitle}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateTask(id, { progress: 100, status: 'done' });
    setTimeout(() => removeTask(id), 3000);

  } catch (error: any) {
    console.error('Download failed:', error);
    updateTask(id, { status: 'error', error: error.message || 'Download failed' });
    setTimeout(() => removeTask(id), 5000);
  }
}
