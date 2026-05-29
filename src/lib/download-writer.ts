export interface WriterEntry {
  name: string;
  lastModified: Date;
  input: Blob | string;
}

export interface IBulkDownloadWriter {
  write(files: AsyncIterable<WriterEntry>): Promise<void>;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export class SequentialFileWriter implements IBulkDownloadWriter {
  async write(files: AsyncIterable<WriterEntry>): Promise<void> {
    for await (const entry of files) {
      if (/\.(m3u|m3u8|cue|nfo|json|jpg|png)$/i.test(entry.name)) continue;
      if (entry.input instanceof Blob) {
        triggerDownload(entry.input, entry.name);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
}

export class ZipBlobWriter implements IBulkDownloadWriter {
  async write(files: AsyncIterable<WriterEntry>): Promise<void> {
    const { downloadZip } = await import('client-zip');
    const entries: { name: string; input: Blob; lastModified: Date }[] = [];
    for await (const entry of files) {
      if (entry.input instanceof Blob) {
        entries.push({ name: entry.name, input: entry.input, lastModified: entry.lastModified });
      }
    }
    const blob = await downloadZip(entries).blob();
    triggerDownload(blob, 'download.zip');
  }
}

export async function createBulkWriter(method: string, folderName: string): Promise<IBulkDownloadWriter> {
  if (method === 'folder') {
    try {
      const handle = await (window as any).showDirectoryPicker?.();
      if (handle) return new FolderPickerWriter(handle, folderName);
    } catch {}
    return new SequentialFileWriter();
  }
  if (method === 'zip') return new ZipBlobWriter();
  return new SequentialFileWriter();
}

class FolderPickerWriter implements IBulkDownloadWriter {
  private root: FileSystemDirectoryHandle;
  private folderName: string;

  constructor(root: FileSystemDirectoryHandle, folderName: string) {
    this.root = root;
    this.folderName = folderName;
  }

  async write(files: AsyncIterable<WriterEntry>): Promise<void> {
    let dir = this.root;
    if (this.folderName) {
      dir = await dir.getDirectoryHandle(this.folderName, { create: true });
    }
    for await (const entry of files) {
      const parts = entry.name.replace(/\\/g, '/').split('/');
      const fileName = parts.pop()!;
      let current = dir;
      for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create: true });
      }
      const fileHandle = await current.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      if (entry.input instanceof Blob) {
        await writable.write(entry.input);
      } else {
        await writable.write(entry.input);
      }
      await writable.close();
    }
  }
}

interface BuildFilenameOpts {
  trackNumber?: number;
  discNumber?: number;
  title: string;
  artist: string;
  album?: string;
  quality?: string;
  ext: string;
  template?: string;
}

export function buildTrackFilename(opts: BuildFilenameOpts): string {
  const tpl = opts.template || '{artist} - {title}';
  const safeTitle = opts.title.replace(/[<>:"/\\|?*]/g, '').trim();
  const safeArtist = opts.artist.replace(/[<>:"/\\|?*]/g, '').trim();
  const safeAlbum = (opts.album || '').replace(/[<>:"/\\|?*]/g, '').trim();
  const trackNum = opts.trackNumber != null ? String(opts.trackNumber).padStart(2, '0') : '';
  const discNum = opts.discNumber != null ? String(opts.discNumber) : '';
  const qual = opts.quality || '';

  let name = tpl
    .replace(/\{title\}/g, safeTitle)
    .replace(/\{artist\}/g, safeArtist)
    .replace(/\{album\}/g, safeAlbum)
    .replace(/\{trackNumber\}/g, trackNum)
    .replace(/\{track\}/g, trackNum)
    .replace(/\{discNumber\}/g, discNum)
    .replace(/\{disc\}/g, discNum)
    .replace(/\{quality\}/g, qual)
    .replace(/\{ext\}/g, opts.ext)
    .replace(/[<>:"/\\|?*]/g, '')
    .trim();

  if (!name) name = `${safeArtist} - ${safeTitle}`;
  return `${name}.${opts.ext}`;
}

export function buildAlbumFolder(opts: { artist: string; album: string; template?: string }): string {
  const tpl = opts.template || '{artist}/{album}';
  return tpl
    .replace(/\{artist\}/g, opts.artist.replace(/[<>:"/\\|?*]/g, '').trim())
    .replace(/\{album\}/g, opts.album.replace(/[<>:"/\\|?*]/g, '').trim())
    .replace(/[<>:"/\\|?*]/g, '')
    .trim();
}
