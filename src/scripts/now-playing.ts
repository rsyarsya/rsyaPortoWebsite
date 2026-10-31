// Footer listening widget: reads GET /api/now-playing once the footer is near the
// viewport, then refreshes about every 60 s while the tab is visible. No audio.
// Data is rendered with textContent/attributes only; links must be open.spotify.com
// (Spotify source) or www.last.fm (Last.fm source).

type Source = 'lastfm' | 'spotify';
type Link = { name: string; url: string };
type Track = { name: string; url: string; artists: Link[]; album: { name: string; url: string; image: string | null } };
type Data =
  | { status: 'playing'; source: Source; track: Track }
  | { status: 'recent'; source: Source; track: Track; playedAt: string }
  | { status: 'none'; source: Source };

const REFRESH_MS = 60_000;
const root = document.querySelector<HTMLElement>('[data-now-playing]');

const isLink = (source: Source) => (url: unknown): url is string =>
  typeof url === 'string'
  && url.startsWith(source === 'lastfm' ? 'https://www.last.fm/' : 'https://open.spotify.com/');
const isTrack = (t: any, source: Source): t is Track => {
  const ok = isLink(source);
  return t && typeof t.name === 'string' && ok(t.url)
    && Array.isArray(t.artists) && t.artists.length > 0 && t.artists.every((a: any) => typeof a?.name === 'string' && ok(a.url))
    && typeof t.album?.name === 'string' && ok(t.album.url)
    && (t.album.image === null || (typeof t.album.image === 'string' && t.album.image.startsWith('https://')));
};

function parse(body: any): Data | null {
  const source: Source = body?.source === 'lastfm' ? 'lastfm' : 'spotify';
  if (body?.status === 'none') return { status: 'none', source };
  if (body?.status === 'playing' && isTrack(body.track, source)) return { status: 'playing', source, track: body.track };
  if (body?.status === 'recent' && isTrack(body.track, source) && !Number.isNaN(Date.parse(body.playedAt))) {
    return { status: 'recent', source, track: body.track, playedAt: body.playedAt };
  }
  return null;
}

const attribution = (source: Source) => (source === 'lastfm' ? 'via Last.fm' : 'on Spotify');
const sourceName = (source: Source) => (source === 'lastfm' ? 'Last.fm' : 'Spotify');

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
function ago(iso: string): string {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return 'just now';
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    seconds < 3600 ? [Math.floor(seconds / 60), 'minute']
    : seconds < 86_400 ? [Math.floor(seconds / 3600), 'hour']
    : seconds < 2_592_000 ? [Math.floor(seconds / 86_400), 'day']
    : [Math.floor(seconds / 2_592_000), 'month'];
  // "12 min. ago" -> "12 min ago"
  return rtf.format(-value, unit).replace(/\.(?=\s|$)/g, '');
}

if (root) {
  const art = root.querySelector<HTMLElement>('[data-np-art]')!;
  const label = root.querySelector<HTMLElement>('[data-np-label]')!;
  const title = root.querySelector<HTMLElement>('[data-np-title]')!;
  const sub = root.querySelector<HTMLElement>('[data-np-sub]')!;
  const disc = art.innerHTML;

  let last: Data | null = null;
  let timer = 0;
  let lastFetch = 0;
  let stopped = false;
  let started = false;

  const link = (href: string, text: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  };

  function showTrack(track: Track, heading: string, source: Source) {
    const a = document.createElement('a');
    a.href = track.album.url;
    a.className = 'np-art-link';
    if (track.album.image) {
      const img = document.createElement('img');
      img.src = track.album.image;
      img.width = 52;
      img.height = 52;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = `Album: ${track.album.name || track.name}`;
      a.append(img);
    } else {
      a.setAttribute('aria-label', `Album: ${track.album.name || track.name}`);
      a.innerHTML = disc;
    }
    art.replaceChildren(a);
    label.textContent = `${heading} ${attribution(source)}`;
    title.replaceChildren(link(track.url, track.name));
    sub.replaceChildren(...track.artists.flatMap((artist, i) => (i ? [', ', link(artist.url, artist.name)] : [link(artist.url, artist.name)])));
    title.title = track.name;
    sub.title = track.artists.map(artist => artist.name).join(', ');
  }

  function showText(state: string, heading: string, line: string, detail = '') {
    root!.dataset.state = state;
    art.innerHTML = disc;
    label.textContent = heading;
    title.textContent = line;
    sub.textContent = detail;
    title.removeAttribute('title');
    sub.removeAttribute('title');
  }

  function render(data: Data) {
    root!.dataset.state = data.status;
    if (data.status === 'playing') showTrack(data.track, 'Now playing', data.source);
    else if (data.status === 'recent') showTrack(data.track, `Last played ${ago(data.playedAt)}`, data.source);
    else showText('none', sourceName(data.source), 'Not listening right now');
  }

  /** A failed refresh never keeps "Now playing": fall back to last-known wording or the unavailable copy. */
  function fail() {
    if (last?.status === 'playing') {
      root!.dataset.state = 'recent';
      showTrack(last.track, 'Recently played', last.source);
    } else if (last?.status === 'recent') render(last);
    else showText('unavailable', sourceName(last?.source ?? 'spotify'), 'Listening activity unavailable');
  }

  async function refresh() {
    lastFetch = Date.now();
    try {
      const res = await fetch('/api/now-playing', { headers: { Accept: 'application/json' } });
      if (res.status === 503) {
        stopped = true; // not configured: it will not change until the server restarts
        last = null;
        return fail();
      }
      const data = res.ok ? parse(await res.json()) : null;
      if (!data) return fail();
      last = data;
      render(data);
    } catch {
      fail();
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (stopped || document.visibilityState !== 'visible') return;
    const wait = Math.max(0, REFRESH_MS - (Date.now() - lastFetch));
    timer = window.setTimeout(async () => {
      await refresh();
      schedule();
    }, wait);
  }

  document.addEventListener('visibilitychange', () => {
    if (started) schedule();
  });

  showText('loading', 'Spotify', '', '');

  const start = async () => {
    started = true;
    await refresh();
    schedule();
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (document.visibilityState === 'visible') void start();
      else {
        started = true;
        lastFetch = Date.now() - REFRESH_MS; // fetch as soon as the tab becomes visible
      }
    }, { rootMargin: '400px 0px' });
    observer.observe(root);
  } else void start();
}
