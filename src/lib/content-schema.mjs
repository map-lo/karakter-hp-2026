import { z } from 'zod';

const text = z.string().trim().min(1);
const id = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const webUrl = z.url({ protocol: /^https?$/ });
const upload = z.string().regex(/^\/uploads\/[a-zA-Z0-9/_ .-]+\.(?:png|jpe?g|webp|gif|avif)$/i)
  .refine((value) => !value.split('/').includes('..'), 'Artwork path cannot traverse directories');
const kind = z.enum(['album', 'ep', 'single']);
const date = z.iso.date();
const optional = (schema) => z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  schema.optional()
);
const nullableText = z.string().trim().nullable().optional().transform((value) => value || null);
const nullableUrl = optional(webUrl).transform((value) => value ?? null);

export const artistSchema = z.strictObject({
  id,
  name: text,
  url: webUrl,
  alternateUrl: optional(webUrl)
});
export const artistsSchema = z.array(artistSchema).min(1);
export const siteSchema = z.strictObject({
  companyName: text,
  address: text,
  email: z.email(),
  instagramUrl: webUrl,
  instagramHandle: text,
  spotifyUrl: webUrl,
  appleMusicUrl: webUrl
});
export const pageSchema = z.object({
  title: text,
  description: text
});
export const releaseSchema = z.strictObject({
  visible: z.boolean().optional().default(true),
  artistId: id,
  title: text,
  kind,
  releaseDate: date,
  label: nullableText,
  url: nullableUrl,
  artwork: optional(upload),
  artworkUrl: optional(webUrl)
}).superRefine((release, context) => {
  if (Boolean(release.artwork) === Boolean(release.artworkUrl)) {
    context.addIssue({
      code: 'custom',
      path: ['artwork'],
      message: 'Provide either an uploaded artwork or an artwork URL, not both or neither'
    });
  }
});
export const releasesSchema = z.strictObject({
  releases: z.array(releaseSchema)
});

function unique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

export function validateArtists(input) {
  const artists = artistsSchema.parse(input);
  unique(artists.map((artist) => artist.id), 'artist ID');
  unique(artists.map((artist) => artist.name.toLowerCase()), 'artist name');
  return artists;
}

export function resolveReleases(releasesInput, artistInput) {
  const artists = validateArtists(artistInput);
  const { releases } = releasesSchema.parse(releasesInput);
  const byArtist = new Map(artists.map((artist) => [artist.id, artist]));
  return releases.map((release, index) => {
    const artist = byArtist.get(release.artistId);
    if (!artist) throw new Error(`Release #${index + 1} (${release.title}) refers to unknown artist: ${release.artistId}`);
    const { artworkUrl, visible, ...fields } = release;
    return { ...fields, artwork: fields.artwork ?? artworkUrl, visible, artist: artist.name };
  })
    .filter((release) => release.visible)
    .map(({ visible, ...release }) => release)
    // Strictly by release date (newest first); CMS list order is ignored.
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) ||
      a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) ||
      a.artist.localeCompare(b.artist, 'en', { sensitivity: 'base' }));
}
