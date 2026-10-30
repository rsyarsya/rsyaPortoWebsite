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

- **When it is on.** Only when the resolved animation preference is `full` AND the device reports `(pointer: fine)` AND `(hover: hover)` AND the viewport is `(min-width: 768px)`. Mobile/touch and narrow viewports always use native scrolling. Animation Off never initializes it; System follows the OS reduced-motion setting live; On forces it on eligible desktops.
- **No reload needed.** `navigation.ts` already translates the Animation setting and OS reduced-motion into `html[data-motion]`. The module watches that attribute with a `MutationObserver` (plus pointer/hover/`min-width:768px` media-query listeners) and initializes or destroys Lenis in place. Destroying mid-scroll keeps the current document position — no jump, no scroll lock.
- **Navbar and blur are untouched.** `navigation.ts` stays the single reader of the real document scroll position (navbar `top`/`hidden`/`pill`, the 64px top region, the 8px direction tolerance, and the viewport edge blur). Lenis only smooths input and moves the real document, so the native `scroll` event keeps driving `navigation.ts`. There is exactly one scroll-direction implementation.
- **Anchors.** Same-page hash links (Home→`#intro`, Work→`#projects`, Activity→`#contributions`, and the skip link→`#main`) are intercepted and animated with `lenis.scrollTo`, the URL hash and history are updated, and focus moves to the target for accessibility. The offset comes from one source only — the CSS `scroll-margin-top` rule in `global.css` (now covering `section, #main`), so anchors land below the navbar with no double offset. Skip-to-content jumps promptly (immediate, no long glide). Cross-page links from `/guestbook/` (`/#projects`), direct hash loads, and Back/Forward all resolve through the same path. External links, `mailto:`, the `target="_blank"` résumé, and modifier/middle-clicks are never intercepted.
- **Nested scrolling.** The settings panel, the contribution calendar's horizontal scroll, and the guestbook textarea carry `data-lenis-prevent` so Lenis does not hijack them. Native keyboard scrolling (Page Up/Down, Home/End, Space, arrows) is unaffected — Lenis only smooths wheel input.

**Maintenance notes.** The feel is tuned by one value: `lerp: 0.12` in `init()` (lower = smoother/slower settle, higher = snappier; `smoothWheel: true`, `syncTouch: false`). Do not add a numeric `scrollTo` offset — keep CSS `scroll-margin-top` as the single offset source. Keep one Lenis instance and one rAF loop; `init()`/`destroy()` are idempotent. If you upgrade Lenis, re-confirm the stylesheet path (`lenis/dist/lenis.css`), the `data-lenis-prevent` attribute name, and that `destroy()` still leaves no `overflow`/height lock.

## GitHub activity

The homepage renders real contribution data from `src/data/github-contributions.json`. It is a dated snapshot, not a live counter, and builds work offline without GitHub credentials. Refresh it using `gh auth login` and `npm run sync:github`; optionally pass an end date, e.g. `npm run sync:github -- 2026-10-30`. The script validates complete date coverage, levels, and totals before replacing the snapshot. It stores no access token or repository-private details.

## Current boundaries

- Guestbook follows the Rimzz layout with sign-in/anonymous choices and a message area. GitHub login and posting are disabled until the backend pass. Anonymous fields are a preview only: values are never submitted or persisted, and there are no fabricated entries.
- Open source, Notes, and Off the clock are deferred and excluded from the homepage. Their components are retained for later.
- Contact scene and music widget are still placeholders. The résumé is the PDF supplied by the owner, pending a later update.
- Favicon PNG/ICO sizes are derived from the owner's supplied portrait. GitHub/source/Credly links use the owner's supplied public URLs.
- Site remains local-only with `noindex, nofollow`. Pushing source to GitHub does not deploy the site.
