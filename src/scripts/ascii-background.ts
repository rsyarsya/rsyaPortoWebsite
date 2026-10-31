// ASCII background: faint water-current glyphs in the page margins only.
//
// Two fixed canvases ("strips") sit against the left and right viewport edges,
// in the empty space beside the reading column. Each strip is at most
// MAX_STRIP px wide and ends at least GAP px before the column's box, so a
// glyph can never sit behind text, and glyph alpha ramps from 0 at the strip's
// inner edge. The motif is a set of slow horizontal current bands (`~` on a
// crest, `-` on its shoulder, `·` as spray), broken up by a travelling gate and
// a fixed per-cell dither so only a small share of cells is ever lit. Each
// glyph has a fixed alpha, so a cell only changes when its glyph does; frames
// redraw just those cells instead of the whole strip.
//
// Motion policy (shared with the contact scene): about 8 frames a second (5 on
// coarse-pointer devices). Each frame is a timer followed by one
// requestAnimationFrame, so the page is not woken at 60Hz in between. It runs
// only while html[data-motion] is 'full', the tab is visible, at least one
// strip is wide enough, and the contact water scene is not animating
// (html[data-scene-active], see motion-budget.ts). Reduced motion and
// Animation Off draw one still frame; while the scene runs the last frame stays
// on screen. Narrow viewports (all phones) and forced-colors mode leave nothing
// to draw, so no loop starts. No scroll, wheel or pointer listeners.
import { isSceneActive, onSceneActiveChange } from './motion-budget';

interface Strip {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  left: number;
  width: number;
  side: 'left' | 'right';
  first: number; // Index of the first whole grid column inside the strip.
  cols: number;
  rows: number;
  cells: Uint8Array; // Glyph currently drawn in each cell (index into GLYPHS).
}

const TAU = Math.PI * 2;
const GAP = 32; // Clear space between the reading column and a strip, px.
const RAMP = 96; // Alpha ramp from a strip's inner edge, px.
const MIN_STRIP = 96; // Narrower strips are not drawn at all.
// Strips sit against the outer viewport edges and stop growing here, so wide
// screens keep the extra margin next to the column empty and the per-frame
// cost stays at the 1440px level.
const MAX_STRIP = 320;
const STILL_TIME = 41; // Scene time used for the reduced-motion still frame.
const MIN_ALPHA = 0.04; // Fainter glyphs are invisible on either theme (about 1.04:1), so they are skipped.
const GLYPHS = ['', '·', '-', '~']; // Cell states: empty, spray, shoulder, crest.
const LEVELS = [0, 0.7, 0.82, 0.95]; // Alpha per state, times --ascii-alpha and the edge ramp.
const root = document.documentElement;
// Coarse pointers (tablets) get bigger cells, DPR 1 and fewer frames.
const lite = matchMedia('(pointer: coarse)');
// CSS hides the layer in forced-colors mode, so nothing should run there.
const forcedColors = matchMedia('(forced-colors: active)');

// Stable 0..1 value per grid cell; cells below the dither never draw.
function hash(i: number, j: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mount(layer: HTMLElement, column: HTMLElement, canvases: HTMLCanvasElement[]): void {
  const strips: Strip[] = canvases.map((canvas, index) => ({
    canvas, ctx: canvas.getContext('2d')!, left: 0, width: 0, side: index === 0 ? 'left' : 'right', first: 0, cols: 0, rows: 0, cells: new Uint8Array(0),
  }));
  let height = 0;
  let color = '#7EA88A';
  let peak = 0.34;
  let font = '';
  let clock = STILL_TIME; // Advances only while animating, so pauses never jump.
  let rafId = 0;
  let timer = 0;
  let lastFrame = 0;

  const cell = () => (lite.matches ? { w: 16, h: 24, size: 15 } : { w: 12, h: 18, size: 13 });
  const visible = () => strips.some(strip => strip.width > 0);
  const running = () => rafId !== 0 || timer !== 0;

  function readStyle(): void {
    const style = getComputedStyle(layer);
    color = style.getPropertyValue('--ascii-glyph').trim() || color;
    peak = Number.parseFloat(style.getPropertyValue('--ascii-alpha')) || peak;
    font = `${cell().size}px ${style.getPropertyValue('--font-sans').trim() || 'sans-serif'}`;
  }

  // Redraws the cells whose glyph changed since the last frame. `full` clears
  // the strips first (after a resize, a theme change, or for the still frame).
  function draw(full = false): void {
    const { w, h } = cell();
    const t = clock;
    for (const strip of strips) {
      const { ctx, left, width, side, first, cols, rows, cells } = strip;
      if (!width) continue;
      if (full) {
        ctx.clearRect(0, 0, width, height);
        cells.fill(0);
      }
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let c = 0; c < cols; c++) {
        // Grid is aligned to the viewport, so both strips share one pattern.
        const i = first + c;
        const cx = (i + 0.5) * w;
        const local = cx - left;
        const ramp = Math.min(1, (side === 'left' ? width - local : local) / RAMP);
        const drift = 1.6 * Math.sin(cx * (TAU / 640) - t * 0.05);
        for (let j = 0; j < rows; j++) {
          if (hash(i, j) < 0.35) continue;
          const cy = (j + 0.5) * h;
          const band = 0.5 + 0.5 * Math.sin(cy * (TAU / 150) + drift + t * 0.11);
          const gate = 0.5 + 0.5 * Math.sin(cx * (TAU / 900) + cy * (TAU / 700) - t * 0.07);
          const s = band * band * band * (0.35 + 0.65 * gate);
          let state = s < 0.45 ? 0 : s > 0.75 ? 3 : s > 0.6 ? 2 : 1;
          if (peak * ramp * LEVELS[state] < MIN_ALPHA) state = 0;
          const index = c * rows + j;
          if (cells[index] === state) continue;
          cells[index] = state;
          // Glyphs stay well inside their cell, so clearing the cell removes only its own glyph.
          if (!full) ctx.clearRect(local - w / 2, cy - h / 2, w, h);
          if (!state) continue;
          ctx.globalAlpha = peak * ramp * LEVELS[state];
          ctx.fillText(GLYPHS[state], local, cy);
        }
      }
      ctx.globalAlpha = 1;
    }
    if (!layer.hasAttribute('data-ready')) layer.setAttribute('data-ready', '');
  }

  function frame(now: number): void {
    rafId = 0;
    clock += lastFrame ? Math.min(now - lastFrame, 250) / 1000 : 0;
    lastFrame = now;
    draw();
    // Sleep until the next frame is due; 8ms early so the following rAF lands
    // near 125ms (8fps) or 200ms (5fps).
    timer = window.setTimeout(() => {
      timer = 0;
      rafId = requestAnimationFrame(frame);
    }, (lite.matches ? 200 : 125) - 8);
  }

  function update(): void {
    const motion = root.dataset.motion === 'full';
    const run = motion && visible() && !document.hidden && !isSceneActive();
    if (run && !running()) {
      lastFrame = 0;
      rafId = requestAnimationFrame(frame);
    } else if (!run && running()) {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      rafId = 0;
      timer = 0;
    }
    if (!motion && visible()) {
      clock = STILL_TIME;
      draw(true);
    }
  }

  function resize(): void {
    const box = column.getBoundingClientRect();
    const viewport = root.clientWidth;
    const { w, h } = cell();
    height = root.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, lite.matches ? 1 : 1.5);
    // Free space on each side, keeping GAP px clear of the column.
    const size = (space: number) => Math.max(0, Math.min(space, MAX_STRIP));
    const leftWidth = size(Math.floor(box.left - GAP));
    const rightWidth = size(viewport - Math.ceil(box.right + GAP));
    const geometry = [{ left: 0, width: leftWidth }, { left: viewport - rightWidth, width: rightWidth }];
    strips.forEach((strip, index) => {
      const { left, width } = geometry[index];
      strip.left = left;
      strip.width = width >= MIN_STRIP && !forcedColors.matches ? width : 0;
      strip.canvas.style.left = `${left}px`;
      strip.canvas.style.width = `${strip.width}px`;
      strip.canvas.width = Math.max(1, Math.round(strip.width * ratio));
      strip.canvas.height = Math.max(1, Math.round(height * ratio));
      strip.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Whole grid cells inside the strip; a resized bitmap starts empty.
      strip.first = Math.ceil(left / w);
      strip.cols = strip.width ? Math.max(0, Math.floor((left + strip.width) / w) - strip.first) : 0;
      strip.rows = Math.ceil(height / h);
      strip.cells = new Uint8Array(strip.cols * strip.rows);
    });
    readStyle();
    if (visible()) draw(true); // A resized bitmap is blank until redrawn.
    update();
  }

  new ResizeObserver(resize).observe(column);
  addEventListener('resize', resize, { passive: true });
  lite.addEventListener('change', resize);
  forcedColors.addEventListener('change', resize);
  new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'data-theme')) {
      readStyle();
      if (visible()) draw(true);
    }
    if (records.some(record => record.attributeName === 'data-motion')) update();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-motion'] });
  onSceneActiveChange(update);
  document.addEventListener('visibilitychange', update);
  // A restored 2D context comes back blank with its transform reset; set both up again.
  for (const { canvas } of strips) canvas.addEventListener('contextrestored', resize);
  // Redraw once the site font is ready so glyphs use Source Sans 3.
  document.fonts?.ready.then(() => { readStyle(); if (visible()) draw(true); });
}

const layer = document.querySelector<HTMLElement>('[data-ascii-background]');
const column = document.querySelector<HTMLElement>('main');
const canvases = layer ? Array.from(layer.querySelectorAll('canvas')) : [];
if (layer && column && canvases.length === 2 && canvases.every(canvas => canvas.getContext('2d'))) {
  try {
    mount(layer, column, canvases);
  } catch (error) {
    // Decoration only: hide the layer if anything goes wrong.
    layer.hidden = true;
    console.warn('[ascii-background] Background disabled.', error);
  }
}
