// Last.fm "now playing" adapter for GET /api/now-playing.
// Used when LASTFM_API_KEY + LASTFM_USERNAME are set (the owner scrobbles Spotify to
// Last.fm and uses the free Last.fm API). Same response shape, 30 s cache and
// Cache-Control as the Spotify path. The API key is never returned or logged.
import { json } from './http';
import type { NowPlaying, Track } from './now-playing';

export interface LastfmConfig {
  apiKey?: string;
  username?: string;
}

export interface LastfmOptions {
  config: LastfmConfig;
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

const API = 'https://ws.audioscrobbler.com/2.0/';
// Last.fm's "no artwork" placeholder; treated as no image.
const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';
const RESPONSE_TTL_MS = 30_000;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' };

class UpstreamError extends Error {}

/** Only https links on www.last.fm are passed through. */
function lastfmLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'www.last.fm' ? url.href : null;
  } catch {
    return null;
  }
}

/** Any https image URL (the Last.fm CDN host), minus empty strings and the default placeholder. */
function httpsImage(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.includes(PLACEHOLDER)) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Picks a large square image (large/extralarge), or the last usable one. */
function pickImage(images: Raw): string | null {
  if (!Array.isArray(images)) return null;
  const by = (size: string) => images.find((img: Raw) => str(img?.size) === size)?.['#text'];
  const preferred = httpsImage(by('extralarge')) ?? httpsImage(by('large'));
  if (preferred) return preferred;
  for (const img of images) {
    const url = httpsImage(img?.['#text']);
    if (url) return url;
  }
  return null;
}

/** Maps a Last.fm recent-track item to the public Track shape, or null when the name/url are missing. */
export function mapTrack(item: Raw): Track | null {
  const name = str(item?.name);
  const url = lastfmLink(item?.url);
  if (!name || !url) return null;

  // extended=1 gives an artist object with name + url; otherwise a `#text` string.
  const artistName = str(item?.artist?.name) || str(item?.artist?.['#text']);
  const artistUrl = lastfmLink(item?.artist?.url);
  const artists = artistName && artistUrl ? [{ name: artistName, url: artistUrl }] : [];

  const albumName = str(item?.album?.['#text']);
  const albumUrl = albumName
    ? lastfmLink(`https://www.last.fm/music/${encodeURIComponent(artistName)}/${encodeURIComponent(albumName)}`) ?? url
    : url;

  return {
    name,
    url,
    artists,
    album: { name: albumName, url: albumUrl, image: pickImage(item?.image) },
  };
}

export function createLastfm({ config, fetch: fetcher = fetch, now = Date.now, timeoutMs = 5000 }: LastfmOptions) {
  let cached: { body: NowPlaying; expiresAt: number } | null = null;
  let inflight: Promise<NowPlaying> | null = null;

  const signal = () => AbortSignal.timeout(timeoutMs);

  async function load(): Promise<NowPlaying> {
    const params = new URLSearchParams({
      method: 'user.getrecenttracks',
      user: config.username ?? '',
      api_key: config.apiKey ?? '',
      format: 'json',
      limit: '1',
      extended: '1',
    });
    const res = await fetcher(`${API}?${params.toString()}`, { signal: signal() });
    if (!res.ok) throw new UpstreamError(`api ${res.status}`);
    const data = await res.json();

    // Last.fm can answer HTTP 200 with { error, message } (17 = privacy, 10 = bad key, 6 = no user).
    if (data && typeof data.error === 'number') throw new UpstreamError(`error ${data.error}`);

    const raw = data?.recenttracks?.track;
    const items: Raw[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const playing = items.find((item: Raw) => str(item?.['@attr']?.nowplaying) === 'true');
    if (playing) {
      const track = mapTrack(playing);
      if (track) return { status: 'playing', source: 'lastfm', track };
    }

    const past = items.find((item: Raw) => Number(item?.date?.uts) > 0);
    if (past) {
      const track = mapTrack(past);
      if (track) return { status: 'recent', source: 'lastfm', track, playedAt: new Date(Number(past.date.uts) * 1000).toISOString() };
    }

    return { status: 'none', source: 'lastfm' };
  }

  return async function handle(): Promise<Response> {
    if (!config.apiKey?.trim() || !config.username?.trim()) {
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
      console.warn(`[now-playing] Last.fm request failed (${reason}).`);
      return json(502, { ok: false, code: 'upstream_error' });
    }
  };
}
