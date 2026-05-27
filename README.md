<div align="center">

# BeatBoss Player

<p align="center">
  <strong>A minimalist, high-fidelity music player with a modular addon system.</strong>
</p>

<p align="center">
  <a href="https://alistbox.qzz.io">Website</a> -
  <a href="#features">Features</a> -
  <a href="#usage">Usage</a> -
  <a href="#installation">Installation</a> -
  <a href="#addon-system">Addons</a>
</p>

<p align="center">
  <a href="https://github.com/gramnaters/Musik/stargazers">
    <img src="https://img.shields.io/github/stars/gramnaters/Musik?style=for-the-badge&color=ffffff&labelColor=000000" alt="GitHub stars">
  </a>
  <a href="https://github.com/gramnaters/Musik/forks">
    <img src="https://img.shields.io/github/forks/gramnaters/Musik?style=for-the-badge&color=ffffff&labelColor=000000" alt="GitHub forks">
  </a>
  <a href="https://github.com/gramnaters/Musik/issues">
    <img src="https://img.shields.io/github/issues/gramnaters/Musik?style=for-the-badge&color=ffffff&labelColor=000000" alt="GitHub issues">
  </a>
</p>

</div>

---

## What is BeatBoss Player?

**BeatBoss Player** is a privacy-focused, feature-rich music player built with Next.js. It combines a clean, minimalist interface with a powerful modular addon system that lets you bring your own music sources — Tidal, Qobuz, Deezer, or custom providers — through Eclipse HTTP addons or 8SPINE modules.

## Features

### Audio Player

- **High Fidelity:** Quality badge inference (ATMOS, HD/Hi-Res Lossless, HiFi/Lossless, High, Low)
- **3-Band Equalizer:** Low/mid/high Web Audio biquad filters with 8+ presets (Flat, Bass Boost, Treble Boost, Vocal Boost, Electronic, Classical, Rock, Pop)
- **Immersive Visuals:** Dynamic album art color extraction for player backgrounds
- **Seekbar Styles:** Classic, Wave, Minimalist, iOS, Neon
- **Queue Management:** Drag-and-drop reordering, shuffle, repeat modes
- **Volume Control:** Persistent volume level with mute/unmute
- **Keyboard Shortcuts:** Full playback control via keyboard

### Multi-Provider Search

- **Catalog Providers:** Apple Music, Spotify, Tidal, Monochrome
- **Addon Search:** Results merged seamlessly with catalog results
- **Search Bundle:** One-round-trip combined search for tracks, albums, artists, and playlists
- **Genre & Mood Browsing:** 20+ genre rails and curated mood mixes
- **Catalog Rails:** Viral Hits, Throwbacks, Rising, Fresh Finds, Top Charts, Hidden Gems, and more

### Home Feed

- Quick Picks, Recently Played, Recommended Artists
- Genre-based and mood-based discovery rails
- Addon-powered home feed with fallback search chains
- Cached home feed (10-minute TTL)

### Library

- **Playlists:** Create, delete, rename, import (Spotify), drag-and-drop reorder
- **Favourites:** Save tracks with heart toggle
- **Recently Played:** Automatic tracking with ISRC-based dedup
- **Library Search:** Search within your library

### Themes

- **Player Themes:** Spotify, Apple Music, and Tidal aesthetics
- **Dark Mode:** Default dark theme via shadcn/ui
- **Dynamic Backgrounds:** Album art color palette extraction

### Scrobbling

- **Last.fm:** Enable, username, session key, scrobble percentage, love on like
- **ListenBrainz:** Enable, token
- **Maloja:** Enable, URL, API key

### Downloads & Offline

- Bulk download methods: browser, zip, server
- Auto-download liked tracks
- Embed lyrics and cover art
- Custom filename and folder templates
- Cover art size configuration

### Lyrics

- Multi-strategy lookup via LRCLib
- Synced and unsynced lyrics support
- Romaji conversion for Japanese text
- Download lyrics with tracks

---

## Addon System

BeatBoss supports three types of addons, giving you complete control over your music sources.

### 1. Eclipse HTTP Addons

Standard HTTP server addons following the [Eclipse Music Addon spec](https://eclipsemusic.app/docs). Your addon serves JSON endpoints:

| Endpoint | Required | Purpose |
|---|---|---|
| `GET /manifest.json` | Yes | Describes your addon (id, name, version, resources) |
| `GET /search?q={query}` | Yes | Returns tracks, albums, artists, playlists |
| `GET /stream/{id}` | Yes | Returns a playable stream URL |
| `GET /album/{id}` | No | Returns album tracks for browsing |
| `GET /artist/{id}` | No | Returns artist top tracks + albums |
| `GET /playlist/{id}` | No | Returns playlist tracks |

Install by pasting your addon's URL (e.g. `https://my-addon.com/`) into Connections.

### 2. 8SPINE Modules

JavaScript modules that run server-side following the [8SPINE Module Engine](https://8spine-modules.vercel.app/documentation) contract. Modules export:

```js
return {
  id: 'my-source',
  name: 'My Source',
  version: '1.0.0',
  searchTracks: (query, limit) => Promise<{ tracks: Track[], total }>,
  getTrackStreamUrl: (id, quality) => Promise<{ streamUrl, track }>,
  getAlbum: (id) => Promise<{ album, tracks }>,        // Optional
  getArtist: (id) => Promise<{ artist, tracks }>,        // Optional
};
```

Install via `.8spine` package URLs or registry browsing.

### 3. Monochrome Streaming Instances

Pre-configured streaming instances supporting Tidal, Qobuz, and Deezer. Configure tokens in Connections for high-quality streaming.

### Addon Store

Browse and install community addons from the built-in addon store. Default registry: `https://eclipsemusic.app/addonstore/registry.json`

---

## Quick Start

### Live Instance

**[alistbox.qzz.io](https://alistbox.qzz.io)**

### Local Development

#### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Bun](https://bun.sh/) (optional, faster)

#### Setup

```bash
git clone https://github.com/gramnaters/Musik.git
cd Musik
npm install
cp .env.example .env.local  # Add your API keys
npm run dev
```

Open `http://localhost:3000`.

#### Environment Variables

| Variable | Purpose |
|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify search & playlist import |
| `SPOTIFY_CLIENT_SECRET` | Spotify OAuth |
| `TIDAL_CLIENT_ID` | Tidal API (has defaults) |
| `TIDAL_CLIENT_SECRET` | Tidal API (has defaults) |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:reset` | Reset database |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `Ctrl/Cmd + Right` | Next track |
| `Ctrl/Cmd + Left` | Previous track |
| `Ctrl/Cmd + S` | Toggle shuffle |
| `Ctrl/Cmd + R` | Toggle repeat |
| `Ctrl/Cmd + Up` | Volume up |
| `Ctrl/Cmd + Down` | Volume down |
| `Ctrl/Cmd + F` | Focus search |
| `Ctrl/Cmd + L` | Focus library |
| `Ctrl/Cmd + H` | Go home |
| `Ctrl/Cmd + ,` | Open settings |
| `Esc` | Close modals |

---

## API Routes

| Route | Description |
|---|---|
| `GET /api/stream` | Stream proxy with Range header support |
| `GET /api/cover` | Album cover proxy |
| `GET /api/hot` | Top charts (Apple RSS + Spotify) |
| `GET /api/metadata/search` | Multi-provider catalog search |
| `GET /api/metadata/search-bundle` | Combined tracks + albums + artists + playlists |
| `GET /api/metadata/playlist-items` | Playlist track listing |
| `GET /api/lyrics` | Lyrics lookup via LRCLib |
| `GET /api/explore/genre` | Genre-based discovery |
| `POST /api/import/spotify-playlist` | Import Spotify playlists |
| `GET /api/addons/store` | Addon registry |
| `POST /api/addons/eightspine-install` | 8SPINE package installer |
| `POST /api/addons/eclipse-setup` | Eclipse addon setup |
| `GET/POST /api/addons/proxy` | CORS proxy for addons |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **State:** Zustand (persisted)
- **Database:** Prisma (SQLite / PostgreSQL)
- **Build:** Turbopack
- **Audio:** Web Audio API (HTML5 `<audio>` + EQ)

---

## Contributing

Contributions welcome — bug fixes, new themes, addon integrations, or feature requests. Open an issue or submit a pull request.

---

<div align="center">

**If you enjoy the experience, please consider giving it a ⭐ Star.**

**Made with 💜 for music lovers**

</div>
