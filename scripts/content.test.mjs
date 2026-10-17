import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from 'yaml';
import { resolveReleases, validateArtists, siteSchema } from '../src/lib/content-schema.mjs';
import { loadContent, validateContent, root } from './content.mjs';

const artist = { id: 'test-artist', name: 'Test Artist', url: 'https://example.com' };
const release = {
  visible: true, artistId: artist.id, title: 'Original', kind: 'album',
  releaseDate: '2020-01-01', label: 'Label', url: 'https://example.com/album',
  artwork: '', artworkUrl: 'https://example.com/art.jpg'
};
const resolve = (...releases) => resolveReleases({ releases }, [artist]);

test('all committed content is valid and visibility is respected', () => {
  const content = loadContent();
  const result = validateContent(content);
  assert.equal(result.artists.length, content.artists.length);
  assert.equal(result.releases.length,
    content.releases.releases.filter((entry) => entry.visible !== false).length);
  assert.ok(result.releases.every((entry) => entry.artist && entry.artistId && entry.artwork));
});

test('releases sort strictly by date, newest first, ignoring list order', () => {
  const result = resolve(
    { ...release, title: 'Middle', releaseDate: '2020-06-01' },
    { ...release, title: 'Oldest', releaseDate: '2010-01-01' },
    { ...release, title: 'Future', releaseDate: '2099-01-01' },
    { ...release, title: 'B same day', releaseDate: '2020-06-01' }
  );
  assert.deepEqual(result.map((entry) => entry.title), ['Future', 'B same day', 'Middle', 'Oldest']);
});

test('visible defaults to true; only explicit false hides the whole release', () => {
  const { visible, ...withoutFlag } = release;
  const result = resolve(
    { ...withoutFlag, title: 'Default' },
    { ...release, title: 'Hidden', visible: false },
    { ...release, title: 'Shown', visible: true }
  );
  assert.deepEqual(result.map((entry) => entry.title).sort(), ['Default', 'Shown']);
  assert.ok(result.every((entry) => !('visible' in entry)));
});

test('artwork comes from exactly one of upload or URL', () => {
  assert.equal(resolve(release)[0].artwork, release.artworkUrl);
  assert.equal(resolve({ ...release, artwork: '/uploads/cover.jpg', artworkUrl: '' })[0].artwork, '/uploads/cover.jpg');
  assert.equal(resolve({ ...release, artwork: '/uploads/cover.jpg', artworkUrl: null })[0].artwork, '/uploads/cover.jpg');
  assert.throws(() => resolve({ ...release, artwork: '/uploads/cover.jpg' }), /either an uploaded artwork or an artwork URL/);
  assert.throws(() => resolve({ ...release, artworkUrl: '' }), /either an uploaded artwork or an artwork URL/);
});

test('blank optional label/link become null', () => {
  const [result] = resolve({ ...release, label: '', url: '' });
  assert.equal(result.label, null);
  assert.equal(result.url, null);
});

test('artist renaming preserves release association by ID; unknown artists fail', () => {
  const [result] = resolveReleases({ releases: [release] }, [{ ...artist, name: 'Renamed' }]);
  assert.equal(result.artist, 'Renamed');
  assert.throws(() => resolveReleases({ releases: [release] }, [{ ...artist, id: 'other' }]), /unknown artist/);
  assert.throws(() => validateArtists([artist, artist]), /Duplicate artist ID/);
});

test('invalid dates, unsafe URLs, traversal and unknown fields fail validation', () => {
  for (const change of [
    { releaseDate: '2026-02-30' },
    { artworkUrl: 'javascript:alert(1)' },
    { artwork: '/uploads/../secret.jpg', artworkUrl: '' },
    { artwork: 'https://example.com/a.jpg', artworkUrl: '' },
    { url: 'javascript:alert(1)' },
    { id: 'itunes-1' }
  ]) {
    assert.throws(() => resolve({ ...release, ...change }), undefined, JSON.stringify(change));
  }
});

test('missing local artwork is an explicit error, including for hidden releases', () => {
  const content = loadContent();
  content.releases.releases.push({ ...release, artistId: content.artists[0].id, visible: false, artwork: '/uploads/missing-test-image.jpg', artworkUrl: '' });
  assert.throws(() => validateContent(content), /Missing artwork/);
});

test('CMS config covers canonical files and every release field', () => {
  const config = parse(readFileSync(`${root}/.pages.yml`, 'utf8'));
  const entries = config.content.flatMap((entry) => entry.items ?? [entry]);
  for (const entry of entries) {
    assert.ok(readFileSync(`${root}/${entry.path}`, 'utf8'));
    assert.ok(entry.fields.length);
  }
  const artistList = entries.find((entry) => entry.name === 'artists').fields[0];
  assert.equal(artistList.list.collapsible.summary, '{name}');
  assert.deepEqual(artistList.fields.map((field) => field.name), ['id', 'name', 'url', 'alternateUrl']);
  const releaseFields = entries.find((entry) => entry.name === 'releases').fields[0].fields;
  assert.deepEqual(releaseFields.map((field) => field.name).sort(), ['artistId', 'artwork', 'artworkUrl',
    'kind', 'label', 'releaseDate', 'title', 'url', 'visible']);
  assert.equal(releaseFields.find((field) => field.name === 'visible').default, true);
  assert.match(releaseFields.find((field) => field.name === 'artwork').description, /600 × 600 px/);
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
