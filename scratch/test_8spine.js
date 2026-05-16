const AsyncFunctionConstructor = Object.getPrototypeOf(async function () {}).constructor;

const ASYNC_STORAGE_SHIM = `
var AsyncStorage = {
  getItem: async function(k) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(String(k));
  },
  setItem: async function(k, v) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(String(k), String(v));
  },
  removeItem: async function(k) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(String(k));
  },
};
`;

const REQUIRE_SHIM = `
function require(id) {
  var s = String(id);
  if (s === 'crypto' || s === 'node:crypto') {
    return {
      createHash: function() {
        return {
          update: function() { return { digest: function() { throw new Error('crypto native'); } }; },
        };
      },
    };
  }
  throw new Error('require not available: ' + s);
}
`;

// Simulated Dreezer module content (inner)
const DREEZER_INNER = `
(function() {
    const DEEZER_URL = 'https://deezer-api-workers.anothermoumen4.workers.dev';

    function fetchJson(endpoint) {
        return fetch(DEEZER_URL + endpoint, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Monochrome/1.0',
            }
        })
        .then(function(response) {
            if (response.ok) return response.json();
            throw new Error('HTTP ' + response.status);
        });
    }

    function getDeezerCoverUrl(url, size) {
        if (!url) return null;
        if (!size) size = 500;
        return url.replace(/\/\\d+x\\d+-/, '/' + size + 'x' + size + '-');
    }

    function searchTracks(query, limit) {
        if (!limit) limit = 25;
        return fetchJson('/search/?s=' + encodeURIComponent(query) + '&limit=' + limit)
            .then(function(data) {
                const items = (data.data && data.data.items) ? data.data.items : [];
                return {
                    tracks: items.map(function(track) {
                        return {
                            id: track.id,
                            title: track.title,
                            artist: track.artist ? track.artist.name : 'Unknown Artist',
                            artistId: track.artist ? track.artist.id : null,
                            album: track.album ? track.album.title : 'Unknown Album',
                            albumId: track.album ? track.album.id : null,
                            albumCover: getDeezerCoverUrl(track.album ? track.album.cover : null, 500),
                            duration: track.duration || 0,
                            trackNumber: track.trackNumber,
                        };
                    }),
                    total: (data.data && data.data.totalNumberOfItems) || items.length,
                };
            });
    }

    return {
        id: 'deezer-worker',
        name: 'Dreezer',
        author: 'morgk',
        version: '1.6.0',
        description: 'Deezer music streaming via an experimental Deezer API',
        logo: 'https://e-cdns-files.dzcdn.net/cache/images/common/favicon/favicon-192x192.png',
        searchTracks: searchTracks,
    };
})();
`;

async function test() {
  try {
    console.log('Testing Dreezer bootstrap...');
    const runner = new AsyncFunctionConstructor(DREEZER_INNER);
    const out = await runner();
    console.log('Success!', out.id);
  } catch (e) {
    console.error('FAILED:', e);
  }
}

test();
