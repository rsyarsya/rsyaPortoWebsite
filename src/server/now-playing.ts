// Spotify "now playing" adapter for GET /api/now-playing.
// Refresh-token flow, access token cached until expiry, response cached ~30 s.
// Only public track metadata leaves this module; tokens are never returned or logged.
import { json } from './http';

export interface SpotifyConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export interface NowPlayingOptions {
  config: SpotifyConfig;
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

/** An artist credit. `url` is null when the provider gave no safe link; the name is still shown, as plain text. */
export interface Artist {
  name: string;
  url: string | null;
}

export interface Track {
  name: string;
  url: string;
  artists: Artist[];
  album: { name: string; url: string; image: string | null };
}

export type Source = 'lastfm' | 'spotify';

export type NowPlaying =
  | { status: 'playing'; source: Source; track: Track }
  | { status: 'recent'; source: Source; track: Track; playedAt: string }
  | { status: 'none'; source: Source };

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1/me/player';
const RESPONSE_TTL_MS = 30_000;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' };

class UpstreamError extends Error {}

/** Only https://open.spotify.com links are passed through. */
function spotifyLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'open.spotify.com' ? url.href : null;
  } catch {
    return null;
  }
}

function httpsImage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

/** Maps a Spotify track object to the public shape; null for episodes, local files or missing track/album links. */
export function mapTrack(item: Raw): Track | null {
  if (!item || item.type !== 'track' || typeof item.name !== 'string' || !item.name) return null;
  const url = spotifyLink(item.external_urls?.spotify);
  const albumUrl = spotifyLink(item.album?.external_urls?.spotify);
  if (!url || !albumUrl) return null;
  // Every named artist is kept; one without an open.spotify.com link gets url null.
  const artists: Artist[] = (Array.isArray(item.artists) ? item.artists : [])
    .filter((artist: Raw) => typeof artist?.name === 'string' && artist.name)
    .map((artist: Raw) => ({ name: artist.name, url: spotifyLink(artist.external_urls?.spotify) }));

  // Smallest image that is still sharp at 2x the 52 px widget, otherwise the largest available.
  const images = (Array.isArray(item.album?.images) ? item.album.images : [])
    .filter((image: Raw) => httpsImage(image?.url))
    .sort((a: Raw, b: Raw) => (a.width ?? 0) - (b.width ?? 0));
  const image = images.find((img: Raw) => (img.width ?? 0) >= 104) ?? images.at(-1);

  return {
    name: item.name,
    url,
    artists,
    album: { name: typeof item.album?.name === 'string' ? item.album.name : '', url: albumUrl, image: image?.url ?? null },
  };
}

export function createNowPlaying({ config, fetch: fetcher = fetch, now = Date.now, timeoutMs = 5000 }: NowPlayingOptions) {
  let token: { value: string; expiresAt: number } | null = null;
  let cached: { body: NowPlaying; expiresAt: number } | null = null;
  let inflight: Promise<NowPlaying> | null = null;

  const signal = () => AbortSignal.timeout(timeoutMs);

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > now()) return token.value;
    const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
    const res = await fetcher(TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: config.refreshToken ?? '' }).toString(),
      signal: signal(),
    });
    if (!res.ok) throw new UpstreamError(`token ${res.status}`);
    const data = await res.json();
    if (typeof data?.access_token !== 'string') throw new UpstreamError('token shape');
    const ttl = Number(data.expires_in) > 0 ? Number(data.expires_in) : 3600;
    token = { value: data.access_token, expiresAt: now() + Math.max(ttl - 60, 30) * 1000 };
    return token.value;
  }

  async function api(path: string): Promise<Raw | null> {
    const res = await fetcher(`${API}${path}`, { headers: { Authorization: `Bearer ${await accessToken()}` }, signal: signal() });
    if (res.status === 401) token = null; // expired or revoked: refresh on the next request
    if (res.status === 204) return null;
    if (!res.ok) throw new UpstreamError(`api ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function load(): Promise<NowPlaying> {
    const current = await api('/currently-playing');
    if (current?.is_playing) {
      const track = mapTrack(current.item);
      if (track) return { status: 'playing', source: 'spotify', track };
    }
    const recent = await api('/recently-played?limit=1');
    const last = recent?.items?.[0];
    const track = mapTrack(last?.track);
    if (track && typeof last.played_at === 'string') return { status: 'recent', source: 'spotify', track, playedAt: last.played_at };
    return { status: 'none', source: 'spotify' };
  }

  return async function handle(): Promise<Response> {
    if (!config.clientId?.trim() || !config.clientSecret?.trim() || !config.refreshToken?.trim()) {
      return json(503, { ok: false, code: 'not_configured' });
    }
    if (cached && cached.expiresAt > now()) return json(200, cached.body, CACHE_HEADERS);
    try {
      inflight ??= load().finally(() => (inflight = null));
      const body = await inflight;
      cached = { body, expiresAt: now() + RESPONSE_TTL_MS };
      return json(200, body, CACHE_HEADERS);
    } catch (error) {
      const reason = error instanceof UpstreamError ? error.message : error instanceof Error ? error.name : 'error';
      console.warn(`[now-playing] Spotify request failed (${reason}).`);
      return json(502, { ok: false, code: 'upstream_error' });
    }
  };
}
