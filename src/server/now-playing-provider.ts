// Provider selection for GET /api/now-playing, kept free of `astro:env` so it is unit-testable.
// Last.fm wins when its two vars are set (free API, no premium requirement); then the full
// Spotify refresh-token flow; otherwise 503 not_configured.
import { json } from './http';
import { createNowPlaying } from './now-playing';
import { createLastfm } from './lastfm';

export interface ProviderEnv {
  LASTFM_API_KEY?: string;
  LASTFM_USERNAME?: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  SPOTIFY_REFRESH_TOKEN?: string;
}

const set = (value?: string) => Boolean(value?.trim());

export type Provider = 'lastfm' | 'spotify' | 'none';

export function selectProvider(env: ProviderEnv): Provider {
  if (set(env.LASTFM_API_KEY) && set(env.LASTFM_USERNAME)) return 'lastfm';
  if (set(env.SPOTIFY_CLIENT_ID) && set(env.SPOTIFY_CLIENT_SECRET) && set(env.SPOTIFY_REFRESH_TOKEN)) return 'spotify';
  return 'none';
}

/** Builds the single per-process handler for the selected provider. */
export function createNowPlayingHandler(env: ProviderEnv): () => Promise<Response> {
  switch (selectProvider(env)) {
    case 'lastfm':
      return createLastfm({ config: { apiKey: env.LASTFM_API_KEY, username: env.LASTFM_USERNAME } });
    case 'spotify':
      return createNowPlaying({ config: { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET, refreshToken: env.SPOTIFY_REFRESH_TOKEN } });
    default:
      return () => Promise.resolve(json(503, { ok: false, code: 'not_configured' }));
  }
}
