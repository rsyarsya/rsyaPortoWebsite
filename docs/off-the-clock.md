# Off the Clock content

The homepage renders `src/components/sections/OffTheClock.astro` after Contributions.
Edit `src/data/off-the-clock.ts` to replace `demoCollection` with your own
`OffTheClockCollection` object. Set `demo: false` only after replacing the sample
photos, games, books, notes and postcard. The current examples are explicitly
labelled as a design preview; they are not the owner's actual history.

- `photos`: the first six form the asymmetric homepage gallery; all entries are
  available through previous/next controls in the lightbox. Supply accurate
  `width`, `height`, `alt`, caption and optional location/date. `position` controls
  only the homepage crop (for example, `50% 30%`); the lightbox contains the full image.
- `games`: set `status` to `playing` or `played`. Assign unique `formativeRank`
  values 1–9 to the nine games that shaped you. `note` is the personal story
  revealed when opening the cover. All games appear in View collection.
- `books`: set `status` to `reading`, `read` or `want-to-read`. Currently reading
  books appear first on the homepage, followed by `featured` books (six total).
  All books remain available in View bookshelf. `note` holds your reading notes.
- `lastVisited`: one photo, place name, location, date and short memory. Use `null`
  for the empty state. Dates are display strings; only add details you want public.

For optimized photos and raster covers, put originals in `src/assets/off-the-clock/`
and import them into the data file. Supply the imported metadata as `image` and
its `src` as the URL; use its width/height for gallery entries. Astro generates
responsive WebP files during the build. The gallery's size hints account for
portrait crops, and the lightbox keeps the full original. For example:

```ts
import moment from '../assets/off-the-clock/my-photo.jpg';
// In a gallery entry:
// src: moment.src, image: moment, width: moment.width, height: moment.height
```

Root-relative paths under `public/images/off-the-clock/` still work without the
optional `image` field; these files are served as supplied. SVG book covers stay
in `public/` without raster conversion. The sample originals are isolated in
`src/assets/off-the-clock/demo/`, with SVGs in `public/images/off-the-clock/demo/`, and credited in
`public/licenses/off-the-clock-demo.txt`. Book cover illustrations were created
for this preview; they are not publisher covers. Gallery and cover images load
lazily. Dialogs use the shared scroll lock, native focus containment and Escape;
photo arrow keys and horizontal swipes wrap through the gallery. The lightbox keeps
the current image while loading the next, crossfades after decoding, and offers
retry on failure. Adjacent originals preload only after opening (disabled with
Save-Data). Reduced motion disables the crossfade. Gallery links retain a full-image
fallback without JavaScript. UI labels support English/Indonesia; personal
captions, titles, author names and notes remain as supplied.

Validation artifacts are local under `output/playwright/off-clock-*`.
