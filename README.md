# Rasyadwa Arsya — Portfolio

A responsive Astro + TypeScript portfolio in progress. Professional content is based on the supplied CV; each homepage section is an independent Astro component. Guestbook UI has its own route at `/guestbook/`. `/playground/` holds a small interactive water-lines experiment (`src/scripts/playground-water.ts`): sliders, click/tap ripples, Pause/Play and Reset; it starts on load only when animation is on, stops while hidden or off screen, and is linked from the footer and the command palette, not the navbar.

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
| `npm test` | Contact and guestbook endpoint tests (vitest) |
| `npm run build` | Production output: static pages in `dist/client/`, API endpoints in `dist/server/` |
| `npm run guestbook:moderate -- list` | List pending guestbook notes; also `approve <id>`, `reject <id>`, `delete <id>` |
| `npm run spotify:auth` | One-time helper that prints a Spotify refresh token for the music widget |
| `npm run preview` | Serve the production build locally |
| `npm run sync:github` | Refresh the committed contribution calendar with GitHub CLI |

See [the blueprint](docs/blueprint.md) for structure, design decisions, and the next vertical passes. Browser QA artifacts live in ignored `output/playwright/`.

Astro 7 prerenders every page to static HTML. The only server code is the contact, guestbook and now-playing endpoints (see [Contact form](#contact-form), [Guestbook](#guestbook) and [Music widget](#music-widget-spotify)), which run through the Node adapter. Small client scripts handle navigation/preferences, the contact dialog, the guestbook, and contribution-calendar positioning. No CMS, framework renderer, or animation package is used.

## Off the Clock

The homepage includes an asymmetric photo gallery with an in-page lightbox, equal-width Games and Books collections, filterable collection dialogs, personal cover notes, and a compact Last visited postcard. Current contents are labelled demo examples. See [the content guide](docs/off-the-clock.md) to replace them with personal photos and collections. UI labels follow the language setting; personal titles and notes retain their original text.

## Navigation and display preferences

Desktop navigation blends into the page at the top, hides when scrolling down, and returns as a translucent capsule when scrolling up. Small changes under 8px are ignored; the initial top region is 64px. Mobile keeps the bottom icon dock with the same directional hiding. Gradient blur remains at viewport edges while content scrolls beneath it.

Theme toggle and display settings support light/dark, language English/Indonesia (English by default), animation System/On/Off, and layout Default/Wide/Wider (720/880/1040px, constrained by screen width). Preferences persist locally across reloads and pages. System animation follows reduced-motion preferences; Off removes navbar transitions. Menus stay visible while in use, close on Escape/outside click/focus departure, and remain keyboard accessible. Every settings row has an original outline icon and a native radio covering the whole row, so its icon, name and trailing area all select the option.

Language uses curated Indonesian copy in `src/lib/translations.ts` and a reversible DOM bridge in `src/scripts/language.ts`; there is no translation API or network dependency. Page content, form states, accessibility labels and the command palette update in place; `html.lang` follows the selected language. New copy falls back to English until added to the dictionary. Visitor-written notes and names, typed values, project/organization names and provider-supplied track/artist metadata retain their originals. English remains the static/no-JavaScript fallback, and the résumé PDF is unchanged. The command palette also offers both languages and searches localized command labels.

## Smooth scrolling (Lenis)

Desktop wheel/trackpad scrolling is gently smoothed by [Lenis](https://github.com/darkroomengineering/lenis) (a normal app dependency). The whole feature lives in one module, `src/scripts/smooth-scroll.ts`, mounted once from `BaseLayout.astro`. It runs a single Lenis instance on a single `requestAnimationFrame` loop; if Lenis fails to construct it logs one warning and native scrolling continues unaffected.

- **When it is on.** Only when the resolved animation preference is `full` AND the device reports `(pointer: fine)` AND `(hover: hover)` AND the viewport is `(min-width: 768px)`. Mobile/touch and narrow viewports always use native scrolling. Animation Off never initializes it; System follows the OS reduced-motion setting live; On forces it on eligible desktops. Lenis' own reduced-motion check is turned off (`respectReducedMotion: false`), because `html[data-motion]` already includes the OS setting; with On, anchor clicks glide like wheel input.
- **No reload needed.** `navigation.ts` already translates the Animation setting and OS reduced-motion into `html[data-motion]`. The module watches that attribute with a `MutationObserver` (plus pointer/hover/`min-width:768px` media-query listeners) and initializes or destroys Lenis in place. Destroying mid-scroll keeps the current document position — no jump, no scroll lock.
- **Navbar and blur are untouched.** `navigation.ts` stays the single reader of the real document scroll position (navbar `top`/`hidden`/`pill`, the 64px top region, the 8px direction tolerance, and the viewport edge blur). Lenis only smooths input and moves the real document, so the native `scroll` event keeps driving `navigation.ts`. There is exactly one scroll-direction implementation.
- **Anchors.** Same-page hash links (Home→`#intro`, Work→`#projects`, Activity→`#contributions`, and the skip link→`#main`) are intercepted and animated with `lenis.scrollTo`, the URL hash and history are updated, and focus moves to the target for accessibility. The offset comes from CSS only, in one place in `global.css`: `scroll-padding` on `html` reserves the fixed chrome (desktop: 88px for the navbar pill at the top, 64px for the edge blur at the bottom; mobile: 24px at the top, the dock plus the safe area at the bottom) and `scroll-margin-top` on `section, #main` adds 16px on desktop. Anchors land 104px (desktop) or 24px (mobile) from the top with no double offset; Lenis subtracts both values, like native fragment scrolling. The same padding keeps keyboard focus and Page Up/Down clear of the navbar, the mobile dock and the edge blur. Skip-to-content jumps promptly (immediate, no long glide). Cross-page links from `/guestbook/` (`/#projects`), direct hash loads, and Back/Forward all resolve through the same path. Lenis lands the URL hash only when it starts at page load (when it is off at load, the browser lands the hash natively), so turning smooth scrolling on later (Animation setting, OS reduced motion, resizing back above 768px) keeps the current position. Re-clicking the current anchor replaces the history entry instead of adding one. External links, `mailto:`, the `target="_blank"` résumé, and modifier/middle-clicks are never intercepted.
- **Nested scrolling.** The settings panel and the guestbook textarea carry `data-lenis-prevent`, so they scroll natively. The textarea sets `overscroll-behavior: auto` (overriding the `contain` from lenis.css), so the wheel moves on to the page when the field is empty or at its end. The contribution calendar uses `data-lenis-prevent-horizontal`: sideways input scrolls the calendar natively, and vertical wheel input over it scrolls the page. Any new nested scroller needs the same wheel-chaining check. Native keyboard scrolling (Page Up/Down, Home/End, Space, arrows) is unaffected — Lenis only smooths wheel input.

**Maintenance notes.** The feel is tuned by one value: `lerp: 0.12` in `init()` (lower = smoother/slower settle, higher = snappier; `smoothWheel: true`, `syncTouch: false`). Do not add a numeric `scrollTo` offset — keep CSS (`html` `scroll-padding` plus `scroll-margin-top`) as the single offset source. Keep one Lenis instance and one rAF loop; `init()`/`destroy()` are idempotent. If you upgrade Lenis, re-confirm the stylesheet path (`lenis/dist/lenis.css`), the `data-lenis-prevent` / `data-lenis-prevent-horizontal` attribute names, and that `destroy()` still leaves no `overflow`/height lock.

## Contact water scene

The contact panel opens with an original canvas drawing of a calm water surface (`src/scripts/water-scene.ts`, mounted from `Contact.astro`): perspective-ruled sage hairlines drift on two slow waves, steep wave faces are re-stroked in a deeper sage, and slow ripples spread from occasional ambient points, from a tap or click, and (mouse/pen) from pointer movement. The box is reserved by `aspect-ratio: 16 / 9`, so nothing shifts when the canvas starts.
- **Colors** come from the `--scene-*` tokens in `tokens.css` and are re-read when the theme changes; no reload needed.
- **Motion policy.** It animates only while `html[data-motion]` is `full`, the scene is on screen (IntersectionObserver) and the tab is visible (`visibilitychange`). Otherwise the loop is cancelled. Animation Off and reduced motion under System show one still frame.
- **Cost limits.** Device pixel ratio is capped at 2, or 1.5 on `(max-width: 767px), (pointer: coarse)`, where it also draws at about 30fps with fewer samples and a smaller ripple pool.
- **Input.** Passive `pointerdown`/`pointermove` listeners only; no wheel, scroll or touchmove listeners and no `preventDefault`, so swipes over the scene scroll the page and pinch-zoom still works.
- **Fallback.** Without JS or canvas, the wrapper's CSS background (a sage gradient with still hairlines) is the scene. The canvas fades in after its first frame.
- **Shared motion budget.** While the scene animates, `<html>` carries `data-scene-active`. Other decorative loops must pause while it is present; subscribe with `onSceneActiveChange()` from `src/scripts/motion-budget.ts`.

## ASCII background

The background uses the actual World and AsciiRenderer from [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks), pinned to revision `a0074c16a106f0abc665fe9712ca445f8f98ad8e`. Source lives in `src/vendor/ascii-sharks/` with its MIT license; the license is also shipped at `/licenses/ascii-sharks.txt`. No runtime package dependencies or video downloads are required.
- **Ecosystem.** Two margin oceans each contain two large sharks and 32 schooling fish. Classic/hammerhead on the left, mako/thresher on the right. Upstream steering, articulated spines, pursuit, schooling, wakes and ASCII shading are retained. Small fish have directional ASCII bodies and moving tails, with wider spacing and continuous positioning. Initial shark positions are adapted for narrow margins; the demo grid and opaque backdrop are omitted.
- **Reading space.** Canvas strips are capped at 440px, end at least 32px before `main`, and fade towards the content. Margins below 160px allocate no simulation, including phones. The layer is decorative, aria-hidden and pointer-transparent.
- **Theme.** Transparent canvases preserve the page background. Per-canvas grayscale/sepia and light-mode inversion keep the original shading compatible with the site palette. Appearance is controlled in AsciiBackground.astro.
- **Lifecycle.** The site-owned adapter in `src/scripts/ascii-background.ts` uses fixed 60Hz simulation steps and about 20 rendered frames/second (10 on coarse pointers), DPR capped at 1.5 (1 on coarse pointers). It pauses for Animation Off/reduced motion, hidden tabs, print and forced colors. While Contact/playground scenes are active, it keeps swimming at 10fps instead of stopping. Pausing retains the last image. The upstream engine's global pointer listeners are not installed.
- **Turning it off.** Set `ASCII_BACKGROUND_ENABLED = false` in BaseLayout.astro.
## Contact form

"Get in touch" (hero) and "Email me" (Contact) open one native `<dialog>` (`src/components/ui/ContactDialog.astro`). Without JavaScript both stay `mailto:` links. The dialog posts JSON to `POST /api/contact` (`src/pages/api/contact.ts`, the only on-demand route; every page is still prerendered). The handler in `src/server/contact.ts` checks same-origin, JSON content type, a 16 KiB body cap, a honeypot field and the fields (name 1–80, email ≤254, message 1–2000), then sends a plain-text email through the Resend REST API. The recipient comes only from server config; the visitor's address is the Reply-To. The UI reports success only when Resend returns 2xx with a message id, and it says the mail service accepted the message, not that it arrived. Message bodies and email addresses are never logged.

Rate limit: 3 messages per client address per 10 minutes, kept in process memory. This is best-effort: it holds on one long-lived Node server, but resets on restart and is per-instance on serverless hosts.

Server environment variables (read at runtime via `astro:env`, never sent to the browser; set them in the host's environment, not in the repository):

| Variable | Required | Default |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | none; without it the endpoint answers `503 not_configured` and the dialog offers the email address instead |
| `CONTACT_TO_EMAIL` | no | the email in `src/data/profile.ts` |
| `CONTACT_FROM_EMAIL` | no | `Portfolio <onboarding@resend.dev>` |

Resend's `onboarding@resend.dev` sender only delivers to the address that owns the Resend account, so either open the account with the profile email or verify a domain and set `CONTACT_FROM_EMAIL` to an address on it.

Local run with delivery: set the variable in the shell for that process only, e.g. PowerShell `$env:RESEND_API_KEY = 're_…'; npm run dev`. `npm run build` writes `dist/client/` (static files) and `dist/server/entry.mjs`; serve both with `npm run preview` or `node dist/server/entry.mjs` (`HOST`/`PORT` set the address). Tests: `npm test` (vitest, mocked provider, no network).

Hosting: the site uses `@astrojs/node` in standalone mode, so any Node host works. To move to Vercel, Netlify or Cloudflare, replace the `adapter` line in `astro.config.mjs` with that platform's adapter; the handler uses only `Request`, `Response` and `fetch`. The in-memory rate limit is weaker there (see above).

## Guestbook

`/guestbook/` stays a prerendered page. It loads notes from `GET /api/guestbook` (approved notes only, newest first, 20 per page with a cursor and "Load more") and posts the anonymous form (optional name ≤80, optional http/https website ≤200, message 1–1000) to `POST /api/guestbook`. The handler (`src/server/guestbook.ts`) reuses the contact guards in `src/server/http.ts` (same-origin, JSON only, size cap, honeypot, 3 notes per client per 10 minutes in memory). New notes are stored as `pending` and answer `202`; only approved notes are public. Notes are rendered as plain text and website links get `rel="ugc nofollow noopener noreferrer"`. No IP address, user agent or email is stored. GitHub sign-in is shown as disabled ("later").

Storage is libSQL (`@libsql/client`); the table is created on first use.

| Variable | Required | Notes |
| --- | --- | --- |
| `GUESTBOOK_DB_URL` | yes | Turso `libsql://<db>.turso.io` in production; locally `file:.data/guestbook.db`. Without it the API answers `503 not_configured` and the page says signing is unavailable |
| `GUESTBOOK_DB_AUTH_TOKEN` | for Turso | Turso database token; not needed for a local `file:` DB |

Local run: `.data/` is git-ignored (local only). Create it, then set the variable for the process, e.g. PowerShell `mkdir .data; $env:GUESTBOOK_DB_URL = 'file:.data/guestbook.db'; npm run dev`.

Moderation is a local CLI with the same variables in the shell; there is no admin HTTP endpoint:

```
npm run guestbook:moderate -- list           # pending notes with ids
npm run guestbook:moderate -- approve <id>
npm run guestbook:moderate -- reject <id>
npm run guestbook:moderate -- delete <id>
```

## Music widget (Spotify)

The footer shows what the owner is playing, or the last played track with a relative time. It reads `GET /api/now-playing` (`src/pages/api/now-playing.ts` + `src/server/now-playing.ts`), caches the response for 30 s (`Cache-Control: public, s-maxage=30, stale-while-revalidate=60`), and returns only track, artist and album names, the provider's own links and the artwork URL. The widget loads when the footer comes near the viewport and refreshes about every 60 s while the tab is visible, attributing the track to its source ("on Spotify" or "via Last.fm"). Without credentials the API answers `503 not_configured` and the widget says listening activity is unavailable; upstream errors give `502`. No audio is played.

Two providers are supported. **Last.fm takes precedence over Spotify when both are configured** — use it when the owner has no Spotify Premium, since Spotify's Web API returns `403 Active premium subscription required for the owner of the app` for Development Mode apps without Premium. Selection resolves once per process: Last.fm when `LASTFM_API_KEY` + `LASTFM_USERNAME` are set, else Spotify when all three `SPOTIFY_*` vars are set, else `not_configured`.

### Last.fm (recommended, free)

Last.fm scrobbles your Spotify (or other player) listens and its API has no Premium requirement.

1. Create a [Last.fm](https://www.last.fm) account and connect Spotify under **Settings → Applications**.
2. In **Settings → Privacy**, make sure **Hide recent listening information** is **OFF** — otherwise the API returns error 17 and the widget stays on the unavailable state.
3. Create an API account at <https://www.last.fm/api/account/create> (the callback URL can be left empty; the shared secret is not needed for reading recent tracks).
4. Set these variables in the host environment (never in the repository):

| Variable | Notes |
| --- | --- |
| `LASTFM_API_KEY` | API key from the API account |
| `LASTFM_USERNAME` | The Last.fm username whose recent tracks to show |

### Spotify (fallback)

Used only when the Last.fm vars are not set. Requires the app owner to have Spotify Premium (Development Mode apps 403 otherwise).

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) (Web API).
2. Add the redirect URI `http://127.0.0.1:8888/callback`.
3. In a shell, set the app credentials for that process only and run the helper, e.g. PowerShell `$env:SPOTIFY_CLIENT_ID = '…'; $env:SPOTIFY_CLIENT_SECRET = '…'; npm run spotify:auth`. It opens the authorization page (scopes `user-read-currently-playing user-read-recently-played`) and prints the refresh token in the terminal. It writes no file.
4. Set the three variables in the host environment (never in the repository):

| Variable | Notes |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | From the Spotify app |
| `SPOTIFY_CLIENT_SECRET` | From the Spotify app |
| `SPOTIFY_REFRESH_TOKEN` | Printed by `npm run spotify:auth` |

## GitHub activity

The homepage renders real contribution data from `src/data/github-contributions.json`. It is a dated snapshot, not a live counter, and builds work offline without GitHub credentials. Refresh it using `gh auth login` and `npm run sync:github`; optionally pass an end date, e.g. `npm run sync:github -- 2026-10-30`. The script validates complete date coverage, levels, and totals before replacing the snapshot. It stores no access token or repository-private details.

## Current boundaries

- Guestbook: anonymous notes are live once `GUESTBOOK_DB_URL` is set (see [Guestbook](#guestbook)); GitHub sign-in is deferred. Without JavaScript the page says that reading and signing need JavaScript.
- Open source, Notes, and Off the clock are deferred and excluded from the homepage. Their components are retained for later.
- The music widget shows real listening data once a provider is configured — Last.fm (`LASTFM_API_KEY` + `LASTFM_USERNAME`, preferred) or Spotify (the three `SPOTIFY_*` vars), see [Music widget](#music-widget-spotify). The résumé is the PDF supplied by the owner, pending a later update.
- Favicon PNG/ICO sizes are derived from the owner's supplied portrait. GitHub/source/Credly links use the owner's supplied public URLs.
- Site remains local-only with `noindex, nofollow`. Pushing source to GitHub does not deploy the site.
- Link previews: each page has its title and description plus Open Graph `og:type`, `og:site_name`, `og:title`, `og:description` and `twitter:card=summary`. They contain no absolute URL; `og:url`, a canonical link and `og:image` wait for a production domain.
