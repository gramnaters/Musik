import type { AddonSearchResults, AddonTrack } from '@/types/addon';
import type { Track } from '@/types/music';

function normTitle(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * When a row has no `streamURL`, search installed modules in order and resolve the first playable stream.
 */
export async function resolvePlayableUrlViaAddonChain(
  track: Track,
  orderedAddonIds: string[],
  searchWithAddon: (addonId: string, query: string) => Promise<AddonSearchResults>,
  resolveStreamUrl: (t: AddonTrack) => Promise<string>
): Promise<string | undefined> {
  if (track.addonId && track.addonTrackId) return undefined;
  if (orderedAddonIds.length === 0) return undefined;

  const q = `${track.title} ${track.artist}`.trim() || track.title;
  const want = normTitle(track.title);
  const queries = Array.from(
    new Set(
      [
        q,
        `${track.artist} ${track.title}`.trim(),
        track.title.trim(),
        `${track.title} ${track.artist}`.trim(),
      ].filter(Boolean)
    )
  );

  for (const addonId of orderedAddonIds) {
    for (const searchQ of queries) {
      try {
        const res = await searchWithAddon(addonId, searchQ);
        const addonTracks = res.tracks || [];
        const match =
          addonTracks.find((t) => normTitle(t.title) === want) ||
          addonTracks.find((t) => {
            const tt = normTitle(t.title);
            return tt.includes(want) || want.includes(tt);
          }) ||
          addonTracks[0];
        if (!match?.id) continue;
        const proxied = await resolveStreamUrl(match);
        const m = proxied.match(/^\/api\/stream\?url=(.+)$/);
        if (m) {
          try {
            return decodeURIComponent(m[1]);
          } catch {
            return m[1];
          }
        }
      } catch {
        /* try next query / addon */
      }
    }
  }
  return undefined;
}
