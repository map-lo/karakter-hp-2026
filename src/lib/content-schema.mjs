import { z } from 'zod';

const text = z.string().trim().min(1);
const id = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const webUrl = z.url({ protocol: /^https?$/ });
const artwork = z.union([
  webUrl,
  z.string().regex(/^\/uploads\/[a-zA-Z0-9/_ .-]+\.(?:png|jpe?g|webp|gif|avif)$/i)
    .refine((value) => !value.split('/').includes('..'), 'Artwork path cannot traverse directories')
]);
const kind = z.enum(['album', 'ep', 'single']);
const date = z.iso.date();
const optional = (schema) => z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  schema.optional()
);
const nullableText = z.string().trim().nullable().transform((value) => value || null);
const nullableUrl = z.union([webUrl, z.literal(''), z.null()])
  .transform((value) => value || null);

export const artistSchema = z.strictObject({
  id,
  name: text,
  url: webUrl,
  alternateUrl: optional(webUrl),
  itunesArtistId: optional(z.number().int().positive())
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
const releaseFields = {
  artistId: id,
  title: text,
  kind,
  releaseDate: date,
  label: nullableText,
  artwork,
  url: nullableUrl
};
export const importedReleaseSchema = z.strictObject({
  id: z.string().regex(/^itunes-\d+$/),
  ...releaseFields
});
export const importedSchema = z.strictObject({
  source: z.literal('iTunes Search API'),
  fetchedAt: date,
  releases: z.array(importedReleaseSchema).min(1)
});
export const overrideSchema = z.strictObject({
  id: z.string().regex(/^itunes-\d+$/),
  title: optional(text),
  kind: optional(kind),
  releaseDate: optional(date),
  label: nullableText.optional(),
  artwork: optional(artwork),
  url: nullableUrl.optional(),
  hidden: z.boolean().optional()
});
export const manualReleaseSchema = z.strictObject({
  id: z.string().regex(/^manual-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ...releaseFields,
  label: nullableText.optional().default(null),
  url: nullableUrl.optional().default(null),
  hidden: z.boolean().optional()
});
export const editorialSchema = z.strictObject({
  overrides: z.array(overrideSchema),
  manual: z.array(manualReleaseSchema)
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
  unique(artists.flatMap((artist) => artist.itunesArtistId ? [artist.itunesArtistId] : []), 'iTunes artist ID');
  return artists;
}

export function resolveCatalogue(importedInput, editorialInput, artistInput) {
  const artists = validateArtists(artistInput);
  const imported = importedSchema.parse(importedInput);
  const editorial = editorialSchema.parse(editorialInput);
  unique(imported.releases.map((release) => release.id), 'imported release ID');
  unique(editorial.overrides.map((release) => release.id), 'override ID');
  unique(editorial.manual.map((release) => release.id), 'manual release ID');
  const importedIds = new Set(imported.releases.map((release) => release.id));
  for (const override of editorial.overrides) {
    if (!importedIds.has(override.id)) throw new Error(`Override refers to unknown release: ${override.id}`);
  }
  const byArtist = new Map(artists.map((artist) => [artist.id, artist]));
  const overrides = new Map(editorial.overrides.map(({ id, ...fields }) => [
    id,
    Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
  ]));
  const releases = [
    ...imported.releases.map((release) => ({ ...release, ...overrides.get(release.id) })),
    ...editorial.manual
  ].map((release) => {
    const artist = byArtist.get(release.artistId);
    if (!artist) throw new Error(`Release ${release.id} refers to unknown artist: ${release.artistId}`);
    return { ...release, artist: artist.name };
  });
  return releases.filter((release) => !release.hidden)
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.id.localeCompare(b.id));
}
