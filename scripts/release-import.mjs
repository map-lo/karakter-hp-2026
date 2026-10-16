import { z } from 'zod';

const SINGLE_SUFFIX = /\s[-–—]?\s*Single$/i;
const EP_SUFFIX = /\s[-–—]?\s*EP$/i;
const EDITION_QUALIFIER =
  /\s*[([](?:[^)\]]*\b(?:deluxe|remaster(?:ed)?|expanded|anniversary|bonus track|special edition|reissue|version)\b[^)\]]*)[)\]]\s*/gi;
const responseSchema = z.object({
  results: z.array(z.looseObject({
    wrapperType: z.string()
  }))
});
const collectionSchema = z.object({
  collectionId: z.number().int().positive(),
  artistId: z.number().int().positive(),
  collectionName: z.string().min(1),
  trackCount: z.number().int().nonnegative().optional(),
  releaseDate: z.string().min(10),
  artworkUrl100: z.url(),
  collectionViewUrl: z.url().optional(),
  copyright: z.string().optional()
});

export function kindOf(name, trackCount) {
  if (SINGLE_SUFFIX.test(name)) return 'single';
  if (EP_SUFFIX.test(name)) return 'ep';
  return trackCount && trackCount <= 3 ? 'single' : 'album';
}

export function cleanTitle(name) {
  return name.replace(SINGLE_SUFFIX, '').replace(EP_SUFFIX, '')
    .replace(EDITION_QUALIFIER, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function dedupeKey(artistId, title) {
  return `${artistId}::${title.replace(EDITION_QUALIFIER, ' ').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()}`;
}

export function labelFrom(copyright) {
  if (!copyright) return null;
  return copyright.replace(/^[℗©\s]*/, '').replace(/^\d{4}\s*/, '')
    .split(/\s+-\s+a division of/i)[0].trim() || null;
}

export function normalizeAlbums(input, artist) {
  const data = responseSchema.parse(input);
  const albums = data.results
    .filter((entry) => entry.wrapperType === 'collection' && entry.artistId === artist.itunesArtistId)
    .map((entry) => collectionSchema.parse(entry))
    .map((entry) => ({
      id: `itunes-${entry.collectionId}`,
      artistId: artist.id,
      title: cleanTitle(entry.collectionName),
      kind: kindOf(entry.collectionName, entry.trackCount),
      releaseDate: entry.releaseDate.slice(0, 10),
      label: labelFrom(entry.copyright),
      artwork: entry.artworkUrl100.replace(/\d+x\d+bb\.jpg$/, '600x600bb.jpg'),
      url: entry.collectionViewUrl ?? null
    }))
    .filter((release) => release.kind === 'album');
  const records = new Map();
  for (const release of albums) {
    const key = dedupeKey(artist.id, release.title);
    const existing = records.get(key);
    if (!existing || release.releaseDate < existing.releaseDate ||
        (release.releaseDate === existing.releaseDate && release.id < existing.id)) {
      records.set(key, release);
    }
  }
  return [...records.values()];
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function assertNoUnexpectedRemovals(previous, next, allowRemovals) {
  const nextIds = new Set(next.releases.map((release) => release.id));
  const removed = previous.releases.filter((release) => !nextIds.has(release.id));
  if (removed.length && !allowRemovals) {
    throw new Error(
      `Import would remove ${removed.length} cached releases:\n` +
      removed.map((release) => `  ${release.id}: ${release.title}`).join('\n') +
      '\nReview source/roster changes, then rerun with --allow-removals if intentional. Cache unchanged.'
    );
  }
}

export async function getJson(url, fetcher = fetch, wait = sleep) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetcher(url, { headers: { 'User-Agent': 'karakter-homepage/1.0' } });
    if ((response.status === 403 || response.status === 429) && attempt < 4) {
      await wait(attempt * 3000);
      continue;
    }
    if (!response.ok) throw new Error(`iTunes request failed: ${response.status} ${response.statusText} (${url})`);
    return response.json();
  }
  throw new Error(`iTunes retry limit reached: ${url}`);
}

export async function importReleases(artists, get = getJson, wait = sleep) {
  const releases = [];
  for (const artist of artists) {
    if (!artist.itunesArtistId) {
      console.log(`${artist.name}: no iTunes source configured; skipped intentionally.`);
      continue;
    }
    const query = new URLSearchParams({
      id: String(artist.itunesArtistId), entity: 'album', limit: '200', sort: 'recent'
    });
    const data = await get(`https://itunes.apple.com/lookup?${query}`);
    if (data.results?.length >= 200) {
      throw new Error(`${artist.name}: iTunes lookup may be truncated; review before updating the cache.`);
    }
    const albums = normalizeAlbums(data, artist);
    if (!albums.length) throw new Error(`${artist.name}: no albums returned; existing cache has not been replaced.`);
    releases.push(...albums);
    console.log(`${artist.name}: ${albums.length} albums`);
    await wait(800);
  }
  return {
    source: 'iTunes Search API',
    fetchedAt: new Date().toISOString().slice(0, 10),
    releases: releases.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.id.localeCompare(b.id))
  };
}
