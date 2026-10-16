import { loadContent, validateContent } from './content.mjs';

const { artists, releases } = validateContent(loadContent());
console.log(`Content valid: ${artists.length} artists, ${releases.length} visible releases, 3 Markdown pages.`);
