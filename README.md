# Rasyadwa Arsya — Portfolio

A responsive Astro + TypeScript portfolio in progress. Professional content is based on the supplied CV; each homepage section is an independent Astro component. Guestbook UI has its own route at `/guestbook/`.

## Run locally

Requires Node.js and npm to install dependencies. The project includes Node 22.23.4 locally for Astro; npm scripts use that local runtime without changing your global Node installation.

This Windows checkout sets npm's script shell to `cmd.exe` in `.npmrc` so the local Node executable also works when your global npm configuration uses Git Bash. On Linux/macOS, remove that setting before running npm scripts.

1. `npm ci`
2. `npm run dev`
3. Open the Local URL printed by Astro (normally http://localhost:4321).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run check` | Astro and TypeScript diagnostics |
| `npm run build` | Static production output in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run sync:github` | Refresh the committed contribution calendar with GitHub CLI |

See [the blueprint](docs/blueprint.md) for structure, design decisions, and the next vertical passes. Browser QA artifacts live in ignored `output/playwright/`.

Astro 7 generates static HTML. Small client scripts handle navigation/preferences, the guestbook preview, and contribution-calendar positioning. No backend, CMS, framework renderer, animation package, or hosting integration is required.

## Navigation and display preferences

Desktop navigation blends into the page at the top, hides when scrolling down, and returns as a translucent capsule when scrolling up. Small changes under 8px are ignored; the initial top region is 64px. Mobile keeps the bottom icon dock with the same directional hiding. Gradient blur remains at viewport edges while content scrolls beneath it.

Theme toggle and display settings support light/dark, animation System/On/Off, and layout Default/Wide/Wider (720/880/1040px, constrained by screen width). Preferences are stored locally and applied before first paint. System animation follows reduced-motion preferences; Off removes navbar transitions. Menus stay visible while in use, close on Escape/outside click/focus departure, and remain keyboard accessible. Translation/language selection is deferred until localized content is available.

## Smooth scrolling (Lenis)

Desktop wheel/trackpad scrolling is gently smoothed by [Lenis](https://github.com/darkroomengineering/lenis) (a normal app dependency). The whole feature lives in one module, `src/scripts/smooth-scroll.ts`, mounted once from `BaseLayout.astro`. It runs a single Lenis instance on a single `requestAnimationFrame` loop; if Lenis fails to construct it logs one warning and native scrolling continues unaffected.

- **When it is on.** Only when the resolved animation preference is `full` AND the device reports `(pointer: fine)` AND `(hover: hover)` AND the viewport is `(min-width: 768px)`. Mobile/touch and narrow viewports always use native scrolling. Animation Off never initializes it; System follows the OS reduced-motion setting live; On forces it on eligible desktops. Lenis' own reduced-motion check is turned off (`respectReducedMotion: false`), because `html[data-motion]` already includes the OS setting; with On, anchor clicks glide like wheel input.
- **No reload needed.** `navigation.ts` already translates the Animation setting and OS reduced-motion into `html[data-motion]`. The module watches that attribute with a `MutationObserver` (plus pointer/hover/`min-width:768px` media-query listeners) and initializes or destroys Lenis in place. Destroying mid-scroll keeps the current document position — no jump, no scroll lock.
- **Navbar and blur are untouched.** `navigation.ts` stays the single reader of the real document scroll position (navbar `top`/`hidden`/`pill`, the 64px top region, the 8px direction tolerance, and the viewport edge blur). Lenis only smooths input and moves the real document, so the native `scroll` event keeps driving `navigation.ts`. There is exactly one scroll-direction implementation.
- **Anchors.** Same-page hash links (Home→`#intro`, Work→`#projects`, Activity→`#contributions`, and the skip link→`#main`) are intercepted and animated with `lenis.scrollTo`, the URL hash and history are updated, and focus moves to the target for accessibility. The offset comes from one source only — the CSS `scroll-margin-top` rule in `global.css` (now covering `section, #main`), so anchors land below the navbar with no double offset. Skip-to-content jumps promptly (immediate, no long glide). Cross-page links from `/guestbook/` (`/#projects`), direct hash loads, and Back/Forward all resolve through the same path. Lenis lands the URL hash only when it starts at page load (when it is off at load, the browser lands the hash natively), so turning smooth scrolling on later (Animation setting, OS reduced motion, resizing back above 768px) keeps the current position. Re-clicking the current anchor replaces the history entry instead of adding one. External links, `mailto:`, the `target="_blank"` résumé, and modifier/middle-clicks are never intercepted.
- **Nested scrolling.** The settings panel and the guestbook textarea carry `data-lenis-prevent`, so they scroll natively. The textarea sets `overscroll-behavior: auto` (overriding the `contain` from lenis.css), so the wheel moves on to the page when the field is empty or at its end. The contribution calendar uses `data-lenis-prevent-horizontal`: sideways input scrolls the calendar natively, and vertical wheel input over it scrolls the page. Any new nested scroller needs the same wheel-chaining check. Native keyboard scrolling (Page Up/Down, Home/End, Space, arrows) is unaffected — Lenis only smooths wheel input.

**Maintenance notes.** The feel is tuned by one value: `lerp: 0.12` in `init()` (lower = smoother/slower settle, higher = snappier; `smoothWheel: true`, `syncTouch: false`). Do not add a numeric `scrollTo` offset — keep CSS `scroll-margin-top` as the single offset source. Keep one Lenis instance and one rAF loop; `init()`/`destroy()` are idempotent. If you upgrade Lenis, re-confirm the stylesheet path (`lenis/dist/lenis.css`), the `data-lenis-prevent` / `data-lenis-prevent-horizontal` attribute names, and that `destroy()` still leaves no `overflow`/height lock.

## Contact water scene

The contact panel opens with an original canvas drawing of a calm water surface (`src/scripts/water-scene.ts`, mounted from `Contact.astro`): perspective-ruled sage hairlines drift on two slow waves, steep wave faces are re-stroked in a deeper sage, and slow ripples spread from occasional ambient points, from a tap or click, and (mouse/pen) from pointer movement. The box is reserved by `aspect-ratio: 16 / 9`, so nothing shifts when the canvas starts.
- **Colors** come from the `--scene-*` tokens in `tokens.css` and are re-read when the theme changes; no reload needed.
- **Motion policy.** It animates only while `html[data-motion]` is `full`, the scene is on screen (IntersectionObserver) and the tab is visible (`visibilitychange`). Otherwise the loop is cancelled. Animation Off and reduced motion under System show one still frame.
- **Cost limits.** Device pixel ratio is capped at 2, or 1.5 on `(max-width: 767px), (pointer: coarse)`, where it also draws at about 30fps with fewer samples and a smaller ripple pool.
- **Input.** Passive `pointerdown`/`pointermove` listeners only; no wheel, scroll or touchmove listeners and no `preventDefault`, so swipes over the scene scroll the page and pinch-zoom still works.
- **Fallback.** Without JS or canvas, the wrapper's CSS background (a sage gradient with still hairlines) is the scene. The canvas fades in after its first frame.
- **Shared motion budget.** While the scene animates, `<html>` carries `data-scene-active`. Other decorative loops must pause while it is present; subscribe with `onSceneActiveChange()` from `src/scripts/motion-budget.ts`.

## ASCII background

Faint water-current glyphs (`~` crests, `-` shoulders, `·` spray) drift slowly in the empty page margins (`src/components/layout/AsciiBackground.astro` + `src/scripts/ascii-background.ts`, original code). It is decoration only: `aria-hidden`, `pointer-events: none`, hidden in print and forced-colors mode (no loop runs there).
- **Never behind text.** Two fixed canvases sit against the left and right viewport edges, each at most 320px wide and ending at least 32px before `main`, with alpha fading in over 96px from the inner edge. On wide screens the extra margin next to the column stays empty, and the drawing cost stays at the 1440px level. Strips narrower than 96px are not drawn, so phones, tablets in portrait and most viewports under ~1000px (or Wide/Wider layouts that fill the screen) show nothing and run no loop.
- **Stacking.** The layer sits at `z-index: 1`: above the in-flow content, which it never overlaps, and below the viewport edge blur (25) and the navbar (40). Placed under the content (`z-index: -1`), it made Chromium switch all page text from subpixel to grayscale antialiasing on DPR-1 screens.
- **Colors** come from `--ascii-glyph` and `--ascii-alpha` in `tokens.css` and follow theme changes live.
- **Cost limits.** Each glyph type has a fixed alpha, so an update redraws only the cells whose glyph changed (about 14 per update at 1440px). Canvas DPR is capped at 1.5 (1 on coarse pointers).
- **Motion policy.** About 8 updates per second (5, with larger cells and DPR 1, on `(pointer: coarse)`). Each update is a timer followed by one `requestAnimationFrame`, so the page is not woken at 60Hz in between. It runs only while `html[data-motion]` is `full`, the tab is visible and the contact scene is not animating (`onSceneActiveChange()`; the last frame stays while the scene runs). Animation Off and reduced motion under System show one still frame. No scroll, wheel or pointer listeners.
- **Turning it off.** Set `ASCII_BACKGROUND_ENABLED = false` in `BaseLayout.astro`: the pages then contain no layer markup and load no background script.

## GitHub activity

The homepage renders real contribution data from `src/data/github-contributions.json`. It is a dated snapshot, not a live counter, and builds work offline without GitHub credentials. Refresh it using `gh auth login` and `npm run sync:github`; optionally pass an end date, e.g. `npm run sync:github -- 2026-10-30`. The script validates complete date coverage, levels, and totals before replacing the snapshot. It stores no access token or repository-private details.

## Current boundaries

- Guestbook follows the Rimzz layout with sign-in/anonymous choices and a message area. GitHub login and posting are disabled until the backend pass. Anonymous fields are a preview only: values are never submitted or persisted, and there are no fabricated entries.
- Open source, Notes, and Off the clock are deferred and excluded from the homepage. Their components are retained for later.
- The music widget is still a placeholder (no real listening data is connected). The résumé is the PDF supplied by the owner, pending a later update.
- Favicon PNG/ICO sizes are derived from the owner's supplied portrait. GitHub/source/Credly links use the owner's supplied public URLs.
- Site remains local-only with `noindex, nofollow`. Pushing source to GitHub does not deploy the site.
