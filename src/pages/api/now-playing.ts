import type { APIRoute } from 'astro';
import {
  LASTFM_API_KEY,
  LASTFM_USERNAME,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
} from 'astro:env/server';
import { createNowPlayingHandler } from '../../server/now-playing-provider';

export const prerender = false;

// One handler per process (its cache lives with it). Last.fm takes precedence over
// Spotify when configured; see src/server/now-playing-provider.ts.
const handle = createNowPlayingHandler({
  LASTFM_API_KEY,
  LASTFM_USERNAME,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
});

export const GET: APIRoute = () => handle();
