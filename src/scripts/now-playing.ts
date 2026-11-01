// Footer listening widget: reads GET /api/now-playing once the footer is near the
// viewport, then refreshes about every 60 s while the tab is visible. No audio.
// Validation lives in src/lib/now-playing-view.ts (links must be open.spotify.com for
// the Spotify source or www.last.fm for Last.fm). Data is rendered with
// textContent/attributes only; an artist without a safe link renders as plain text.
import { NO_ARTIST, attribution, parseNowPlaying, sourceName, type NowPlaying as Data, type Source, type Track } from '../lib/now-playing-view';
import { requestJson } from '../lib/request-json';

const REFRESH_MS = 60_000;
const root = document.querySelector<HTMLElement>('[data-now-playing]');

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
  let inFlight: Promise<void> | null = null;

  const link = (href: string, text: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  };

  function showTrack(track: Track, heading: string, source: Source) {
    title.setAttribute('translate', 'no');
    sub.setAttribute('translate', track.artists.length ? 'no' : 'yes');
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
    // Strings become text nodes: artists without a safe link stay plain text.
    const credits = track.artists.map(artist => (artist.href ? link(artist.href, artist.name) : artist.name));
    sub.replaceChildren(...(credits.length ? credits.flatMap((credit, i) => (i ? [', ', credit] : [credit])) : [NO_ARTIST]));
    title.title = track.name;
    sub.title = track.artists.map(artist => artist.name).join(', ') || NO_ARTIST;
  }

  function showText(state: string, heading: string, line: string, detail = '') {
    title.removeAttribute('translate');
    sub.removeAttribute('translate');
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
    else showText('unavailable', last ? sourceName(last.source) : 'Listening activity', 'Listening activity unavailable');
  }

  async function load() {
    lastFetch = Date.now();
    try {
      const { response: res, data: raw } = await requestJson('/api/now-playing', { headers: { Accept: 'application/json' } }, 20_000);
      if (res.status === 503) {
        stopped = true; // not configured: it will not change until the server restarts
        last = null;
        return fail();
      }
      const data = res.ok ? parseNowPlaying(raw) : null;
      if (!data) return fail();
      last = data;
      render(data);
    } catch {
      fail();
    }
  }

  function refresh(): Promise<void> {
    // Returning to the tab must not overlap a request whose response is slow.
    return inFlight ??= load().finally(() => { inFlight = null; });
  }

  function schedule() {
    clearTimeout(timer);
    if (stopped || inFlight || document.visibilityState !== 'visible') return;
    const wait = Math.max(0, REFRESH_MS - (Date.now() - lastFetch));
    timer = window.setTimeout(async () => {
      await refresh();
      schedule();
    }, wait);
  }

  document.addEventListener('visibilitychange', () => {
    if (started) schedule();
  });

  showText('loading', 'Listening activity', '', '');

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
