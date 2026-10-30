# Blueprint verification

Verified on Windows, 2026-10-30.

- Astro 7.4.4 with project-local Node 22.23.4.
- `npm run check`: 20 Astro files, zero errors, warnings, or hints.
- `npm run build`: one static page built successfully.
- Dependency installation audit: zero vulnerabilities.
- Playwright/Chromium: 360, 390, 768, 1024, and 1440px widths, no horizontal overflow. Local fonts loaded; one h1; valid anchor destinations; navigation/footer link targets at least 44px high; contact scene ratio 16:9.
- Keyboard Tab exposes the skip link with visible outline; Enter moves focus to main. Work, About, and Contact resolve to the corresponding sections.
- Browser console: zero errors or warnings after reload. Desktop and mobile screenshots visually reviewed.
- Full-page screenshots: `output/playwright/blueprint-{width}.png`. Intro screenshots: `blueprint-desktop-top.png` and `blueprint-mobile-top.png`. Artifacts and one-off browser verification script are ignored by Git.

The original blueprint used only placeholder content. No mobile hardware or browser engines beyond Chromium were used in this pass.

## Placeholder refinement, 2026-10-30

- Rechecked Astro diagnostics (21 files, zero errors/warnings/hints) and production build successfully.
- Checked 360, 390, 540, 768, 1024, 1440px: no horizontal overflow, one visible name placeholder in the hero, valid anchor links, navigation targets at least 44px in both dimensions.
- Confirmed desktop sticky capsule and mobile bottom dock, compact three-column footer, multi-window collection reflow, and anchor headings clear of the sticky navigation.
- Keyboard: skip link moves focus to main; dock Home link receives visible focus.
- Visually reviewed desktop header and collection, mobile header/dock and footer. Updated screenshots: `output/playwright/refined-{home,windows,footer,page}-{390,1440}.png`.

## Hero content pass, 2026-10-30

- `npm run check`: 22 files, zero errors, warnings, or hints. Production build passed.
- Verified 360, 390, 768, 1024, and 1440px with no horizontal overflow, one display-name occurrence in the body, correct January 2027 time value, and all hero links at least 44px tall.
- Résumé served locally with HTTP 200 and application/pdf content type. The PDF is an unchanged copy of the user-supplied version, awaiting a future update.
- Email and LinkedIn destinations match the supplied CV. External account ownership and mail delivery were not tested; no messages sent.
- Keyboard navigation reaches the primary CTA with visible focus. Contact navbar anchor resolves correctly. Desktop/mobile hero screenshots reviewed: `output/playwright/hero-{1440,390}.png`.

## Horizontal content pass, 2026-10-30

- Astro check: 24 files, zero errors/warnings/hints. Production build passed.
- Chromium at 360, 390, 768, 1024, 1440px: no horizontal overflow; four projects in user order, four experience rows, education section, four highlights, one body occurrence of the display name, valid anchor destinations.
- Contact email actions resolve to the supplied address and are at least 44px high. Work/Contact navigation verified. No messages sent.
- Desktop/mobile project and mobile contact screenshots visually reviewed. Browser console: zero errors/warnings.
- Screenshots: `output/playwright/horizontal-{projects,contact,page}-{390,1440}.png`.

## GitHub, favicon, and guestbook preview, 2026-10-30

- Astro check: 26 files, zero errors/warnings/hints. Production build: two static routes, passed. Production dependency audit: zero vulnerabilities.
- GitHub GraphQL: calendar snapshot validates 365 contiguous dates and a sum of 270 contributions. October 2026 subtotal: 46. Data is explicitly dated and manually refreshed, not advertised as live.
- Homepage and guestbook checked at 360, 390, 768, 1024, 1440px: no document overflow, one h1 per route, no missing local anchor targets, navigation targets at least 44px square. Calendar overflow is contained in a keyboard-focusable scroll region; mobile opens on the most recent days.
- Hidden sections absent: Open source, Notes, Off the clock. Public GitHub/source/Credly footer destinations match the supplied URLs.
- Anonymous preview opens, focuses Name, accepts text, closes with Back, and restores toggle focus. Reload clears preview values. Sign-in/post buttons remain disabled; zero POST requests or page errors during the tests.
- Cross-page guestbook and homepage Work/Contact navigation verified; keyboard skip link and anonymous toggle have visible focus. Favicons in PNG/ICO sizes and supplied PDF return HTTP 200.
- Desktop/mobile guestbook, expanded form, and activity screenshots visually reviewed. Browser console: zero errors/warnings. Artifacts: `output/playwright/{guestbook,guestbook-form,github-activity}-{390,1440}.png`.
- Initial source repository checked empty before upload. Local Git commit/push is explicitly authorized by the user; no hosting deployment is part of this work.

## Navigation vertical pass, 2026-10-30

- Inspected Rimzz navigation state/direction source and exercised the live page using Playwright: top at 0px, hidden at 300px downward, pill at 220px upward, hidden at 600px downward. Implemented the same 64px initial threshold and 8px direction tolerance with original Astro/TypeScript components.
- At 360/390/768/1024/1440px verified top → hidden → pill states, small-scroll tolerance, edge blur, menu visibility during scroll, menu placement within viewport, Escape close, theme switching, and no horizontal overflow.
- Layout widths 880/1040px verified; theme/layout/motion survive navigation to guestbook. System reduced motion gives zero transition duration. Tab reveals hidden navigation. Page errors: none.
- Visually reviewed dark desktop top/pill/settings and mobile settings. Screenshots: `output/playwright/navbar-{top,pill,settings}-{390,1440}.png`.
- Astro check: 30 files, zero errors/warnings/hints. Production build: two routes, passed. Language selection is intentionally not presented without translated content.
## Color system hardening, 2026-10-31
- Tokens: `color-scheme` is `light` on `:root` and `dark` under `[data-theme='dark']`, so native scrollbars, the textarea resize grip and form controls follow the theme. No `<meta name="color-scheme">`, because the site defaults to light. The three remaining hardcoded shadows now use `--shadow-nav`, `--shadow-dock` and `--shadow-panel`. Unused aliases `--color-background` and `--color-nav` were removed.
- Contrast (WCAG formula): muted text 5.44/4.94/4.58 on bg/surface/surface-hover in light, 7.50/6.67/5.86 in dark. `--color-border-interactive` is now `#85827A` in both themes: 3.65/3.31/3.07 in light, 4.06/3.61/3.17 in dark, so input borders and radio rings meet 3:1. Focus ring: 6.06/5.50 light, 7.75/6.89 dark. Placeholders use the muted token, 5.44 light and 7.50 dark on the input background (the browser default was 4.38 and 3.38).
- Nav pill: `--color-nav-bg` alpha raised from 85% to 92%. In the worst case, a solid opposite-tone backdrop, muted labels are 4.67:1 light and 5.27:1 dark, up from 4.10 and 4.29. In rendered samples on the production preview, the darkest or lightest backdrop pixel behind the labels was at least 4.67:1 at 390 and 1440 in both themes.
- Disabled guestbook buttons use disabled tokens instead of `opacity: 0.45`: muted text on surface-hover, 4.58 light and 5.86 dark. The settings-panel hover now uses `--color-surface-hover`, because the old hover color matched the panel background.
- Calendar levels 0–1 are below 3:1 against the page (1.19/1.61 light, 1.13/2.08 dark). This is accepted: the same data is in the per-day titles, the SVG title/description and the "Activity by month" text.
- Spellcheck: removed `spellcheck="false"` from `<body>`, where it only disabled spellcheck in the guestbook fields. The Name and Website inputs opt out; the Message textarea keeps spellcheck.
- First paint: with a stored dark theme, `data-theme` is already `dark` when `<body>` is parsed and at the first animation frame, with a `#242420` background and a dark color scheme, on both dev and preview.
- The red fringes on the hero name in headless desktop screenshots are LCD subpixel antialiasing. At DPR 1 there are about 400–470 reddish edge pixels plus a matching number of bluish ones. With `--disable-lcd-text`, and at DPR 3 mobile, there are 0. The computed color is correct, so no code change was made.
- Chromium at 360/390/768/1024/1440, both routes, both themes, on dev with cache-busted loads and on the production preview: no overflow, one h1, zero console errors or warnings, no failed requests. Astro check: 33 files, zero errors/warnings/hints. Production build passed. Screenshots: `output/playwright/overnight-phase1-*.png`.
## Smooth scrolling hardening, 2026-10-31
- Fixed wheel traps. Over the contribution calendar, 5 vertical wheel ticks moved the page 0px at 768 and 1440, because `data-lenis-prevent` plus the `overscroll-behavior: contain` in lenis.css stopped both Lenis and native chaining. The calendar now uses `data-lenis-prevent-horizontal`: vertical wheel input scrolls the page (500px for 5 ticks) and sideways input still scrolls the calendar (scrollLeft 0 → 360, page unmoved). Over the guestbook message field the page moved 0px whether the field was empty or scrolled to its end; `#guest-message` now sets `overscroll-behavior: auto`, so the field scrolls first and then the page continues (empty: 400px; 30 lines: field to its end, then page to the bottom).
- Re-enabling Lenis (Animation Off → System/On, OS reduced motion turned off, or resizing back above 768px) no longer jumps to the URL hash target. Lenis lands the hash only if it starts during the page-load check; if it was off at load, the browser already landed the hash natively. Measured before the fix: 1310 → 2906px and 3206 → 2906px. A follow-up covered pages loaded with Lenis off (stored Off, OS reduced motion, 700px viewport), then a native Work click, a scroll to the bottom, and a later enable: before, the page jumped back to `#projects` (4110 → 1282px) and focus moved there; now the position holds (4110px; the 700px → 1440px case clamps 4217 → 4110px because the page gets shorter) and focus stays put. A direct `/#contributions` load with Lenis on still lands at 104px with focus on the section.
- Clicking the current anchor again replaces the history entry instead of adding one, like native same-fragment navigation.
- Lenis runs with `respectReducedMotion: false`, because it only exists while `html[data-motion]` is `full`, which already includes OS reduced motion under System. With an explicit On under OS reduced motion, anchor clicks now glide and land at the section offset like wheel input. Before, they jumped, and in one run they landed at the page bottom.
- Rechecked, unchanged: Home/Work/Activity land 104px below the top with the hash updated and focus on the section. Navbar states do not flicker during glides. Cross-page `/guestbook/` → `/#projects`, direct `/#contributions` loads (104px desktop, 24px mobile), Back/Forward, and the skip link (lands within 2 frames) all work. PageDown/Space/PageUp/End/Home work with Lenis active. The settings panel scrolls internally at 1440×420 without moving the page. Switching Animation mid-wheel or mid-glide, 5 rapid Off/On toggles, and resizing across 768px leave no jump, no `lenis*` classes, no overflow lock, and exactly one wheel listener while active (0 when off). OS reduced motion under System removes Lenis live.
- Chromium on dev (cache-busted) and on the production preview, 360/390/768/1024/1440, both routes, both themes: zero console errors or warnings, no failed requests, no non-GET requests, no overflow. Wheel input is synthetic (CDP), so physical trackpad and touch inertia were not reproduced. Astro check: 33 files, zero errors/warnings/hints. Production build passed. Screenshots: `output/playwright/overnight-phase2-*.png`.
## Responsive polish, 2026-10-31
- Baseline at 360/390/768/1024/1440, both routes, both themes: no overflow, one h1, no target under 44px, no text clipped (except the visually hidden dock labels), no heading squeezed by right-hand metadata in Default, Wide or Wider. The remaining issues were inconsistencies between components, fixed with shared rules in `global.css`.
- Focus: one ring for every link, button, field, summary and scroll region (`--focus-ring`, `--focus-offset: 2px`). Before, offsets were 5px (links), 4px (guestbook, calendar) and 2px (settings); at 5px the desktop "Work" ring ran into the "Home" label and the mobile dock ring went past the dock edge. Settings radios keep the ring on the whole row.
- Section intros: the contribution total uses `.section-description`, so it sits 12px under its heading like the Projects and Guestbook intros (it was 16px).
- List rows: Experience, Projects, Education and Highlights share one heading row (`.row-heading` / `.placeholder-row`): 24px between title and metadata, 2px when stacked below 768px (it was 2px, 4px or 8px), and 20px row padding (Projects had 22px).
- Buttons: the hero and contact actions share `.button`, `.button-primary` and `.button-secondary`. The contact "Email me" button lost the stray border that the hero "Get in touch" button never had.
- Guestbook: the composer uses the 12px panel radius (was 20px). With the form open, its top padding is 16px on mobile and 20px on desktop, matching the sides (it was 32px and 36px because a margin stayed after the actions row was hidden). The page bottom padding uses `--section-gap` (same 80/48px values).
- After the changes, Chromium on dev (cache-busted) and on the production preview, both routes, both themes, 360/390/768/1024/1440: no overflow, one h1, no target under 44px, zero console errors or warnings, no failed requests, no non-GET requests. Keyboard: the skip link appears at 12px from the top; Escape closes settings and restores focus; the guestbook form focuses Name, Back restores the toggle, and reload clears the fields. Astro check: 33 files, zero errors/warnings/hints. Production build passed. Screenshots: `output/playwright/overnight-phase3-*.png`.
