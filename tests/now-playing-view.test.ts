import { describe, expect, it, vi } from 'vitest';
import { attribution, parseNowPlaying, sourceName } from '../src/lib/now-playing-view';
import { createLastfm } from '../src/server/lastfm';
import { createNowPlaying } from '../src/server/now-playing';

const album = { name: 'Album', url: 'https://www.last.fm/music/Artist/Album', image: null };
const lastfmTrack = (artists: unknown) => ({ name: 'Song', url: 'https://www.last.fm/music/Artist/_/Song', artists, album });
const playing = (track: unknown, source = 'lastfm') => ({ status: 'playing', source, track });
const artistsOf = (body: unknown) => {
  const data = parseNowPlaying(body);
  return data && data.status !== 'none' ? data.track.artists : 'rejected';
};

describe('now-playing widget parsing', () => {
  it('keeps a valid track whose artist has no link; the name becomes plain text (href null)', () => {
    expect(parseNowPlaying(playing(lastfmTrack([{ name: 'Artist', url: null }])))).toEqual({
      status: 'playing',
      source: 'lastfm',
      track: { name: 'Song', url: 'https://www.last.fm/music/Artist/_/Song', artists: [{ name: 'Artist', href: null }], album },
    });
    expect(artistsOf(playing(lastfmTrack([{ name: 'Artist' }])))).toEqual([{ name: 'Artist', href: null }]);
  });

  it('never turns an unsafe or foreign artist URL into an href', () => {
    const artists = [
      { name: 'Script', url: 'javascript:alert(1)' },
      { name: 'Data', url: 'data:text/html,<b>x</b>' },
      { name: 'Plain http', url: 'http://www.last.fm/music/Artist' },
      { name: 'Lookalike', url: 'https://www.last.fm.evil.example/music/Artist' },
      { name: 'Other provider', url: 'https://open.spotify.com/artist/a1' },
    ];
    expect(artistsOf(playing(lastfmTrack(artists)))).toEqual(artists.map(({ name }) => ({ name, href: null })));
  });

  it('accepts a track without artist metadata and drops artist entries without a name', () => {
    for (const artists of [undefined, null, [], 'Artist', [{ name: '' }, { name: '   ' }, { name: 42 }, null]]) {
      expect(artistsOf(playing(lastfmTrack(artists)))).toEqual([]);
    }
  });

  it('still rejects a track whose own link, album link or artwork is unsafe', () => {
    const artists = [{ name: 'Artist', url: 'https://www.last.fm/music/Artist' }];
    expect(parseNowPlaying(playing({ ...lastfmTrack(artists), url: 'javascript:alert(1)' }))).toBeNull();
    expect(parseNowPlaying(playing({ ...lastfmTrack(artists), album: { ...album, url: 'https://evil.example/' } }))).toBeNull();
    expect(parseNowPlaying(playing({ ...lastfmTrack(artists), album: { ...album, image: 'http://lastfm.freetls.fastly.net/x.jpg' } }))).toBeNull();
    expect(parseNowPlaying({ status: 'recent', source: 'lastfm', track: lastfmTrack(artists), playedAt: 'yesterday' })).toBeNull();
    expect(parseNowPlaying({ status: 'paused', source: 'lastfm' })).toBeNull();
  });

  it('keeps the source and its attribution', () => {
    expect(parseNowPlaying({ status: 'none', source: 'lastfm' })).toEqual({ status: 'none', source: 'lastfm' });
    expect(parseNowPlaying({ status: 'none' })).toEqual({ status: 'none', source: 'spotify' });
    expect([attribution('lastfm'), attribution('spotify')]).toEqual(['via Last.fm', 'on Spotify']);
    expect([sourceName('lastfm'), sourceName('spotify')]).toEqual(['Last.fm', 'Spotify']);
  });
});

describe('backend → widget contract', () => {
  const lastfmItem = (artist: unknown) => ({
    name: 'Song',
    url: 'https://www.last.fm/music/Artist/_/Song',
    artist,
    album: { '#text': 'Album' },
    image: [{ size: 'extralarge', '#text': 'https://lastfm.freetls.fastly.net/i/u/300x300/xl.jpg' }],
    '@attr': { nowplaying: 'true' },
  });
  const viaLastfm = async (artist: unknown) => {
    const fetch = vi.fn(async () => Response.json({ recenttracks: { track: [lastfmItem(artist)] } }));
    return parseNowPlaying(await (await createLastfm({ config: { apiKey: 'key', username: 'listener' }, fetch })()).json());
  };
  const spotifyItem = (artists: unknown) => ({
    type: 'track',
    name: 'Song',
    external_urls: { spotify: 'https://open.spotify.com/track/t1' },
    artists,
    album: { name: 'Album', external_urls: { spotify: 'https://open.spotify.com/album/b1' }, images: [{ url: 'https://i.scdn.co/image/300', width: 300 }] },
  });
  const viaSpotify = async (artists: unknown) => {
    const fetch = vi.fn(async (url: string | URL | Request) =>
      String(url).includes('accounts.spotify.com')
        ? Response.json({ access_token: 'access', expires_in: 3600 })
        : Response.json({ is_playing: true, item: spotifyItem(artists) }));
    return parseNowPlaying(await (await createNowPlaying({ config: { clientId: 'cid', clientSecret: 'cs', refreshToken: 'rt' }, fetch })()).json());
  };

  it('shows a normal Last.fm track with linked artist and Last.fm source', async () => {
    expect(await viaLastfm({ name: 'Artist', url: 'https://www.last.fm/music/Artist' })).toEqual({
      status: 'playing',
      source: 'lastfm',
      track: {
        name: 'Song',
        url: 'https://www.last.fm/music/Artist/_/Song',
        artists: [{ name: 'Artist', href: 'https://www.last.fm/music/Artist' }],
        album: { name: 'Album', url: 'https://www.last.fm/music/Artist/Album', image: 'https://lastfm.freetls.fastly.net/i/u/300x300/xl.jpg' },
      },
    });
  });

  it('shows a Last.fm track whose artist link is missing, unsafe or absent instead of "unavailable"', async () => {
    for (const artist of [{ name: 'Artist' }, { name: 'Artist', url: 'javascript:alert(1)' }, { '#text': 'Artist' }]) {
      const data = await viaLastfm(artist);
      expect(data?.status).toBe('playing');
      expect(data?.status === 'playing' && data.track.artists).toEqual([{ name: 'Artist', href: null }]);
    }
    const bare = await viaLastfm(undefined);
    expect(bare?.status === 'playing' && bare.track.artists).toEqual([]);
  });

  it('shows a normal Spotify track exactly as before, and a Spotify artist without a link as text', async () => {
    expect(await viaSpotify([{ name: 'Artist', external_urls: { spotify: 'https://open.spotify.com/artist/a1' } }])).toEqual({
      status: 'playing',
      source: 'spotify',
      track: {
        name: 'Song',
        url: 'https://open.spotify.com/track/t1',
        artists: [{ name: 'Artist', href: 'https://open.spotify.com/artist/a1' }],
        album: { name: 'Album', url: 'https://open.spotify.com/album/b1', image: 'https://i.scdn.co/image/300' },
      },
    });
    const unlinked = await viaSpotify([{ name: 'Local artist' }, { name: 'Linked', external_urls: { spotify: 'https://open.spotify.com/artist/a2' } }]);
    expect(unlinked?.status === 'playing' && unlinked.track.artists).toEqual([
      { name: 'Local artist', href: null },
      { name: 'Linked', href: 'https://open.spotify.com/artist/a2' },
    ]);
  });
});
