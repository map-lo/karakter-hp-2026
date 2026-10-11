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

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the dev server at `localhost:4321`    |
| `npm run build`   | Build the production site to `./dist/`      |
| `npm run preview` | Preview the production build locally        |
| `npm run releases`| Refresh `src/data/releases.json` from iTunes |
