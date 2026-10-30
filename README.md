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

Astro 7 generates static HTML. Small client scripts open the guestbook form preview and position the contribution calendar. No backend, CMS, framework renderer, animation package, or hosting integration is required.

## GitHub activity

The homepage renders real contribution data from `src/data/github-contributions.json`. It is a dated snapshot, not a live counter, and builds work offline without GitHub credentials. Refresh it using `gh auth login` and `npm run sync:github`; optionally pass an end date, e.g. `npm run sync:github -- 2026-10-30`. The script validates complete date coverage, levels, and totals before replacing the snapshot. It stores no access token or repository-private details.

## Current boundaries

- Guestbook follows the Rimzz layout with sign-in/anonymous choices and a message area. GitHub login and posting are disabled until the backend pass. Anonymous fields are a preview only: values are never submitted or persisted, and there are no fabricated entries.
- Open source, Notes, and Off the clock are deferred and excluded from the homepage. Their components are retained for later.
- Contact scene and music widget are still placeholders. The résumé is the PDF supplied by the owner, pending a later update.
- Favicon PNG/ICO sizes are derived from the owner's supplied portrait. GitHub/source/Credly links use the owner's supplied public URLs.
- Site remains local-only with `noindex, nofollow`. Pushing source to GitHub does not deploy the site.
