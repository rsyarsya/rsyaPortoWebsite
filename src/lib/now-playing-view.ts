// Validation and view model for the footer listening widget (src/scripts/now-playing.ts).
// Kept free of the DOM so vitest can cover it. Links must be https://www.last.fm/ (Last.fm
// source) or https://open.spotify.com/ (Spotify source); anything else never becomes an href.

export type Source = 'lastfm' | 'spotify';
/** An artist credit; `href` is null when there is no safe link, so the name renders as plain text. */
export type Artist = { name: string; href: string | null };
export type Track = { name: string; url: string; artists: Artist[]; album: { name: string; url: string; image: string | null } };
export type NowPlaying =
  | { status: 'playing'; source: Source; track: Track }
  | { status: 'recent'; source: Source; track: Track; playedAt: string }
  | { status: 'none'; source: Source };

/** Artist line text when a track has no artist credit at all. */
export const NO_ARTIST = 'Artist unavailable';

const LINK_PREFIX: Record<Source, string> = { lastfm: 'https://www.last.fm/', spotify: 'https://open.spotify.com/' };

/** The URL if it points to the source's own site over https, otherwise null. */
export function safeLink(source: Source, url: unknown): string | null {
  return typeof url === 'string' && url.startsWith(LINK_PREFIX[source]) ? url : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

/** A track needs its own name, link and album link; artists are optional and each needs a non-empty name. */
function parseTrack(t: Raw, source: Source): Track | null {
  const url = safeLink(source, t?.url);
  const albumUrl = safeLink(source, t?.album?.url);
  const image = t?.album?.image;
  if (typeof t?.name !== 'string' || !url || typeof t.album?.name !== 'string' || !albumUrl) return null;
  if (image !== null && !(typeof image === 'string' && image.startsWith('https://'))) return null;
  const artists: Artist[] = (Array.isArray(t.artists) ? t.artists : [])
    .filter((artist: Raw) => typeof artist?.name === 'string' && artist.name.trim() !== '')
    .map((artist: Raw) => ({ name: artist.name, href: safeLink(source, artist.url) }));
  return { name: t.name, url, artists, album: { name: t.album.name, url: albumUrl, image } };
}

/** Parses a GET /api/now-playing body; null when it cannot be shown safely. */
export function parseNowPlaying(body: Raw): NowPlaying | null {
  const source: Source = body?.source === 'lastfm' ? 'lastfm' : 'spotify';
  if (body?.status === 'none') return { status: 'none', source };
  if (body?.status !== 'playing' && body?.status !== 'recent') return null;
  const track = parseTrack(body.track, source);
  if (!track) return null;
  if (body.status === 'playing') return { status: 'playing', source, track };
  if (typeof body.playedAt !== 'string' || Number.isNaN(Date.parse(body.playedAt))) return null;
  return { status: 'recent', source, track, playedAt: body.playedAt };
}

export const attribution = (source: Source) => (source === 'lastfm' ? 'via Last.fm' : 'on Spotify');
export const sourceName = (source: Source) => (source === 'lastfm' ? 'Last.fm' : 'Spotify');
