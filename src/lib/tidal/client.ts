/**
 * Tidal API Client
 * Ported from Monochrome for high-performance lossless streaming and rich metadata.
 */

export interface TidalConfig {
  clientId: string;
  clientSecret: string;
  countryCode: string;
}

export interface TidalTrack {
  id: number;
  title: string;
  duration: number;
  trackNumber: number;
  volumeNumber: number;
  explicit: boolean;
  audioQuality: string;
  audioModes?: string[];
  artist: { id: number; name: string };
  artists: Array<{ id: number; name: string }>;
  album: { id: number; title: string; cover: string; releaseDate?: string };
}

export interface TidalAlbum {
  id: number;
  title: string;
  cover: string;
  artist: { id: number; name: string };
  artists: Array<{ id: number; name: string }>;
  numberOfTracks?: number;
  releaseDate?: string;
  explicit: boolean;
}

export interface TidalArtist {
  id: number;
  name: string;
  picture: string | null;
}

export interface TidalPlaylist {
  id: string;
  title: string;
  description: string;
  cover: string;
  trackCount: number;
}

export class TidalClient {
  private static instance: TidalClient | null = null;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  private constructor(private config: TidalConfig) {}

  static getInstance(config?: TidalConfig): TidalClient {
    if (!TidalClient.instance && config) {
      TidalClient.instance = new TidalClient(config);
    }
    if (!TidalClient.instance) {
      throw new Error('TidalClient not initialized');
    }
    return TidalClient.instance;
  }

  private async fetchToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const auth = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch Tidal token: ${response.status} ${text}`);
    }

    const data = await response.json();
    this.token = data.access_token;
    // Buffer of 60 seconds
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    return this.token!;
  }

  private async fetchAuthenticated(url: string, params: Record<string, string> = {}): Promise<Response> {
    const token = await this.fetchToken();
    const urlObj = new URL(url);
    
    if (!params.countryCode) {
      params.countryCode = this.config.countryCode;
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(urlObj.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': url.includes('openapi.tidal.com') 
          ? 'application/vnd.api+json, application/json' 
          : 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Tidal API Error (${response.status}): ${error.message || response.statusText}`);
    }

    return response;
  }

  async queryV1(path: string, params: Record<string, string> = {}): Promise<any> {
    const res = await this.fetchAuthenticated(`https://api.tidal.com/v1${path}`, params);
    return res.json();
  }

  async queryV2(path: string, params: Record<string, string> = {}): Promise<any> {
    const res = await this.fetchAuthenticated(`https://openapi.tidal.com/v2${path}`, params);
    return res.json();
  }

  private extractUuid(href?: string | null) {
    if (!href) return null;
    const parts = href.split('/');
    return parts.length >= 9 ? parts.slice(4, 9).join('-') : null;
  }

  async search(query: string, limit = 25): Promise<any> {
    // Combined search using openapi v2
    const data = await this.queryV2(`/searchResults/${encodeURIComponent(query)}`, {
      limit: String(limit),
      include: 'artists,artists.profileArt,albums,albums.coverArt,albums.artists,tracks,tracks.artists,tracks.albums,tracks.albums.coverArt,playlists,playlists.coverArt'
    });

    return this.normalizeV2Search(data, limit);
  }

  private normalizeV2Search(json: any, limit: number) {
    if (!json || !json.data) return {};

    const includedMap = new Map<string, any>();
    if (Array.isArray(json.included)) {
      json.included.forEach((item: any) => {
        includedMap.set(`${item.type}:${item.id}`, item);
      });
    }

    const resolveArtworkId = (item: any, relName: string) => {
      const ref = item?.relationships?.[relName]?.data?.[0];
      if (!ref) return null;
      const artwork = includedMap.get(`artworks:${ref.id}`);
      const href = artwork?.attributes?.files?.[0]?.href;
      return href ? this.extractUuid(href) : null;
    };

    const resolveArtists = (item: any) => {
      const refs = item?.relationships?.artists?.data;
      if (!Array.isArray(refs)) return [];
      return refs.map((art: any) => {
        const aItem = includedMap.get(`artists:${art.id}`);
        return {
          id: Number(art.id),
          name: aItem?.attributes?.name ?? '',
        };
      });
    };

    const resolveItem = (ref: { id: string; type: string }) => {
      const item = includedMap.get(`${ref.type}:${ref.id}`);
      if (!item) return null;

      const attrs = item.attributes || {};
      const mapped: any = {
        id: Number(item.id) || item.id,
        ...attrs,
      };

      if (item.type === 'artists') {
        mapped.type = 'artist';
        mapped.name = attrs.name ?? '';
        mapped.picture = resolveArtworkId(item, 'profileArt');
      } else if (item.type === 'albums') {
        const artists = resolveArtists(item);
        mapped.type = 'album';
        mapped.title = attrs.title ?? '';
        mapped.cover = resolveArtworkId(item, 'coverArt');
        mapped.artists = artists;
        if (artists.length > 0) mapped.artist = artists[0];
      } else if (item.type === 'tracks') {
        const artists = resolveArtists(item);
        mapped.type = 'track';
        mapped.title = attrs.title ?? '';
        mapped.artists = artists;
        if (artists.length > 0) mapped.artist = artists[0];
        const albumRef = item.relationships?.albums?.data?.[0];
        if (albumRef) {
          const albumItem = includedMap.get(`albums:${albumRef.id}`);
          mapped.album = {
            id: Number(albumRef.id),
            title: albumItem?.attributes?.title ?? '',
            cover: albumItem ? resolveArtworkId(albumItem, 'coverArt') : null,
          };
        }
      } else if (item.type === 'playlists') {
        mapped.type = 'playlist';
        mapped.title = attrs.name ?? '';
        mapped.cover = resolveArtworkId(item, 'coverArt');
      }

      return mapped;
    };

    const relationships = json.data.relationships || {};
    const mapBucket = (relName: string) => {
      const relData = relationships[relName]?.data;
      if (!Array.isArray(relData)) return { items: [], totalNumberOfItems: 0, limit, offset: 0 };
      const items = relData.map(resolveItem).filter(Boolean);
      return {
        items,
        totalNumberOfItems: items.length,
        limit,
        offset: 0,
      };
    };

    return {
      artists: mapBucket('artists'),
      albums: mapBucket('albums'),
      tracks: mapBucket('tracks'),
      playlists: mapBucket('playlists'),
    };
  }

  async getTrack(id: number): Promise<any> {
    return this.queryV1(`/tracks/${id}`);
  }

  async getPlaybackInfo(id: number, quality = 'LOSSLESS'): Promise<any> {
    return this.queryV1(`/tracks/${id}/playbackinfo`, {
      audioquality: quality,
      playbackmode: 'STREAM',
      assetpresentation: 'FULL',
    });
  }
}

// Global instance helper
export const initTidal = (clientId: string, clientSecret: string) => {
  return TidalClient.getInstance({
    clientId,
    clientSecret,
    countryCode: 'US'
  });
};
