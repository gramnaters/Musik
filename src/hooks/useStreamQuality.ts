import { useEffect, useRef, useState } from 'react';

export type StreamCodec = 'FLAC' | 'MP3' | 'AAC' | 'OPUS' | 'OGG' | 'WAV' | 'M4A' | 'UNKNOWN';

export type LiveStreamQuality = {
  /** Short codec label (e.g. "FLAC", "AAC", "MP3"). */
  codec: StreamCodec;
  /** Measured bitrate in kbps (derived from Content-Length / duration), if known. */
  bitrateKbps?: number;
  /** True once a HEAD probe has completed (true even if the probe failed). */
  probed: boolean;
};

const cache = new Map<string, LiveStreamQuality>();

function codecFromUrl(url: string): StreamCodec {
  const u = (url || '').toLowerCase();
  if (/\.flac(\?|$)/.test(u)) return 'FLAC';
  if (/\.wav(\?|$)/.test(u)) return 'WAV';
  if (/\.opus(\?|$)/.test(u)) return 'OPUS';
  if (/\.ogg(\?|$)/.test(u)) return 'OGG';
  if (/\.m4a(\?|$)/.test(u)) return 'M4A';
  if (/\.aac(\?|$)/.test(u)) return 'AAC';
  if (/\.mp3(\?|$)/.test(u)) return 'MP3';

  // Qobuz uses ?fmt=N query codes (no file extension in the URL):
  //   5 = MP3 320, 6 = FLAC 16-bit, 7 = FLAC 24-bit/96kHz, 27 = FLAC 24/192
  if (/[?&]fmt=5(\D|$)/.test(u)) return 'MP3';
  if (/[?&]fmt=(6|7|27|28)(\D|$)/.test(u)) return 'FLAC';

  return 'UNKNOWN';
}

function codecFromContentType(ct: string | null, fallback: StreamCodec): StreamCodec {
  if (!ct) return fallback;
  const t = ct.toLowerCase();
  if (t.includes('flac')) return 'FLAC';
  if (t.includes('wav') || t.includes('pcm')) return 'WAV';
  if (t.includes('opus')) return 'OPUS';
  if (t.includes('ogg')) return 'OGG';
  if (t.includes('mp4') || t.includes('m4a') || t.includes('aac')) return 'AAC';
  if (t.includes('mpeg') || t.includes('mp3')) return 'MP3';
  return fallback;
}

/**
 * Inspect the actual stream currently loaded into the <audio> element by HEADing
 * the local proxy and reading Content-Length + Content-Type. Mirrors what
 * Monochrome does with Shaka `getVariantTracks()` (audioCodec, audioBandwidth)
 * without bringing in a DASH/EME player.
 *
 * @param streamURL  The actual upstream stream URL (`track.streamURL`).
 * @param duration   The track duration in seconds. Required to derive bitrate.
 */
export function useStreamQuality(streamURL: string | undefined, duration: number | undefined): LiveStreamQuality {
  const [quality, setQuality] = useState<LiveStreamQuality>(() => {
    if (!streamURL) return { codec: 'UNKNOWN', probed: false };
    const cached = cache.get(streamURL);
    return cached ?? { codec: codecFromUrl(streamURL), probed: false };
  });
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!streamURL) {
      setQuality({ codec: 'UNKNOWN', probed: false });
      return;
    }
    const cached = cache.get(streamURL);
    if (cached) {
      setQuality(cached);
      return;
    }

    // Show the URL-derived codec immediately so the badge appears right away,
    // even before the HEAD probe completes. The probe updates it to the real
    // Content-Type as soon as it lands.
    setQuality({ codec: codecFromUrl(streamURL), probed: false });

    const ctrl = new AbortController();
    inflight.current?.abort();
    inflight.current = ctrl;

    fetch(`/api/stream?url=${encodeURIComponent(streamURL)}`, {
      method: 'HEAD',
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HEAD ${res.status}`);
        const contentLength = Number(res.headers.get('Content-Length') || 0);
        const contentType = res.headers.get('Content-Type');
        const codec = codecFromContentType(contentType, codecFromUrl(streamURL));
        const hasDuration = duration && isFinite(duration) && duration > 0;
        const bitrateKbps =
          contentLength > 0 && hasDuration
            ? Math.round((contentLength * 8) / (duration as number) / 1000)
            : undefined;
        const result: LiveStreamQuality = { codec, bitrateKbps, probed: true };
        cache.set(streamURL, result);
        if (inflight.current === ctrl) setQuality(result);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        const result: LiveStreamQuality = { codec: codecFromUrl(streamURL), probed: true };
        cache.set(streamURL, result);
        if (inflight.current === ctrl) setQuality(result);
      });

    return () => {
      ctrl.abort();
    };
  }, [streamURL, duration]);

  return quality;
}

/**
 * Format the badge text for the playerbar — always just the codec name.
 * Matches Monochrome: shows "FLAC", "AAC", "MP3" etc. in the badge body.
 */
export function formatLiveBadge(q: LiveStreamQuality): string {
  if (q.codec === 'UNKNOWN') return '';
  return q.codec;
}

/**
 * Build a human-readable tooltip for the live quality badge.
 * Matches Monochrome hover behavior: "24-bit / 96 kHz • 2840 kbps" or
 * "AAC • 256 kbps" depending on what we know from the probe.
 */
export function formatLiveTooltip(q: LiveStreamQuality, trackQuality?: string): string {
  if (q.codec === 'UNKNOWN') return 'Stream quality unknown';

  const parts: string[] = [];

  // Try to derive bit depth / sample rate from the track's quality string
  // e.g. "96kHz/24bit", "24-bit / 96 kHz", "192000", "HIRES_LOSSLESS"
  const detail = parseQualityDetail(trackQuality);
  if (detail) {
    parts.push(detail);
  } else if (q.codec === 'FLAC') {
    // Estimate from bitrate
    if (q.bitrateKbps !== undefined) {
      if (q.bitrateKbps > 2500) {
        parts.push('24-bit / 96 kHz');
      } else if (q.bitrateKbps > 1500) {
        parts.push('24-bit / 48 kHz');
      } else if (q.bitrateKbps > 400) {
        parts.push('16-bit / 44.1 kHz');
      }
    }
  }

  // Append bitrate
  if (q.bitrateKbps !== undefined) {
    parts.push(`${q.bitrateKbps} kbps`);
  }

  if (parts.length === 0) return q.codec;
  return `${q.codec} • ${parts.join(' • ')}`;
}

/** Parse human-readable quality detail from addon or catalog quality strings. */
function parseQualityDetail(raw?: string): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // "24-bit / 96 kHz", "24bit 96kHz", "96kHz/24bit"
  const combo = s.match(/(\d+)\s*[-\/]?\s*bit.*?(\d+)\s*k?Hz/i) || s.match(/(\d+)\s*k?Hz.*?(\d+)\s*bit/i);
  if (combo) {
    const bits = combo[1];
    const hz = combo[2].replace(/k/i, '');
    return `${bits}-bit / ${hz} kHz`;
  }

  // "192 kHz" or "192000"
  const sr = s.match(/(\d{4,6})\s*k?Hz/i);
  if (sr) {
    const hz = parseInt(sr[1], 10);
    return `${hz >= 1000 ? Math.round(hz / 1000) : hz} kHz`;
  }

  // "24 bit" or "24bit"
  const bit = s.match(/(\d+)\s*bit/i);
  if (bit) {
    return `${bit[1]}-bit`;
  }

  return null;
}
