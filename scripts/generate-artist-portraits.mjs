// Generates a portrait asset for every artist in karakter-content.json.
// Existing files are kept, so a real photo dropped in as <slug>.jpg|png|webp always wins.
import { readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = path.join(root, 'src/assets/artists');
const data = JSON.parse(readFileSync(path.join(root, 'karakter-content.json'), 'utf8'));

const WIDTH = 1200;
const HEIGHT = 1500;
const force = process.argv.includes('--force');

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const hash = (value) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const initials = (name) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svgFor(name, seed, index) {
  // Golden-angle spread keeps neighbouring cards in the grid tonally distinct.
  const hue = Math.round((index * 137.508 + 24) % 360);
  const base = `hsl(${hue}, 12%, 15%)`;
  const lift = `hsl(${(hue + 28) % 360}, 18%, 33%)`;
  const glowX = 28 + (seed % 45);
  const glowY = 18 + ((seed >> 5) % 45);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="field" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${lift}"/>
      <stop offset="100%" stop-color="${base}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${glowX}%" cy="${glowY}%" r="68%">
      <stop offset="0%" stop-color="#f4f3f0" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#f4f3f0" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#field)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2}" fill="#f4f3f0" fill-opacity="0.17"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="500"
    font-size="480" letter-spacing="-16" text-anchor="middle" dominant-baseline="central"
  >${escapeXml(initials(name))}</text>
</svg>`;
}

mkdirSync(outDir, { recursive: true });
const existing = readdirSync(outDir).filter((file) => !file.endsWith('.md'));

for (const [index, artist] of data.artists.entries()) {
  const slug = slugify(artist.name);

  if (!force && existing.some((file) => file.replace(/\.[^.]+$/, '') === slug)) {
    console.log(`skip  ${slug} (asset already present)`);
    continue;
  }

  const target = path.join(outDir, `${slug}.jpg`);
  await sharp(Buffer.from(svgFor(artist.name, hash(slug), index)))
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toFile(target);
  console.log(`write ${path.relative(root, target)}`);
}
