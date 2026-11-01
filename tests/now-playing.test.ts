import { describe, expect, it, vi } from 'vitest';
import { createNowPlaying, mapTrack as mapSpotifyTrack } from '../src/server/now-playing';
import { createLastfm, mapTrack as mapLastfmTrack } from '../src/server/lastfm';
import { selectProvider } from '../src/server/now-playing-provider';

const config = { clientId: 'cid', clientSecret: 'csecret', refreshToken: 'rtoken' };

const track = (name = 'Song') => ({
  type: 'track',
  name,
  external_urls: { spotify: 'https://open.spotify.com/track/t1' },
  artists: [{ name: 'Artist', external_urls: { spotify: 'https://open.spotify.com/artist/a1' } }],
  album: {
    name: 'Album',
    external_urls: { spotify: 'https://open.spotify.com/album/b1' },
    images: [{ url: 'https://i.scdn.co/image/640', width: 640 }, { url: 'https://i.scdn.co/image/300', width: 300 }, { url: 'https://i.scdn.co/image/64', width: 64 }],
  },
});

/** Mocked Spotify: token endpoint plus currently-playing / recently-played responses. */
function spotify({ current, recent, tokenStatus = 200 }: { current?: Response; recent?: Response; tokenStatus?: number }) {
  return vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    if (href.startsWith('https://accounts.spotify.com/api/token')) {
      return Response.json({ access_token: 'secret-access-token', expires_in: 3600 }, { status: tokenStatus });
    }
    if (href.endsWith('/currently-playing')) return current?.clone() ?? new Response(null, { status: 204 });
    if (href.includes('/recently-played')) return recent?.clone() ?? Response.json({ items: [] });
    return new Response(null, { status: 404 });
  });
}

const calls = (fetch: ReturnType<typeof spotify>, part: string) => fetch.mock.calls.filter(([url]) => String(url).includes(part)).length;

describe('GET /api/now-playing', () => {
  it('returns 503 not_configured without credentials and never calls Spotify', async () => {
    const fetch = spotify({});
    const res = await createNowPlaying({ config: { clientId: 'cid' }, fetch })();
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('not_configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps a playing track to minimal Spotify-linked fields without token data', async () => {
    const fetch = spotify({ current: Response.json({ is_playing: true, item: track() }) });
    const res = await createNowPlaying({ config, fetch })();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=30, stale-while-revalidate=60');
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      status: 'playing',
      source: 'spotify',
      track: {
        name: 'Song',
        url: 'https://open.spotify.com/track/t1',
        artists: [{ name: 'Artist', url: 'https://open.spotify.com/artist/a1' }],
        album: { name: 'Album', url: 'https://open.spotify.com/album/b1', image: 'https://i.scdn.co/image/300' },
      },
    });
    expect(text).not.toMatch(/token|secret|rtoken|csecret/i);
    expect(calls(fetch, '/recently-played')).toBe(0);
  });

  it('falls back to recently played when nothing (or no track) is playing', async () => {
    const recent = Response.json({ items: [{ track: track('Old song'), played_at: '2026-10-31T10:00:00.000Z' }] });
    for (const current of [undefined, Response.json({ is_playing: true, item: { type: 'episode', name: 'Podcast' } })]) {
      const res = await createNowPlaying({ config, fetch: spotify({ current, recent }) })();
      const body = await res.json();
      expect(body.status).toBe('recent');
      expect(body.track.name).toBe('Old song');
      expect(body.playedAt).toBe('2026-10-31T10:00:00.000Z');
    }
  });

  it('returns status none when there is no listening history', async () => {
    const res = await createNowPlaying({ config, fetch: spotify({}) })();
    expect(await res.json()).toEqual({ status: 'none', source: 'spotify' });
  });

  it('keeps every named artist, with url null unless it is an open.spotify.com link', () => {
    const artists = [
      { name: 'No link' },
      { name: 'Script', external_urls: { spotify: 'javascript:alert(1)' } },
      { name: 'Elsewhere', external_urls: { spotify: 'https://evil.example/artist/a1' } },
      { name: '', external_urls: { spotify: 'https://open.spotify.com/artist/nameless' } },
      { name: 'Linked', external_urls: { spotify: 'https://open.spotify.com/artist/a2' } },
    ];
    expect(mapSpotifyTrack({ ...track(), artists })?.artists).toEqual([
      { name: 'No link', url: null },
      { name: 'Script', url: null },
      { name: 'Elsewhere', url: null },
      { name: 'Linked', url: 'https://open.spotify.com/artist/a2' },
    ]);
  });

  it('keeps a track without artist metadata, but still requires its own track and album links', () => {
    expect(mapSpotifyTrack({ ...track(), artists: undefined })?.artists).toEqual([]);
    expect(mapSpotifyTrack({ ...track(), artists: undefined, external_urls: {} })).toBeNull();
    expect(mapSpotifyTrack({ ...track(), album: { ...track().album, external_urls: { spotify: 'https://evil.example/album' } } })).toBeNull();
  });

  it('caches the access token until expiry and the response for 30 s', async () => {
    let time = 1_000_000;
    const fetch = spotify({ current: Response.json({ is_playing: true, item: track() }) });
    const handle = createNowPlaying({ config, fetch, now: () => time });

    await handle();
    await handle();
    expect(calls(fetch, '/currently-playing')).toBe(1); // response cache

    time += 31_000;
    await handle();
    expect(calls(fetch, '/currently-playing')).toBe(2);
    expect(calls(fetch, 'accounts.spotify.com')).toBe(1); // token still valid

    time += 3600_000;
    await handle();
    expect(calls(fetch, 'accounts.spotify.com')).toBe(2); // refreshed after expiry
    const init = (fetch.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(String(init.body)).toContain('grant_type=refresh_token');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('cid:csecret')}`);
  });

  it('returns 502 without details when Spotify fails or times out', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failures = [
      spotify({ tokenStatus: 400 }),
      spotify({ current: new Response('boom', { status: 500 }) }),
      vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); }),
    ];
    for (const fetch of failures) {
      const res = await createNowPlaying({ config, fetch })();
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ ok: false, code: 'upstream_error' });
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/secret-access-token|rtoken|csecret/);
    warn.mockRestore();
  });
});

describe('now-playing provider selection', () => {
  const spotifyEnv = { SPOTIFY_CLIENT_ID: 'cid', SPOTIFY_CLIENT_SECRET: 'csecret', SPOTIFY_REFRESH_TOKEN: 'rtoken' };

  it('prefers Last.fm when its vars are set, even alongside working-looking Spotify vars', () => {
    expect(selectProvider({ ...spotifyEnv, LASTFM_API_KEY: 'key', LASTFM_USERNAME: 'listener' })).toBe('lastfm');
  });

  it('falls back to Spotify when only the Spotify vars are set', () => {
    expect(selectProvider(spotifyEnv)).toBe('spotify');
  });

  it('is not_configured when neither provider is fully set', () => {
    expect(selectProvider({ LASTFM_API_KEY: 'key', SPOTIFY_CLIENT_ID: 'cid' })).toBe('none');
    expect(selectProvider({})).toBe('none');
  });
});

const lastfmConfig = { apiKey: 'key', username: 'listener' };

const lfmTrack = (over: Record<string, unknown> = {}) => ({
  name: 'Song',
  url: 'https://www.last.fm/music/Artist/_/Song',
  artist: { name: 'Artist', url: 'https://www.last.fm/music/Artist' },
  album: { '#text': 'Album' },
  image: [
    { size: 'large', '#text': 'https://lastfm.freetls.fastly.net/i/u/174s/large.jpg' },
    { size: 'extralarge', '#text': 'https://lastfm.freetls.fastly.net/i/u/300x300/xl.jpg' },
  ],
  ...over,
});

/** Mocked Last.fm recent-tracks endpoint. */
function lastfm(body: unknown, status = 200) {
  return vi.fn(async (_url: string | URL | Request) => (body instanceof Response ? body.clone() : Response.json(body as Record<string, unknown>, { status })));
}

describe('Last.fm now-playing adapter', () => {
  it('returns 503 not_configured without api key or username and never calls Last.fm', async () => {
    const fetch = lastfm({});
    const res = await createLastfm({ config: { apiKey: 'key' }, fetch })();
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('not_configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps a now-playing track with www.last.fm links and the extralarge image', async () => {
    const fetch = lastfm({ recenttracks: { track: [{ ...lfmTrack(), '@attr': { nowplaying: 'true' } }] } });
    const res = await createLastfm({ config: lastfmConfig, fetch })();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=30, stale-while-revalidate=60');
    const body = await res.json();
    expect(body).toEqual({
      status: 'playing',
      source: 'lastfm',
      track: {
        name: 'Song',
        url: 'https://www.last.fm/music/Artist/_/Song',
        artists: [{ name: 'Artist', url: 'https://www.last.fm/music/Artist' }],
        album: { name: 'Album', url: 'https://www.last.fm/music/Artist/Album', image: 'https://lastfm.freetls.fastly.net/i/u/300x300/xl.jpg' },
      },
    });
    const key = String((fetch.mock.calls[0] as unknown[])[0]);
    expect(key).toContain('user.getrecenttracks');
    expect(JSON.stringify(body)).not.toContain('key');
  });

  it('reports recent with an ISO playedAt derived from date.uts', async () => {
    const fetch = lastfm({ recenttracks: { track: [lfmTrack({ date: { uts: '1793448000' } })] } });
    const body = await (await createLastfm({ config: lastfmConfig, fetch })()).json();
    expect(body.status).toBe('recent');
    expect(body.source).toBe('lastfm');
    expect(body.playedAt).toBe(new Date(1793448000 * 1000).toISOString());
  });

  it('accepts recenttracks.track as a single object', async () => {
    const fetch = lastfm({ recenttracks: { track: { ...lfmTrack(), '@attr': { nowplaying: 'true' } } } });
    const body = await (await createLastfm({ config: lastfmConfig, fetch })()).json();
    expect(body.status).toBe('playing');
    expect(body.track.name).toBe('Song');
  });

  it('keeps the artist name with url null when its link is missing or unsafe, and still reports the track', async () => {
    for (const artist of [
      { name: 'Artist' },
      { name: 'Artist', url: '' },
      { name: 'Artist', url: 'javascript:alert(1)' },
      { name: 'Artist', url: 'http://www.last.fm/music/Artist' },
      { name: 'Artist', url: 'https://evil.example/music/Artist' },
      { '#text': 'Artist' }, // non-extended form: a name only
    ]) {
      const fetch = lastfm({ recenttracks: { track: [{ ...lfmTrack({ artist }), '@attr': { nowplaying: 'true' } }] } });
      const body = await (await createLastfm({ config: lastfmConfig, fetch })()).json();
      expect(body.status).toBe('playing');
      expect(body.track.url).toBe('https://www.last.fm/music/Artist/_/Song');
      expect(body.track.artists).toEqual([{ name: 'Artist', url: null }]);
    }
  });

  it('maps a track without artist metadata to an empty artist list and invents no album link', () => {
    expect(mapLastfmTrack(lfmTrack({ artist: undefined }))).toEqual({
      name: 'Song',
      url: 'https://www.last.fm/music/Artist/_/Song',
      artists: [],
      album: { name: 'Album', url: 'https://www.last.fm/music/Artist/_/Song', image: 'https://lastfm.freetls.fastly.net/i/u/300x300/xl.jpg' },
    });
    expect(mapLastfmTrack(lfmTrack({ url: 'https://evil.example/music/Artist/_/Song' }))).toBeNull();
  });

  it('treats the default placeholder image as no image', async () => {
    const image = [{ size: 'extralarge', '#text': 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png' }];
    const fetch = lastfm({ recenttracks: { track: [{ ...lfmTrack({ image }), '@attr': { nowplaying: 'true' } }] } });
    const body = await (await createLastfm({ config: lastfmConfig, fetch })()).json();
    expect(body.track.album.image).toBeNull();
  });

  it('treats an HTTP 200 error body (17 = hidden listening) as 502 and logs only the code', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = lastfm({ error: 17, message: 'Login: User required to be logged in' });
    const res = await createLastfm({ config: lastfmConfig, fetch })();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, code: 'upstream_error' });
    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).toContain('17');
    expect(logged).not.toContain('key');
    warn.mockRestore();
  });
});
