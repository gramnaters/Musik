/**
 * Build ordered manifest.json URLs to try (fixes 404 when registry uses
 * manifest.json?… or when only a base setupUrl is provided).
 */
export function manifestUrlCandidates(input: string): string[] {
  const raw = input.trim();
  const out: string[] = [];

  const push = (u: string) => {
    const t = u.trim();
    if (t && !out.includes(t)) out.push(t);
  };

  try {
    const u = new URL(raw);
    const path = u.pathname;
    if (/manifest\.json$/i.test(path)) {
      push(u.toString());
      const clone = new URL(u.toString());
      clone.pathname = path.replace(/\/?manifest\.json$/i, '') || '/';
      clone.search = '';
      clone.hash = '';
      const dir = clone.toString().replace(/\/+$/, '');
      push(`${dir}/manifest.json`);
    } else {
      const base = raw.replace(/\/+$/, '');
      push(`${base}/manifest.json`);
    }
  } catch {
    if (/manifest\.json/i.test(raw)) push(raw);
    push(`${raw.replace(/\/+$/, '')}/manifest.json`);
  }

  return out;
}

export function baseUrlFromSuccessfulManifestUrl(manifestUrl: string): string {
  const u = new URL(manifestUrl);
  u.pathname = u.pathname.replace(/\/manifest\.json$/i, '') || '/';
  u.search = '';
  u.hash = '';
  const s = u.toString().replace(/\/+$/, '');
  return s || u.origin;
}

export function isEightspinePackageUrl(url: string): boolean {
  return /\.(8spine|js)($|[?#])/i.test(url.trim());
}
