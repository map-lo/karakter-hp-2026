// Pulls the roster's album releases from the public iTunes Search API into
// src/data/releases.json. No API key required.
//
//   npm run releases
//
// Every album is kept. Singles and EPs are excluded, and later editions of a
// record (deluxe, remaster, reissue) collapse into the original pressing.
//
// Artist IDs are pinned because names like "Mine" and "LOTTE" are ambiguous.
// Each ID below was verified against the artist's real catalogue.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const outFile = path.join(root, 'src/data/releases.json');

// iTunes caps lookup results at 200, which is far above any roster catalogue.
const LOOKUP_LIMIT = 200;
const ARTWORK_SIZE = '600x600bb';

const artistIds = {
  'Get Well Soon': 259369584,
  'Anaïs Mitchell': 79166513,
  'Wallis Bird': 151288818,
  Hundreds: 355169873,
  'Inner Tongue': 978465089,
  Mine: 1027177254,
  LOTTE: 1213801726
  // Marcus Wuest has no iTunes artist page; he is a producer and composer.
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, attempt = 1) {
  const response = await fetch(url, { headers: { 'User-Agent': 'karakter-homepage/1.0' } });

  if (response.status === 403 || response.status === 429) {
    if (attempt > 3) throw new Error(`rate limited`);
    await sleep(attempt * 3000);
    return getJson(url, attempt + 1);
  }

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

// iTunes types EPs and singles as "albums", so the suffix is the real signal.
// Note "Country EP" carries no dash, hence the optional separator.
const SINGLE_SUFFIX = /\s[-–—]?\s*Single$/i;
const EP_SUFFIX = /\s[-–—]?\s*EP$/i;

function kindOf(name, trackCount) {
  if (SINGLE_SUFFIX.test(name)) return 'single';
  if (EP_SUFFIX.test(name)) return 'ep';
  return trackCount && trackCount <= 3 ? 'single' : 'album';
}

function cleanTitle(name) {
  return name
    .replace(SINGLE_SUFFIX, '')
    .replace(EP_SUFFIX, '')
    .replace(EDITION_QUALIFIER, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Only edition qualifiers are stripped. Parentheticals that name a distinct
// record, such as "Hadestown (Original Broadway Cast Recording)", must stay so
// they do not collapse into the studio album of the same name.
const EDITION_QUALIFIER =
  /\s*[([](?:[^)\]]*\b(?:deluxe|remaster(?:ed)?|expanded|anniversary|bonus track|special edition|reissue|version)\b[^)\]]*)[)\]]\s*/gi;

/** Groups re-releases of one record, e.g. "X (Deluxe)" and "X: Live" vs "X Live". */
function dedupeKey(artist, title) {
  const normalized = title
    .replace(EDITION_QUALIFIER, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return `${artist.toLowerCase()}::${normalized}`;
}

// "℗ 2026 Scarlet Beast Records" -> "Scarlet Beast Records"
function labelFrom(copyright) {
  if (!copyright) return null;
  const label = copyright
    .replace(/^[℗©\s]*/, '')
    .replace(/^\d{4}\s*/, '')
    .split(/\s+-\s+a division of/i)[0]
    .trim();
  return label || null;
}

const releases = [];
const skipped = [];

for (const [artist, id] of Object.entries(artistIds)) {
  const query = new URLSearchParams({
    id: String(id),
    entity: 'album',
    limit: String(LOOKUP_LIMIT),
    sort: 'recent'
  });

  let data;
  try {
    data = await getJson(`https://itunes.apple.com/lookup?${query}`);
  } catch (error) {
    skipped.push(`${artist}: ${error.message}`);
    continue;
  }

  const collections = data.results.filter(
    (entry) =>
      entry.wrapperType === 'collection' && entry.artistId === id && entry.artworkUrl100
  );

  // Albums only. Every album is kept; the grid is the full discography.
  const albums = collections
    .map((entry) => ({
      artist,
      title: cleanTitle(entry.collectionName),
      kind: kindOf(entry.collectionName, entry.trackCount),
      releaseDate: (entry.releaseDate ?? '').slice(0, 10),
      label: labelFrom(entry.copyright),
      artwork: entry.artworkUrl100.replace(/\d+x\d+bb\.jpg$/, `${ARTWORK_SIZE}.jpg`),
      url: entry.collectionViewUrl ?? null
    }))
    .filter((release) => release.kind === 'album');

  // Keep the original pressing when a record also exists as a later edition.
  const byRecord = new Map();
  for (const release of albums) {
    const key = dedupeKey(release.artist, release.title);
    const existing = byRecord.get(key);
    if (!existing || release.releaseDate < existing.releaseDate) byRecord.set(key, release);
  }

  const found = [...byRecord.values()].sort((a, b) =>
    b.releaseDate.localeCompare(a.releaseDate)
  );

  if (found.length === 0) skipped.push(`${artist}: no albums returned`);
  releases.push(...found);
  const merged = albums.length - found.length;
  console.log(
    `${artist}: ${found.length} albums` +
      ` (of ${collections.length} releases${merged > 0 ? `, ${merged} editions merged` : ''})`
  );
  await sleep(800);
}

releases.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  `${JSON.stringify(
    {
      source: 'iTunes Search API',
      fetchedAt: new Date().toISOString().slice(0, 10),
      releases
    },
    null,
    2
  )}\n`
);

const roster = JSON.parse(readFileSync(path.join(root, 'karakter-content.json'), 'utf8')).artists;
for (const { name } of roster) {
  if (!(name in artistIds)) skipped.push(`${name}: no artist id pinned`);
}

console.log(`\nWrote ${releases.length} releases to ${path.relative(root, outFile)}`);
if (skipped.length > 0) console.log(`Not included:\n  ${skipped.join('\n  ')}`);
