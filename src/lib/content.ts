import artistData from '../data/artists.json';
import siteData from '../data/site.json';
import { siteSchema, validateArtists } from './content-schema.mjs';

export const artists = validateArtists(artistData.artists)
  .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
  .map((artist) => ({
    ...artist,
    slug: artist.id
  }));
export type Artist = (typeof artists)[number];
export const site = siteSchema.parse(siteData);
