const AMP_API = 'https://amp-api.music.apple.com/v1/catalog';

interface CachedToken {
  value: string;
  expiresAt: number;
}

let tokenCache: CachedToken | null = null;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return decoded;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return Date.now() / 1000 > payload.exp;
}

async function scrapeWebPlayKitToken(): Promise<string | null> {
  const html = await fetch('https://music.apple.com/us/browse', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' },
  });
  if (!html.ok) return null;
  const text = await html.text();

  const jsMatch = text.match(/crossorigin src="(\/assets\/index.+?\.js)"/);
  if (!jsMatch) return null;

  const js = await fetch(`https://music.apple.com${jsMatch[1]}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' },
  });
  if (!js.ok) return null;
  const jsText = await js.text();

  const jwtMatch = jsText.match(/(eyJhbGc[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+)/);
  return jwtMatch ? jwtMatch[1] : null;
}

async function getValidToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  const token = await scrapeWebPlayKitToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp * 1000 : Date.now() + 3600000;

  tokenCache = { value: token, expiresAt: exp - 60000 };
  return token;
}

async function ampFetch(endpoint: string): Promise<Response> {
  const token = await getValidToken();
  if (!token) return new Response(null, { status: 401 });

  const res = await fetch(`${AMP_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'https://music.apple.com',
    },
  });

  if (res.status === 401) {
    tokenCache = null;
    const newToken = await getValidToken();
    if (!newToken) return new Response(null, { status: 401 });
    return fetch(`${AMP_API}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${newToken}`,
        Origin: 'https://music.apple.com',
      },
    });
  }

  return res;
}

interface EditorialVideo {
  motionDetailSquare?: { video: string };
  motionDetailTall?: { video: string };
  motionSquareVideo1x1?: { video: string };
  motionArtistSquare1x1?: { video: string };
  motionArtistFullscreen16x9?: { video: string };
}

export interface AnimatedArtwork {
  albumId: string;
  albumName: string;
  artistName: string;
  videos: { key: string; url: string }[];
}

export async function getAlbumAnimatedArtwork(albumId: string, country = 'us'): Promise<AnimatedArtwork | null> {
  const res = await ampFetch(`/${country}/albums/${albumId}?extend=editorialVideo`);
  if (!res.ok) return null;
  const data: Record<string, unknown> = await res.json();
  const items = data.data as Array<Record<string, unknown>> | undefined;
  if (!items?.length) return null;

  const attrs = items[0].attributes as Record<string, unknown> | undefined;
  if (!attrs) return null;

  const ev = attrs.editorialVideo as EditorialVideo | undefined;
  if (!ev) return null;

  const videos: { key: string; url: string }[] = [];
  for (const [key, val] of Object.entries(ev)) {
    if (val?.video) {
      videos.push({ key, url: val.video });
    }
  }

  if (!videos.length) return null;

  return {
    albumId,
    albumName: attrs.name as string,
    artistName: attrs.artistName as string,
    videos,
  };
}

export async function resolveAppleAlbumByIsrc(isrc: string, country = 'us'): Promise<string | null> {
  const res = await ampFetch(`/${country}/songs?filter[isrc]=${encodeURIComponent(isrc)}&include=albums`);
  if (!res.ok) return null;
  const data: Record<string, unknown> = await res.json();
  const items = data.data as Array<Record<string, unknown>> | undefined;
  if (!items?.length) return null;
  const rels = items[0].relationships as Record<string, unknown> | undefined;
  if (!rels) return null;
  const album = rels.albums as Record<string, unknown> | undefined;
  const albumData = album?.data as Array<Record<string, unknown>> | undefined;
  return albumData?.[0]?.id ? String(albumData[0].id) : null;
}

export async function getArtistAnimatedArtwork(artistId: string, country = 'us'): Promise<AnimatedArtwork | null> {
  const res = await ampFetch(`/${country}/artists/${artistId}?extend=editorialVideo`);
  if (!res.ok) return null;
  const data: Record<string, unknown> = await res.json();
  const items = data.data as Array<Record<string, unknown>> | undefined;
  if (!items?.length) return null;

  const attrs = items[0].attributes as Record<string, unknown> | undefined;
  if (!attrs) return null;

  const ev = attrs.editorialVideo as EditorialVideo | undefined;
  if (!ev) return null;

  const videos: { key: string; url: string }[] = [];
  for (const [key, val] of Object.entries(ev)) {
    if (val?.video) {
      videos.push({ key, url: val.video });
    }
  }

  if (!videos.length) return null;

  return {
    albumId: artistId,
    albumName: attrs.name as string,
    artistName: attrs.name as string,
    videos,
  };
}
