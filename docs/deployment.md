# Deploying to Vercel

Production origin: **https://rasyadwaarsya.my.id**. Add **www.rasyadwaarsya.my.id** to the same project; `vercel.json` redirects it permanently to the apex, preserving the path. Do not change nameservers or unrelated email records just to move the website.

## Build and environments

- Framework: Astro; install `npm ci`; build `npm run build`; Node 22.x. Dependencies include the compatible local Node 22.23.4 toolchain.
- Astro uses `@astrojs/vercel`; pages are prerendered and `/api/contact/`, `/api/guestbook/`, `/api/now-playing/` are server functions. `.vercel/output` is the deployment artifact.
- `node scripts/smoke-vercel-runtime.mjs` runs the compiled function with no credentials and external requests disabled, checking missing configuration, missing proxy IP, body caps and origin rejection.
- `node scripts/verify-deployment.mjs` verifies a built preview artifact; pass `--production` for a production artifact.
- `npm run check`, `npm test`, `npm run build`, `npm audit`, then `npm run check:deploy` validate source, behavior, artifact, dependency audit, and production variable shape respectively. `check:deploy` reads only a local untracked `.env`.
- A Vercel production build fails if required variables are missing or obviously unsuitable. This checks configuration shape, not provider validity.
- Only a build with `VERCEL_ENV=production` is indexable. Local/preview builds emit noindex metadata, a disallow-all robots file and an empty sitemap. Production emits index/follow, robots allowing public pages, and a sitemap with the three public pages. Canonical and social URLs always use the apex domain.
- Vercel sets `VERCEL` and `VERCEL_ENV` automatically. Do not override them manually in the dashboard. Local testing can set them temporarily.

## Server variables

Set secret variables in Vercel's environment settings, separately for Production and Preview. Never commit `.env`, examples containing credentials, `.vercel/`, or agent tooling. `.vercelignore` also prevents CLI uploads of these local files.

| Variable | Production use |
| --- | --- |
| `RESEND_API_KEY` | Valid Resend key with email send permission |
| `CONTACT_FROM_EMAIL` | Sender address on your verified Resend domain, e.g. `Portfolio <hello@your-domain>`; sandbox onboarding sender is rejected |
| `CONTACT_TO_EMAIL` | Optional; defaults to the portfolio owner's email in profile data |
| `GUESTBOOK_DB_URL` | Remote `libsql://` Turso database; local file databases are rejected on Vercel |
| `GUESTBOOK_DB_AUTH_TOKEN` | Token for that database |
| `RATE_LIMIT_SECRET` | Random server secret of at least 32 characters, shared by all instances and kept stable between deployments |
| `LASTFM_API_KEY`, `LASTFM_USERNAME` | Recommended music integration; takes precedence over Spotify |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` | Optional alternative music provider |

Generate a rate-limit secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, then put it directly into the local untracked `.env` and Vercel secrets. Do not paste it into logs or commits.

A sending-only Resend key cannot list domains: a `restricted_api_key` response from `/domains` is not proof of an invalid key. Confirm domain status in the Resend dashboard rather than rotating a working sending key.

Missing music credentials yield a neutral music state. Missing/invalid contact or database configuration yields an honest unavailable response rather than a fake submission success.

## Database and abuse protection

Guestbook entries remain pending until approved. Both POST endpoints use an atomic fixed-window limiter in the same Turso database: 3 valid submissions per client address per endpoint per 10 minutes. HMAC keys prevent storing raw addresses; expired rows are deleted during limiter operations. Concurrent serverless instances share the same buckets. A store outage returns 503 and performs no mail/send or note write. Local dev uses the bounded in-process limiter.

The runtime lazily creates `request_limits` and its expiry index with the configured database credential, and creates the guestbook table on first use. Ensure the token allows those operations. Use a separate Preview database and secret; never test writes against real visitor data. Local tests use disposable SQLite databases and mocked mail.

Moderation remains local: load the intended database variables into the shell, then `npm run guestbook:moderate -- list`, `approve <id>`, `reject <id>` or `delete <id>`. There is no public admin endpoint. Back up production data before any manual schema or data change.

## Preview acceptance

1. Deploy a preview from the verified branch, with isolated preview service credentials. Default Vercel deployment protection is preferred. A new Vercel project may require its first deployment to target Production; obtain owner approval for that bootstrap instead of silently promoting a preview. Custom-domain DNS can remain unchanged during bootstrap.
2. Check homepage, guestbook, playground, resume, canonical/social card, robots and sitemap. Preview must remain noindex.
3. Confirm contact rejection/validation and provider health. Send a real owner-controlled test message only with the owner's approval. Confirm guestbook persistence and moderation using a test database, not live messages.
4. Recheck wheel/trackpad scrolling, Home/Work/Activity anchors, Back/Forward, navbar hide/reveal, contribution-calendar horizontal scrolling, modal scroll lock and unlock, theme/language switches, and reduced motion at desktop and mobile sizes.
5. Check Safari/iOS and an Android device before public release; Chromium viewport emulation does not prove physical-device behavior.

## Production launch and rollback

1. Merge the reviewed release changes into the chosen production branch, then configure that branch in Vercel. Keep a known-good deployment available for rollback.
2. Set Production variables and verify the Resend sending domain. Preserve existing MX, SPF, DKIM and verification records; use Resend's exact supplied records for email.
3. Attach both website domains to the project. Use the exact A/CNAME/TXT records shown by Vercel for this project, not copied generic values. Existing DNS provider can remain in place.
4. After DNS verification, confirm HTTPS for both names, `www` to apex redirects, path/query preservation, production robots/canonical/sitemap, contact, guestbook and music.
5. Inspect Vercel function logs for errors without logging messages, credentials or visitor identity. Roll back through Vercel Deployments if launch checks fail; database data should remain separate from the code rollback.

Sources: [Astro Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/), [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
