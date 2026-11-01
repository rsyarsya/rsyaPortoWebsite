// World and renderer from stackedlol/ascii-sharks (MIT); see src/vendor/ascii-sharks.
// Site-owned lifecycle: margin-only, no pointer handlers, no loops while inactive.
import { World } from '../vendor/ascii-sharks/world';
import { AsciiRenderer } from '../vendor/ascii-sharks/renderer';
import { isSceneActive, onSceneActiveChange } from './motion-budget';

const GAP = 32;
const MIN_STRIP = 160;
const MAX_STRIP = 440;
const STEP = 1 / 60;
const root = document.documentElement;
const lite = matchMedia('(pointer: coarse)');
const forcedColors = matchMedia('(forced-colors: active)');
const print = matchMedia('print');

interface Ocean {
  canvas: HTMLCanvasElement;
  renderer: AsciiRenderer | null;
  world: World | null;
  width: number;
  height: number;
  dpr: number;
}

function mount(layer: HTMLElement, column: HTMLElement, canvases: HTMLCanvasElement[]): void {
  const oceans: Ocean[] = canvases.map(canvas => ({canvas, renderer: null, world: null, width: 0, height: 0, dpr: 0}));
  let raf = 0;
  let timer = 0;
  let last = 0;
  let accumulator = 0;
  let disposed = false;
  const active = () => !disposed && root.dataset.motion === 'full' && !document.hidden
    && !forcedColors.matches && !print.matches && oceans.some(o => o.width > 0);

  function draw(dt = 0): void {
    for (const ocean of oceans) {
      if (ocean.width && ocean.renderer && ocean.world) ocean.renderer.render(ocean.world, dt);
    }
    layer.setAttribute('data-ready', '');
  }
  function stop(): void {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = timer = 0;
    last = accumulator = 0;
    layer.removeAttribute('data-running');
  }
  function frame(now: number): void {
    raf = 0;
    if (!active()) { stop(); return; }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : STEP;
    last = now;
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 6) {
      for (const ocean of oceans) if (ocean.width) ocean.world?.step(STEP);
      accumulator -= STEP;
      steps++;
    }
    if (steps === 6) accumulator = 0;
    draw(dt);
    timer = window.setTimeout(() => {
      timer = 0;
      raf = requestAnimationFrame(frame);
    // Keep the ocean alive near Contact/Playground; share the budget by drawing
    // less often instead of abruptly freezing a viewport-wide background.
    }, (lite.matches || isSceneActive() ? 100 : 50) - 8);
  }
  function update(): void {
    if (!active()) { stop(); return; }
    if (!raf && !timer) {
      layer.setAttribute('data-running', '');
      raf = requestAnimationFrame(frame);
    }
  }
  function resize(): void {
    const box = column.getBoundingClientRect();
    const viewport = root.clientWidth;
    const height = root.clientHeight;
    const widths = [Math.floor(box.left - GAP), viewport - Math.ceil(box.right + GAP)];
    const dpr = Math.min(devicePixelRatio || 1, lite.matches ? 1 : 1.5);
    oceans.forEach((ocean, index) => {
      const available = Math.max(0, Math.min(MAX_STRIP, widths[index]));
      const width = available >= MIN_STRIP && !forcedColors.matches && !print.matches ? available : 0;
      ocean.canvas.style.left = `${index === 0 ? 0 : viewport - width}px`;
      ocean.canvas.style.width = `${width}px`;
      if (!width) {
        ocean.width = 0;
        ocean.canvas.width = ocean.canvas.height = 1;
        ocean.renderer = null;
        ocean.world = null;
        return;
      }
      if (ocean.width === width && ocean.height === height && ocean.dpr === dpr && ocean.renderer) return;
      ocean.width = width;
      ocean.height = height;
      ocean.dpr = dpr;
      ocean.renderer ??= new AsciiRenderer(ocean.canvas);
      ocean.renderer.setFontFamily('Consolas, ui-monospace, monospace');
      const fresh = !ocean.world;
      ocean.world ??= new World(index === 0
        ? [{kind: 'classic', size: 1.55}, {kind: 'hammerhead', size: 1.15}]
        : [{kind: 'mako', size: 1.55}, {kind: 'thresher', size: 1.15}], 32);
      ocean.renderer.resize(width, height, dpr);
      // Wider spacing accommodates multi-character fish without changing sharks.
      ocean.world.resize(width, height, ocean.renderer.cellWidth * 1.6, ocean.renderer.cellHeight * 1.15);
      if (fresh) {
        // Start both silhouettes inside the narrow ocean rather than off its edges.
        ocean.world.sharks.forEach((shark, i) => {
          shark.heading = i === 0 ? Math.PI / 2 : -Math.PI / 2;
          const cx = width * (i === 0 ? 0.4 : 0.6);
          const cy = height * (i === 0 ? 0.27 : 0.73);
          const count = shark.nodes.length / 2;
          for (let n = 0; n < count; n++) {
            const along = shark.length * (0.5 - n / (count - 1));
            shark.nodes[n * 2] = cx + Math.cos(shark.heading) * along;
            shark.nodes[n * 2 + 1] = cy + Math.sin(shark.heading) * along;
          }
        });
      }
      // Settle only once, including the still frame for reduced motion.
      if (fresh) for (let i = 0; i < 60; i++) ocean.world.step(STEP);
    });
    draw();
    update();
  }
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(column);
  const preferences = new MutationObserver(update);
  preferences.observe(root, {attributes: true, attributeFilter: ['data-motion']});
  const unsubscribeScene = onSceneActiveChange(update);
  addEventListener('resize', resize, {passive: true});
  document.addEventListener('visibilitychange', update);
  for (const media of [lite, forcedColors, print]) media.addEventListener('change', resize);
  resize();

  function dispose(): void {
    disposed = true;
    stop();
    sizeObserver.disconnect();
    preferences.disconnect();
    unsubscribeScene();
    removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', update);
    for (const media of [lite, forcedColors, print]) media.removeEventListener('change', resize);
  }
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}

const layer = document.querySelector<HTMLElement>('[data-ascii-background]');
const column = document.querySelector<HTMLElement>('main');
const canvases = layer ? Array.from(layer.querySelectorAll('canvas')) : [];
if (layer && column && canvases.length === 2) {
  try { mount(layer, column, canvases); }
  catch (error) {
    layer.hidden = true;
    console.warn('[ascii-background] Ocean unavailable.', error);
  }
}
