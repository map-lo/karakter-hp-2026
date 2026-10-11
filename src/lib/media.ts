export type MediaItem = {
  artist: string;
  label: string;
  src?: string;
  layout: string;
  rotation: number;
  objectPosition?: string;
};

const artworkBase =
  'https://images.squarespace-cdn.com/content/v1/5a27fa9ef9a61e19e4b8d320';

export const mediaItems: MediaItem[] = [
  {
    artist: 'Get Well Soon',
    label: 'Siri',
    src: `${artworkBase}/1790964509316-LQAPZ9YLE40FDALYJK8X/SIRI_Single_Cover.jpg`,
    layout: 'cover-lead',
    rotation: -1.4
  },
  {
    artist: 'Get Well Soon',
    label: 'On tour',
    src: `${artworkBase}/1789748194297-7ZHGSON4W8U586RAA6GD/Dates.jpeg`,
    layout: 'poster-top',
    rotation: 2.2
  },
  {
    artist: 'Mine',
    label: 'Killer',
    src: `${artworkBase}/1788613361096-H79ZR6F47R9VEW4SNUM0/301_MIN_Mine_Album_Killer_Cover.jpg`,
    layout: 'cover-middle',
    rotation: 1.2
  },
  {
    artist: 'Wallis Bird',
    label: 'Ireland tour',
    src: `${artworkBase}/1788370078437-55HWERNNJSL59ZDSSJRE/WallisBird-IRLAND-Tour-IGpost-1.jpg`,
    layout: 'poster-middle',
    rotation: -2.4
  },
  {
    artist: 'Get Well Soon',
    label: 'Holiday in Lily Dale',
    src: `${artworkBase}/1788369850437-C7MRSAQSA1G5OHFQ7VBW/HOLIDAY+IN+LD_Single_Cover_3k.jpg`,
    layout: 'cover-small',
    rotation: 3
  },
  {
    artist: 'LOTTE',
    label: 'New music',
    src: `${artworkBase}/1787343722119-NGZ3N38HVQ4SZG9YV2LO/Lotte+cover+digi+3000px+2.jpg`,
    layout: 'wide-low',
    rotation: -1
  },
  {
    artist: 'Mine',
    label: 'Behind the scenes',
    src: `${artworkBase}/1787343474016-V5B1XJOTWTPPIV92TXQA/bastianbochinski_killer-114.jpg`,
    layout: 'photo-low',
    rotation: 2
  },
  {
    artist: 'Mine',
    label: 'Chart week',
    src: `${artworkBase}/1789747645904-R1CX9XHZ14NAWLI4OOHA/Unbenannt+-+18.+September+2026+um+18.02.03.jpeg`,
    layout: 'poster-end',
    rotation: -2
  }
];

const palettes = [
  ['#ff6846', '#f5e9d8'],
  ['#3151cf', '#dce8ff'],
  ['#c9ed65', '#182511'],
  ['#efb4cf', '#50213d'],
  ['#f3c84b', '#3c2d00']
];

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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1250">
    <rect width="1000" height="1250" fill="${background}"/>
    <circle cx="780" cy="220" r="360" fill="${foreground}" opacity=".12"/>
    <circle cx="160" cy="1080" r="420" fill="${foreground}" opacity=".08"/>
    <text x="500" y="650" fill="${foreground}" font-family="Arial, sans-serif"
      font-size="260" font-weight="700" text-anchor="middle">${initials}</text>
    <text x="500" y="1150" fill="${foreground}" font-family="Arial, sans-serif"
      font-size="34" letter-spacing="8" text-anchor="middle">${safeLabel.toUpperCase()}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
