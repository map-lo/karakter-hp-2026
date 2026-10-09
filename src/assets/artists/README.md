# Artist images

Every artist in `karakter-content.json` has a portrait in this folder, named after
the artist slug: `get-well-soon.jpg`, `anais-mitchell.jpg`, `wallis-bird.jpg`,
`hundreds.jpg`, `inner-tongue.jpg`, `mine.jpg`, `honas.jpg`,
`malakoff-kowalski.jpg`, `lotte.jpg`, `marcus-wuest.jpg`.

The files currently committed here are generated, typographic stand-ins — the old
Squarespace site had no artist photos to carry over. To use a real press photo,
replace the file of the same slug (or add it as `.png`/`.webp`/`.avif` and delete
the `.jpg`). Nothing else needs to change; the roster picks it up automatically.

Images are cropped to a 4:5 portrait, so supply at least 1000 × 1250 px.

Regenerate the stand-ins (e.g. after adding an artist to the JSON):

```
npm run artist-portraits          # only fills in missing slugs
npm run artist-portraits -- --force   # redraws all generated portraits
```
