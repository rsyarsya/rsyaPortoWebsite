// Gentle desktop wheel/trackpad smoothing via a single Lenis instance.
// Design: src/scripts/smooth-scroll.ts owns ONE Lenis instance + ONE rAF loop.
// navigation.ts stays the sole reader of the real document scroll position for
// navbar state and viewport blur; Lenis only smooths input and moves the real
// document scroll, so navigation.ts's native `scroll` listener keeps firing.
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const root = document.documentElement;

let lenis: Lenis | null = null;
let rafId = 0;

// Hash-resolution dedupe (Back/Forward can emit popstate + hashchange for one
// navigation). Keyed on the hash so a genuinely different destination always
// preempts and is never dropped.
let isResolving = false;
let pendingHash: string | null = null;
// The URL hash is landed only if Lenis starts at page load (direct load /
// cross-page link). Later inits (Animation setting, OS reduced motion, resizing back across
// 768px) must keep the reader where they are, not jump back to the hash.
let initialHashHandled = false;

// --- Media queries for eligibility (desktop-class, not-mobile). ------------
const pointerFine = matchMedia('(pointer: fine)');
const hoverHover = matchMedia('(hover: hover)');
const viewportMin = matchMedia('(min-width: 768px)');

// Pure resolver: given the current environment, should Lenis be active?
// "not mobile" is an explicit viewport guard (>=768px), matching the site's
// own mobile breakpoint, so a touchscreen laptop at a narrow width stays native.
export function shouldEnable(
  motion: string | undefined,
  pointer: boolean,
  hover: boolean,
  wideViewport: boolean,
): boolean {
  return motion === 'full' && pointer && hover && wideViewport;
}

function eligible(): boolean {
  return shouldEnable(root.dataset.motion, pointerFine.matches, hoverHover.matches, viewportMin.matches);
}

// --- Anchor interception helpers (pure where practical). -------------------
// Which clicks do we intercept? Same-page hash links only, unmodified left
// click. Everything else (external, mailto, _blank, modifier/middle click)
// passes through to native behavior untouched.
function interceptHash(anchor: HTMLAnchorElement, event: MouseEvent): string | null {
  if (event.defaultPrevented) return null;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  const url = new URL(anchor.href, location.href);
  // Must be the same document (same origin + same path) with a hash.
  if (url.origin !== location.origin || url.pathname !== location.pathname) return null;
  if (!url.hash || url.hash === '#') return null;
  return url.hash;
}

function validTarget(hash: string): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(hash);
  } catch {
    return null; // Malformed selector in the hash.
  }
}

// Single path for every hash landing. A fresh scrollTo resets Lenis's
// targetScroll, so a new navigation inherently interrupts stale momentum;
// no stop()/start() needed (which would risk the lenis-stopped overflow lock).
function resolveHash(hash: string, immediate = false): void {
  if (isResolving && pendingHash === hash) return; // Collapse the one-navigation pair.
  const target = validTarget(hash);
  if (!target) return; // Bad hash: leave the URL as-is, no throw.

  pendingHash = hash;
  isResolving = true;
  requestAnimationFrame(() => {
    isResolving = false;
    pendingHash = null;
  });

  // CSS is the single offset source: Lenis subtracts the target's
  // scroll-margin-top and the root scroll-padding-top (global.css), like native
  // fragment scrolling, so offset 0 lets CSS own the gap under the fixed navbar.
  lenis?.scrollTo(target, { offset: 0, immediate });
  moveFocus(target);
}

function moveFocus(target: HTMLElement): void {
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  // preventScroll stops the browser re-jumping and fighting Lenis.
  target.focus({ preventScroll: true });
}

function onAnchorClick(event: MouseEvent): void {
  const anchor = (event.target as Element | null)?.closest('a');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  const hash = interceptHash(anchor, event);
  if (!hash) return; // Not a same-page hash link — native behavior.
  if (!validTarget(hash)) return; // Unknown target — let the browser handle it.

  event.preventDefault(); // Suppress native jump so it can't fight Lenis.
  // preventDefault suppressed the hash write. Like native same-fragment
  // navigation, re-clicking the current hash replaces the entry.
  if (hash === location.hash) history.replaceState(history.state, '', hash);
  else history.pushState({}, '', hash);
  // Skip-to-content (#main) must be prompt, not a long glide.
  resolveHash(hash, hash === '#main');
}

function onHashChange(): void {
  if (location.hash) resolveHash(location.hash);
}

function onPopState(): void {
  // hashchange is authoritative; popstate defers to it. If popstate carries a
  // hash but no hashchange follows (defensive), the dedupe still collapses it.
  if (location.hash) resolveHash(location.hash);
}

// --- Lifecycle. ------------------------------------------------------------
// navigation.ts owns navbar state + viewport blur by listening to the native
// `scroll` event and reading the real document scrollY. Lenis scrolls the real
// document and its own scroll handling is driven by that same native `scroll`
// event, so navigation.ts's existing listener keeps firing while Lenis is
// active — Lenis contributes no scroll-direction logic here (single reader).
function raf(time: number): void {
  lenis?.raf(time);
  rafId = requestAnimationFrame(raf);
}

function init(): void {
  if (lenis) return; // Idempotent: one instance only.
  try {
    lenis = new Lenis({
      // Restrained feel: gentle wheel smoothing, responsive, no exaggerated
      // inertia and no shortened travel. lerp keeps it snappy near rest.
      lerp: 0.12,
      smoothWheel: true,
      syncTouch: false, // Mobile/touch stays native (gate also blocks it).
      wheelMultiplier: 1,
      // We own anchors/history/focus ourselves for CSS-offset + a11y focus.
      anchors: false,
      // html[data-motion] already folds in OS reduced motion (System) and the
      // explicit On/Off choice; Lenis only exists while it is 'full', so its
      // own media-query check would only override an explicit On.
      respectReducedMotion: false,
    });
    rafId = requestAnimationFrame(raf);
    document.addEventListener('click', onAnchorClick);
    addEventListener('hashchange', onHashChange);
    addEventListener('popstate', onPopState);
    // Land an initial hash (direct load / cross-page) after layout settles,
    // only when Lenis starts during the page-load evaluate(). A later init
    // means native scrolling already handled the hash.
    if (!initialHashHandled && location.hash && validTarget(location.hash)) {
      requestAnimationFrame(() => resolveHash(location.hash, true));
    }
  } catch (error) {
    // Enhancement failure must never break native scrolling.
    lenis = null;
    console.warn('[smooth-scroll] Lenis init failed; using native scrolling.', error);
  }
}

function destroy(): void {
  if (!lenis) return; // Idempotent.
  cancelAnimationFrame(rafId);
  rafId = 0;
  document.removeEventListener('click', onAnchorClick);
  removeEventListener('hashchange', onHashChange);
  removeEventListener('popstate', onPopState);
  // destroy() removes Lenis's html classes and never writes scrollTop, so the
  // document stays exactly where it is — no jump, no lock.
  lenis.destroy();
  lenis = null;
}

function evaluate(): void {
  if (eligible()) init();
  else destroy();
}

// React to live preference changes without a reload: navigation.ts translates
// the Animation setting and OS reduced-motion into html[data-motion], which is
// the single observable signal all three modes funnel into.
new MutationObserver(evaluate).observe(root, {
  attributes: true,
  attributeFilter: ['data-motion'],
});

// React to pointer/hover/viewport eligibility changes (device plug/unplug,
// resize across the 768px mobile breakpoint) without a reload.
for (const mql of [pointerFine, hoverHover, viewportMin]) {
  mql.addEventListener('change', evaluate);
}

evaluate();
// Initial landing is decided once, at page load. If Lenis was off here, the
// browser already landed the hash natively; later inits keep the reader put.
initialHashHandled = true;
