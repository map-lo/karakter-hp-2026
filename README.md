# Karakter Worldwide

Minimal homepage for the artist management Karakter Worldwide, built with Astro and Tailwind CSS.

## Content

All copy lives in [`karakter-content.json`](./karakter-content.json) and is read through
[`src/lib/content.ts`](./src/lib/content.ts). Editing the JSON updates the site — no markup changes needed.

- `artists` → the roster grid on the homepage
- `philosophy`, `team`, `contact` → `/about`
- `privacy_policy` → `/privacy`
- `imprint` → `/imprint`

## Artist images

Every artist has a portrait in `src/assets/artists/`, named after the artist slug
(e.g. `get-well-soon.jpg`). The committed files are generated typographic
stand-ins — the old site had no artist photos. Replace a file with a real press
photo of the same slug and the roster picks it up automatically. See the README
in that folder for details.

## Structure

```text
scripts/              # portrait generator
src/
├── assets/artists/   # artist portraits (one per slug)
├── components/       # ArtistCard, Prose
├── layouts/          # Layout with header + footer
├── lib/content.ts    # typed access to karakter-content.json
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
| `npm run artist-portraits` | Generate missing artist portraits (`-- --force` redraws all) |
