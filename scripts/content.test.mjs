import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from 'yaml';
import { resolveCatalogue, validateArtists, siteSchema } from '../src/lib/content-schema.mjs';
import { loadContent, validateContent, root } from './content.mjs';
import { kindOf, cleanTitle, normalizeAlbums, importReleases, getJson, assertNoUnexpectedRemovals } from './release-import.mjs';

const artist = { id: 'test-artist', name: 'Test Artist', url: 'https://example.com', itunesArtistId: 123 };
const release = {
  id: 'itunes-456', artistId: artist.id, title: 'Original', kind: 'album',
  releaseDate: '2020-01-01', label: 'Label', artwork: 'https://example.com/art.jpg',
  url: 'https://example.com/album'
};
const imported = { source: 'iTunes Search API', fetchedAt: '2026-10-16', releases: [release] };
const editorial = { overrides: [], manual: [] };
const collection = {
  wrapperType: 'collection', collectionId: 456, artistId: 123, collectionName: 'Original',
  trackCount: 10, releaseDate: '2020-01-01T00:00:00Z',
  artworkUrl100: 'https://example.com/100x100bb.jpg', collectionViewUrl: release.url
};

test('all committed content is valid and editorial visibility is respected', () => {
  const content = loadContent();
  const result = validateContent(content);
  assert.equal(result.artists.length, content.artists.length);
  const hidden = new Set(content.editorial.overrides.filter((entry) => entry.hidden).map((entry) => entry.id));
  assert.equal(result.releases.length,
    content.imported.releases.filter((entry) => !hidden.has(entry.id)).length +
    content.editorial.manual.filter((entry) => !entry.hidden).length);
  assert.ok(result.releases.every((entry) => entry.artist && entry.id && entry.artistId));
});

test('editorial overrides survive later imports; blank optional fields preserve source values', () => {
  const edits = { overrides: [{ id: release.id, title: 'Corrected', artwork: '', releaseDate: '' }], manual: [] };
  const updated = { ...imported, releases: [{ ...release, title: 'Changed by iTunes', label: 'New Label' }] };
  const [result] = resolveCatalogue(updated, edits, [artist]);
  assert.equal(result.title, 'Corrected');
  assert.equal(result.artwork, release.artwork);
  assert.equal(result.releaseDate, release.releaseDate);
  assert.equal(result.label, 'New Label');
  assert.equal(updated.releases[0].title, 'Changed by iTunes');
});

test('blank label/link clear those fields without replacing other imported fields', () => {
  const [result] = resolveCatalogue(imported, {
    overrides: [{ id: release.id, label: '', url: '' }], manual: []
  }, [artist]);
  assert.equal(result.label, null);
  assert.equal(result.url, null);
  assert.equal(result.title, release.title);
});

test('hidden imports and manual releases are filtered and manual dates control sorting', () => {
  const result = resolveCatalogue(imported, {
    overrides: [{ id: release.id, hidden: true }],
    manual: [
      { ...release, id: 'manual-newer', releaseDate: '2027-01-01' },
      { ...release, id: 'manual-hidden', hidden: true },
      { ...release, id: 'manual-older', releaseDate: '2010-01-01' }
    ]
  }, [artist]);
  assert.deepEqual(result.map((entry) => entry.id), ['manual-newer', 'manual-older']);
});

test('artist renaming preserves release association by ID', () => {
  const [result] = resolveCatalogue(imported, editorial, [{ ...artist, name: 'Renamed' }]);
  assert.equal(result.artist, 'Renamed');
  assert.equal(result.artistId, artist.id);
});

test('duplicate IDs, orphan overrides and broken artist references fail explicitly', () => {
  assert.throws(() => validateArtists([artist, artist]), /Duplicate artist ID/);
  assert.throws(() => resolveCatalogue({ ...imported, releases: [release, release] }, editorial, [artist]), /Duplicate imported/);
  assert.throws(() => resolveCatalogue(imported, {
    overrides: [{ id: 'itunes-999' }], manual: []
  }, [artist]), /unknown release/);
  assert.throws(() => resolveCatalogue(imported, {
    overrides: [{ id: release.id }, { id: release.id }], manual: []
  }, [artist]), /Duplicate override/);
  assert.throws(() => resolveCatalogue(imported, {
    overrides: [], manual: [{ ...release, id: 'manual-a' }, { ...release, id: 'manual-a' }]
  }, [artist]), /Duplicate manual/);
  assert.throws(() => resolveCatalogue(imported, editorial, [{ ...artist, id: 'other' }]), /unknown artist/);
});

test('invalid dates, unsafe URLs, traversal and bad manual IDs fail validation', () => {
  for (const change of [
    { releaseDate: '2026-02-30' },
    { artwork: 'javascript:alert(1)' },
    { artwork: '/uploads/../secret.jpg' },
    { url: 'javascript:alert(1)' }
  ]) {
    assert.throws(() => resolveCatalogue({ ...imported, releases: [{ ...release, ...change }] }, editorial, [artist]));
  }
  assert.throws(() => resolveCatalogue(imported, {
    overrides: [], manual: [{ ...release, id: 'not-manual' }]
  }, [artist]));
});

test('optional source IDs may be blank, but duplicate source IDs are rejected', () => {
  assert.equal(validateArtists([{ ...artist, itunesArtistId: null }])[0].itunesArtistId, undefined);
  assert.throws(() => validateArtists([artist, { ...artist, id: 'other', name: 'Other' }]), /Duplicate iTunes/);
});

test('missing local artwork is an explicit error', () => {
  const content = loadContent();
  const id = content.imported.releases[0].id;
  content.editorial.overrides = content.editorial.overrides.filter((entry) => entry.id !== id);
  content.editorial.overrides.push({ id, artwork: '/uploads/missing-test-image.jpg' });
  assert.throws(() => validateContent(content), /Missing artwork/);
});

test('album normalization preserves IDs, original editions and distinct cast recordings', () => {
  const results = normalizeAlbums({ results: [
    collection,
    { ...collection, collectionId: 457, collectionName: 'Original (Deluxe)', releaseDate: '2022-01-01T00:00:00Z' },
    { ...collection, collectionId: 458, collectionName: 'Original (Original Broadway Cast Recording)' },
    { ...collection, collectionId: 459, collectionName: 'Song - Single' },
    { ...collection, collectionId: 460, collectionName: 'Country EP' },
    { ...collection, collectionId: 461, artistId: 999 }
  ] }, artist);
  assert.deepEqual(results.map((entry) => entry.id), ['itunes-456', 'itunes-458']);
  assert.equal(results[0].artwork, 'https://example.com/600x600bb.jpg');
  assert.equal(cleanTitle('Record (Remastered)'), 'Record');
  assert.equal(kindOf('Track', 2), 'single');
});

test('invalid matching API records are not silently discarded', () => {
  assert.throws(() => normalizeAlbums({ results: [{ ...collection, collectionId: undefined }] }, artist));
});

test('removals require explicit approval, which does not bypass stale override validation', () => {
  const next = { ...imported, releases: [{ ...release, id: 'itunes-789' }] };
  assert.throws(() => assertNoUnexpectedRemovals(imported, next, false), /itunes-456: Original/);
  assert.doesNotThrow(() => assertNoUnexpectedRemovals(imported, next, true));
  assert.throws(() => resolveCatalogue(next, {
    overrides: [{ id: release.id, hidden: true }], manual: []
  }, [artist]), /unknown release/);
});

test('failed, empty and potentially truncated imports abort rather than return partial success', async () => {
  const other = { ...artist, id: 'second', name: 'Second', itunesArtistId: 999 };
  await assert.rejects(importReleases([artist, other], async (url) => {
    if (url.includes('id=999')) throw new Error('API offline');
    return { results: [collection] };
  }, async () => {}), /API offline/);
  await assert.rejects(importReleases([artist], async () => ({ results: [] }), async () => {}), /no albums/);
  await assert.rejects(importReleases([artist], async () => ({ results: Array(200).fill(collection) }), async () => {}), /truncated/);
});

test('rate limits retry a bounded number of times and exhausted attempts fail', async () => {
  let attempts = 0;
  const result = await getJson('https://example.com', async () => {
    attempts++;
    return attempts < 3
      ? { status: 429, ok: false }
      : { status: 200, ok: true, json: async () => ({ results: [] }) };
  }, async () => {});
  assert.equal(attempts, 3);
  assert.deepEqual(result, { results: [] });
  attempts = 0;
  await assert.rejects(getJson('https://example.com', async () => {
    attempts++;
    return { status: 403, ok: false, statusText: 'Forbidden' };
  }, async () => {}), /403 Forbidden/);
  assert.equal(attempts, 4);
});

test('CMS config covers canonical files and exposes source cache as read-only', () => {
  const config = parse(readFileSync(`${root}/.pages.yml`, 'utf8'));
  const entries = config.content.flatMap((entry) => entry.items ?? [entry]);
  for (const entry of entries) {
    assert.ok(readFileSync(`${root}/${entry.path}`, 'utf8'));
    assert.ok(entry.fields.length);
  }
  assert.ok(entries.find((entry) => entry.name === 'imported').fields.every((field) => field.readonly));
  assert.equal(entries.filter((entry) => entry.format === 'yaml-frontmatter').length, 3);
  assert.deepEqual(
    entries.find((entry) => entry.name === 'site').fields.map((field) => field.name).sort(),
    Object.keys(siteSchema.shape).sort()
  );
});

test('CloudFront directory routing preserves assets and query strings', () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(`${root}/scripts/cloudfront-rewrite.js`, 'utf8'), context);
  for (const [input, expected] of [
    ['/', '/index.html'], ['/about', '/about/index.html'], ['/about/', '/about/index.html'],
    ['/privacy', '/privacy/index.html'], ['/_astro/style.css', '/_astro/style.css'],
    ['/uploads/cover.jpg', '/uploads/cover.jpg']
  ]) {
    const request = { uri: input, querystring: { test: { value: '1' } } };
    assert.equal(context.handler({ request }).uri, expected);
    assert.equal(request.querystring.test.value, '1');
  }
});
