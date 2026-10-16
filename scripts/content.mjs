import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { siteSchema, pageSchema, validateArtists, resolveCatalogue } from '../src/lib/content-schema.mjs';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const readJson = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));

export function loadContent() {
  return {
    artists: readJson('src/data/artists.json'),
    site: readJson('src/data/site.json'),
    imported: readJson('src/data/releases.json'),
    editorial: readJson('src/data/release-editorial.json')
  };
}

export function validateContent(content) {
  const artists = validateArtists(content.artists);
  siteSchema.parse(content.site);
  const releases = resolveCatalogue(content.imported, content.editorial, content.artists);
  for (const page of ['about', 'imprint', 'privacy']) {
    const source = readFileSync(resolve(root, `src/content/pages/${page}.md`), 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
    if (!match || !match[2].trim()) throw new Error(`Missing frontmatter or body: ${page}.md`);
    pageSchema.parse(parse(match[1]));
  }
  // Check hidden releases too: unhiding a record must not reveal a broken upload.
  for (const release of [
    ...content.imported.releases,
    ...content.editorial.overrides,
    ...content.editorial.manual
  ]) {
    if (release.artwork?.startsWith('/uploads/') &&
        !existsSync(resolve(root, `public${release.artwork}`))) {
      throw new Error(`Missing artwork for ${release.id}: ${release.artwork}`);
    }
  }
  return { artists, releases };
}
