export const CUSTOM_FORMATS: Record<string, { codec: string; bitrate: string; ext: string; label: string }> = {
  FFMPEG_MP3_320: { codec: 'libmp3lame', bitrate: '320k', ext: 'mp3', label: 'MP3 320kbps' },
  FFMPEG_MP3_256: { codec: 'libmp3lame', bitrate: '256k', ext: 'mp3', label: 'MP3 256kbps' },
  FFMPEG_MP3_128: { codec: 'libmp3lame', bitrate: '128k', ext: 'mp3', label: 'MP3 128kbps' },
  FFMPEG_OGG_256: { codec: 'libvorbis', bitrate: '256k', ext: 'ogg', label: 'OGG 256kbps' },
  FFMPEG_OGG_128: { codec: 'libvorbis', bitrate: '128k', ext: 'ogg', label: 'OGG 128kbps' },
  FFMPEG_AAC_256: { codec: 'aac', bitrate: '256k', ext: 'm4a', label: 'AAC 256kbps' },
  FFMPEG_ALAC: { codec: 'alac', bitrate: '', ext: 'm4a', label: 'ALAC' },
};

export function isCustomFormat(quality: string): boolean {
  return quality in CUSTOM_FORMATS;
}

export function getExtensionFromBlob(blob: Blob): string {
  const u8 = new Uint8Array(blob.slice(0, 12));
  const sig = Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join(' ');
  if (sig.startsWith('66 4c 61 43')) return 'flac';
  if (sig.startsWith('ff f') || sig.startsWith('ff e') || sig.startsWith('ff f3') || sig.startsWith('49 44 33')) return 'mp3';
  if (sig.startsWith('00 00 00 18 66 74 79 70 6d 70 34 32') || sig.startsWith('00 00 00 20 66 74 79 70') || sig.startsWith('4d 34 41 20')) return 'm4a';
  if (sig.startsWith('4f 67 67 53')) return 'ogg';
  if (sig.startsWith('52 49 46 46')) return 'wav';
  return 'mp3';
}

export async function transcodeAudio(
  blob: Blob,
  targetFormat: string,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ type, message }) => {
    if (type === 'ffout' && message.includes('time=')) {
      const m = message.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (m) {
        const secs = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
        onProgress?.(Math.min(95, Math.round(secs * 3)));
      }
    }
  });

  const ext = getExtensionFromBlob(blob);
  const inputName = `input.${ext}`;
  const fmt = CUSTOM_FORMATS[targetFormat];
  const outputExt = fmt?.ext || ext;
  const outputName = `output.${outputExt}`;

  await ffmpeg.load();
  ffmpeg.writeFile(inputName, await fetchFile(blob));

  if (fmt && fmt.codec !== 'copy') {
    await ffmpeg.exec(['-i', inputName, '-c:a', fmt.codec, '-b:a', fmt.bitrate, '-vn', outputName]);
  } else if (targetFormat === 'FFMPEG_ALAC') {
    await ffmpeg.exec(['-i', inputName, '-c:a', 'alac', '-vn', outputName]);
  } else {
    await ffmpeg.exec(['-i', inputName, '-c:a', 'copy', '-vn', outputName]);
  }

  const data = ffmpeg.readFile(outputName);
  ffmpeg.deleteFile(inputName);
  ffmpeg.deleteFile(outputName);
  ffmpeg.terminate();

  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  return new Blob([uint8], { type: `audio/${outputExt === 'm4a' ? 'mp4' : outputExt}` });
}
