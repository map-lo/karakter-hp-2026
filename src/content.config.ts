import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { pageSchema } from './lib/content-schema.mjs';

export const collections = {
  pages: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/pages' }),
    schema: pageSchema
  })
};
