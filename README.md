# Karakter Worldwide

Minimal homepage for the artist management Karakter Worldwide, built with Astro and Tailwind CSS.

## Content

All copy lives in [`karakter-content.json`](./karakter-content.json) and is read through
[`src/lib/content.ts`](./src/lib/content.ts). Editing the JSON updates the site — no markup changes needed.

- `artists` → the roster in the fixed homepage panel
- `philosophy`, `team`, `contact` → `/about`
- `privacy_policy` → `/privacy`
- `imprint` → `/imprint`

## Homepage media

The collage is configured in `src/lib/media.ts`. Each item can use a remote
artwork URL and is matched to an artist from the content JSON. `createPlaceholder()`
generates an inline SVG fallback when no image is supplied or a remote image
cannot be loaded.

## Structure

```text
src/
├── components/       # MediaTile, Prose
├── layouts/          # Layout with header + footer
├── lib/              # content access and homepage media
├── pages/            # index, about, privacy, imprint
└── styles/global.css # Tailwind theme, typography utilities
```

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the dev server at `localhost:4321`    |
| `npm run build`   | Build the production site to `./dist/`      |
| `npm run preview` | Preview the production build locally        |
