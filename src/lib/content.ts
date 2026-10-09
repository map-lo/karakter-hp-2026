import type { ImageMetadata } from 'astro';
import data from '../../karakter-content.json';

export type Artist = {
  name: string;
  url: string;
  slug: string;
  image?: ImageMetadata;
};

const artistImages = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/artists/*.{jpg,jpeg,png,webp,avif}',
  { eager: true }
);

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function imageFor(slug: string): ImageMetadata | undefined {
  const match = Object.entries(artistImages).find(
    ([path]) => slugify(path.split('/').pop()!.replace(/\.[^.]+$/, '')) === slug
  );
  return match?.[1].default;
}

export const artists: Artist[] = data.artists.map((artist) => {
  const slug = slugify(artist.name);
  return { name: artist.name, url: artist.url, slug, image: imageFor(slug) };
});

export const philosophy = data.philosophy.text;
export const team = data.team.text;
export const contact = data.contact.text;
export const privacyPolicy = data.privacy_policy.text;
export const imprint = data.imprint.text;

export function paragraphs(text: string): string[] {
  return text
    .split('\n\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
