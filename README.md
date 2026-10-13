# Karakter Worldwide

Minimal homepage for the artist management Karakter Worldwide, built with Astro and Tailwind CSS.

## Content

All copy lives in [`karakter-content.json`](./karakter-content.json) and is read through
[`src/lib/content.ts`](./src/lib/content.ts). Editing the JSON updates the site — no markup changes needed.

- `artists` → the roster in the fixed homepage panel
- `philosophy`, `team`, `contact` → `/about`
- `privacy_policy` → `/privacy`
- `imprint` → `/imprint`

## Releases

The homepage grid shows every release in [`src/data/releases.json`](./src/data/releases.json),
newest first. That file is a committed cache so builds stay offline safe. Refresh it with:

```sh
npm run releases
```

[`scripts/fetch-releases.mjs`](./scripts/fetch-releases.mjs) reads the roster's releases from the
public iTunes Search API (no key needed) and stores title, release date, label and artwork URL.
Artist IDs are pinned inside the script because names such as `Mine` and `LOTTE` match several
unrelated acts. Add an artist to `artistIds` there to include them; the script reports anyone on
the roster without an ID. `createPlaceholder()` in `src/lib/releases.ts` draws an inline SVG sleeve
when a remote artwork fails to load.

## Structure

```text
src/
├── components/       # ReleaseCard, Prose
├── layouts/          # Layout with header + footer
├── data/             # cached release data
├── lib/              # content and release access
├── pages/            # index, about, privacy, imprint
└── styles/global.css # Tailwind theme, typography utilities
```

## Styling

Use Tailwind utilities for layout, spacing, typography, and responsive styles.
Shared colors and typography utilities live in [`src/styles/global.css`](./src/styles/global.css).
For repeated patterns, use scoped classes with `@apply` in `@layer components`,
referencing the global stylesheet with `@reference` so theme utilities are available.
Keep custom CSS for details that are clearer without utilities, such as SVG stroke settings.
The homepage retains its 1024px desktop and 420px small-screen breakpoints.
The logo uses explicit proportional dimensions and a transform-based wordmark overlay
to keep its placement consistent in Safari/iPhone and Chromium. Below 1024px, site
links appear only in the bottom footer; desktop keeps them in the fixed artist panel.

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the dev server at `localhost:4321`    |
| `npm run build`   | Build the production site to `./dist/`      |
| `npm run preview` | Preview the production build locally        |
| `npm run releases`| Refresh `src/data/releases.json` from iTunes |
| `npm run deploy:preview` | Build and upload the public S3 preview |

## AWS preview

The preview is hosted at:

http://karakter-homepage-preview-035932132046.s3-website.eu-central-1.amazonaws.com

The S3 bucket `karakter-homepage-preview-035932132046` is in `eu-central-1`
and uses the local AWS CLI profile `lya2`. Sign in first if the SSO session has expired:

```sh
aws sso login --profile lya2
npm run deploy:preview
```

[`scripts/deploy-preview.sh`](./scripts/deploy-preview.sh) verifies the bucket owner,
builds the static site, and syncs `dist/` to the bucket. Uploads use `Cache-Control: no-cache`
so browsers revalidate content when the preview changes. Sync does not delete older files.
Only deploy content intended to be public.

This is an HTTP-only, publicly readable preview with AWS storage and request charges.
Public ACLs remain blocked; anonymous reads are granted by the bucket policy, not ACLs.
The website serves `index.html`, including the generated page directories.
For HTTPS, use CloudFront with a private S3 bucket instead.
