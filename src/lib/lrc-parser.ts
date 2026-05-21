export interface LrcLine {
  time: number;
  text: string;
}

export function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  const re = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(lrc)) !== null) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    let ms = 0;
    if (match[3]) {
      const raw = match[3];
      ms = raw.length === 2 ? parseInt(raw, 10) * 10 : parseInt(raw, 10);
    }
    const time = mins * 60 + secs + ms / 1000;
    const text = match[4]?.trim() ?? '';
    if (text) lines.push({ time, text });
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}
