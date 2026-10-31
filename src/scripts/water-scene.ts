// Contact water scene: an original canvas drawing of a calm water surface seen
// at a low angle. Perspective-ruled hairlines (dense far away, wider up close)
// drift on two slow travelling waves; segments on the steep face of a wave are
// re-stroked in a deeper sage, like light catching the crests. Slow ambient
// ripples and pointer/touch ripples spread as flattened ellipses.
//
// Progressive enhancement: the wrapper's CSS background is the still frame
// without JS or canvas; the canvas fades in only after its first drawn frame.
// Motion policy: it animates only while html[data-motion] is 'full', the scene
// is on screen (IntersectionObserver) and the tab is visible. Otherwise the
// loop is cancelled; under reduced motion / Animation Off it keeps one still
// frame. While animating it sets html[data-scene-active] via motion-budget.ts
// so other decorative loops can pause. It adds no scroll or wheel listeners and
// never calls preventDefault, so page scrolling and pinch-zoom stay native.
import { setSceneActive } from './motion-budget';

interface Palette { top: string; bottom: string; line: string; crest: string; }
interface Line { y: number; depth: number; gap: number; alpha: number; phase: number; k1: number; k2: number; amp: number; }
interface Ripple { x: number; y: number; born: number; strength: number; }

const TAU = Math.PI * 2;
const STILL_TIME = 7.3; // Scene time used for the reduced-motion still frame.
const RIPPLE_LIFE = 6; // Seconds before a ripple is dropped.
const root = document.documentElement;
// Phones, tablets and narrow windows: lower DPR, ~30fps, fewer samples.
const lite = matchMedia('(max-width: 767px), (pointer: coarse)');

function mount(scene: HTMLElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  let width = 0;
  let height = 0;
  let columns = 0;
  let lines: Line[] = [];
  let ys = new Float32Array(0);
  let palette: Palette = { top: '', bottom: '', line: '', crest: '' };
  let gradient: CanvasGradient | null = null;
  const ripples: Ripple[] = [];
  let clock = STILL_TIME; // Scene seconds; advances only while animating, so pauses never jump.
  let nextAmbient = clock + 2.5;
  let seed = 7;
  let rafId = 0;
  let lastFrame = 0;
  let onScreen = false;
  let lastPointer = { x: -1e4, y: -1e4, at: -1e4 };

  // Small deterministic generator for ambient ripple placement.
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const animating = () => rafId !== 0;

  function readPalette(): void {
    const style = getComputedStyle(scene);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    palette = {
      top: read('--scene-bg-top', '#F0EEE8'),
      bottom: read('--scene-bg-bottom', '#E2E8DF'),
      line: read('--scene-line', '#7EA88A'),
      crest: read('--scene-crest', '#456657'),
    };
    gradient = null;
  }

  function layout(): void {
    const count = Math.round(Math.min(30, Math.max(14, height / 13)));
    columns = Math.round(Math.min(lite.matches ? 64 : 120, Math.max(28, width / (lite.matches ? 6 : 7))));
    ys = new Float32Array(columns + 1);
    // f: 0 = far (top) … 1 = near (bottom). Mostly a power curve for perspective,
    // with a linear part so the far lines never merge.
    const yAt = (f: number) => height * (0.05 + 0.97 * (0.25 * f + 0.75 * f ** 1.7));
    lines = Array.from({ length: count }, (_, i) => {
      const f = (i + 0.5) / count;
      const gap = yAt((i + 1) / count) - yAt(i / count);
      const wavelength = Math.max(160, width * 0.55) * (0.4 + 0.6 * f);
      return { y: yAt(f), depth: f, gap, alpha: 0.28 + 0.6 * f, phase: i * 1.37, k1: TAU / wavelength, k2: TAU / (wavelength * 0.58), amp: gap * 0.32 };
    });
  }

  function draw(): void {
    if (!width || !height) return;
    if (!gradient) {
      gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, palette.top);
      gradient.addColorStop(1, palette.bottom);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const step = width / columns;
    const speed = Math.max(40, width * 0.08); // Ripple front, px per second.
    // Ripple ring width, px. Its wavelength (2 × band) spans several sample
    // columns, so rings bend the lines smoothly instead of kinking them.
    const band = Math.max(22, width * 0.05);
    const reach = band * 2.2;
    const t = clock;
    for (const line of lines) {
      for (let j = 0; j <= columns; j++) {
        const x = j * step;
        let dy = line.amp * (0.62 * Math.sin(x * line.k1 + t * 0.42 + line.phase) + 0.38 * Math.sin(x * line.k2 - t * 0.27 + line.phase * 1.7));
        for (const ripple of ripples) {
          const age = t - ripple.born;
          const ex = x - ripple.x;
          const ey = (line.y - ripple.y) * 1.7; // Flattened rings read as perspective.
          const q = Math.sqrt(ex * ex + ey * ey) - age * speed;
          if (q > reach || q < -reach) continue;
          dy += line.gap * ripple.strength * (0.4 + 0.6 * line.depth) * Math.exp(-(q * q) / (band * band) - age / 1.8) * Math.cos((q * Math.PI) / band);
        }
        ys[j] = line.y + dy;
      }
      ctx.globalAlpha = line.alpha;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 0.75 + 0.5 * line.depth;
      ctx.beginPath();
      ctx.moveTo(0, ys[0]);
      for (let j = 1; j <= columns; j++) ctx.lineTo(j * step, ys[j]);
      ctx.stroke();
      // Crest glints: segments falling faster than half the primary wave's peak slope.
      const threshold = -0.5 * line.amp * line.k1 * step;
      let glints = false;
      ctx.beginPath();
      for (let j = 0; j < columns; j++) {
        if (ys[j + 1] - ys[j] >= threshold) continue;
        ctx.moveTo(j * step, ys[j]);
        ctx.lineTo((j + 1) * step, ys[j + 1]);
        glints = true;
      }
      if (glints) {
        ctx.globalAlpha = Math.min(1, line.alpha * 1.1);
        ctx.strokeStyle = palette.crest;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (!scene.hasAttribute('data-ready')) scene.setAttribute('data-ready', '');
  }

  function stillFrame(): void {
    ripples.length = 0;
    clock = STILL_TIME;
    nextAmbient = clock + 2.5;
    draw();
  }

  function tick(now: number): void {
    rafId = requestAnimationFrame(tick);
    // Lite devices draw about every other 60Hz frame (~30fps).
    if (lastFrame && now - lastFrame < (lite.matches ? 30 : 0)) return;
    clock += lastFrame ? Math.min(now - lastFrame, 100) / 1000 : 0;
    lastFrame = now;
    while (ripples.length && clock - ripples[0].born > RIPPLE_LIFE) ripples.shift();
    if (clock >= nextAmbient) {
      addRipple(width * (0.15 + 0.7 * random()), height * (0.3 + 0.6 * random()), 0.22);
      nextAmbient = clock + 4.5 + random() * 3;
    }
    draw();
  }

  function update(): void {
    const motion = root.dataset.motion === 'full';
    const run = motion && onScreen && !document.hidden && width > 0;
    if (run && !animating()) {
      lastFrame = 0;
      rafId = requestAnimationFrame(tick);
    } else if (!run && animating()) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    setSceneActive(run);
    if (!motion) stillFrame();
  }

  function resize(): void {
    const rect = scene.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, lite.matches ? 1.5 : 2);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    gradient = null;
    ripples.length = 0; // Old ripple positions belong to the previous size.
    layout();
    draw(); // A resized bitmap is blank until redrawn.
    update();
  }

  function addRipple(x: number, y: number, strength: number): void {
    if (ripples.length >= (lite.matches ? 4 : 6)) ripples.shift();
    ripples.push({ x, y, born: clock, strength });
  }

  function pointerRipple(event: PointerEvent, strength: number, throttle: boolean): void {
    if (!animating()) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (throttle && (event.timeStamp - lastPointer.at < 350 || Math.hypot(x - lastPointer.x, y - lastPointer.y) < 40)) return;
    lastPointer = { x, y, at: event.timeStamp };
    addRipple(x, y, strength);
  }

  // Touch gets a ripple on tap/press; dragging stays a normal page scroll.
  scene.addEventListener('pointerdown', event => pointerRipple(event, 0.4, false), { passive: true });
  scene.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') pointerRipple(event, 0.25, true);
  }, { passive: true });

  readPalette();
  new ResizeObserver(resize).observe(scene);
  new IntersectionObserver(entries => {
    onScreen = entries[entries.length - 1].isIntersecting;
    update();
  }).observe(scene);
  new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'data-theme')) {
      readPalette();
      draw();
    }
    if (records.some(record => record.attributeName === 'data-motion')) update();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-motion'] });
  document.addEventListener('visibilitychange', update);
  lite.addEventListener('change', resize);
}

const scene = document.querySelector<HTMLElement>('[data-water-scene]');
const canvas = scene?.querySelector('canvas');
const context = canvas?.getContext('2d', { alpha: false });
if (scene && canvas && context) {
  try {
    mount(scene, canvas, context);
  } catch (error) {
    // Decoration only: keep the CSS still frame if anything goes wrong.
    scene.removeAttribute('data-ready');
    console.warn('[water-scene] Canvas scene disabled; showing the static frame.', error);
  }
}
