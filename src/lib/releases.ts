import data from '../data/releases.json';

export type ReleaseKind = 'album' | 'ep' | 'single';

export type Release = {
  artist: string;
  title: string;
  kind: ReleaseKind;
  releaseDate: string;
  label: string | null;
  artwork: string;
  url: string | null;
};

export const releases = data.releases as Release[];
export const releasesFetchedAt = data.fetchedAt;

const palettes = [
  ['#e43d30', '#f5e9d8'],
  ['#284bc4', '#dce8ff'],
  ['#c9ed65', '#182511'],
  ['#efb4cf', '#50213d'],
  ['#f3c84b', '#3c2d00']
];

/** Square sleeve stand-in used when remote artwork fails to load. */
export function createPlaceholder(label: string, index = 0): string {
  const [background, foreground] = palettes[index % palettes.length];
  const safeLabel = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const initials = safeLabel
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
    <rect width="1000" height="1000" fill="${background}"/>
    <circle cx="500" cy="500" r="300" fill="${foreground}" opacity=".12"/>
    <circle cx="500" cy="500" r="90" fill="${foreground}" opacity=".18"/>
    <text x="500" y="560" fill="${foreground}" font-family="Arial, sans-serif"
      font-size="200" font-weight="700" text-anchor="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
