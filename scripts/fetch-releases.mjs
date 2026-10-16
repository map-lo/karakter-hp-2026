import { writeFileSync, renameSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { importedSchema, validateArtists } from '../src/lib/content-schema.mjs';
import { root, loadContent, validateContent } from './content.mjs';
import { importReleases, assertNoUnexpectedRemovals } from './release-import.mjs';

const content = loadContent();
const imported = importedSchema.parse(await importReleases(validateArtists(content.artists)));
assertNoUnexpectedRemovals(content.imported, imported, process.argv.includes('--allow-removals'));
validateContent({ ...content, imported });
const target = resolve(root, 'src/data/releases.json');
const temporary = `${target}.${randomUUID()}.tmp`;
try {
  writeFileSync(temporary, `${JSON.stringify(imported, null, 2)}\n`, { flag: 'wx' });
  renameSync(temporary, target);
} finally {
  rmSync(temporary, { force: true });
}
console.log(`Wrote ${imported.releases.length} releases. Editorial changes were not modified.`);
