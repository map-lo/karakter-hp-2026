import data from '../../karakter-content.json';

export type Artist = {
  name: string;
  url: string;
  slug: string;
};

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const artists: Artist[] = data.artists.map((artist) => {
  const slug = slugify(artist.name);
  return { name: artist.name, url: artist.url, slug };
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
