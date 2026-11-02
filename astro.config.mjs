import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

// Pages stay prerendered (static). Only routes that set `prerender = false`
// (src/pages/api/*) run on the server through the Vercel adapter.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://rasyadwaarsya.my.id',
  trailingSlash: 'always',
  output: 'static',
  adapter: vercel({ maxDuration: 30 }),
  session: false,
  devToolbar: { enabled: false },
  env: {
    // Read at runtime on the server only; never inlined into client code.
    schema: {
      RATE_LIMIT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      // libSQL: Turso `libsql://…` + token in production, `file:.data/guestbook.db` locally.
      GUESTBOOK_DB_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      GUESTBOOK_DB_AUTH_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Spotify refresh-token flow for /api/now-playing (token from `npm run spotify:auth`).
      SPOTIFY_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      SPOTIFY_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      SPOTIFY_REFRESH_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Last.fm free API for /api/now-playing; takes precedence over Spotify when both are set.
      LASTFM_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      LASTFM_USERNAME: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
