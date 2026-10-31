// Playground water: a visitor-driven version of the Contact water lines.
// Unlike the decorative Contact scene (perspective lines, ambient ripples),
// this is a flat, top-down surface with no ambient events: the waves follow the
// sliders and ripples appear only where the visitor clicks or taps. Stylised
// sine waves, not a physics simulation.
//
// Motion policy: it may start on load only when html[data-motion] is 'full'.
// Otherwise it draws one still frame and waits for an explicit Play. The loop
// also stops while the tab is hidden or the canvas is off screen, and while
// running it sets html[data-scene-active] (motion-budget.ts) so the ASCII
// background pauses.
import { setSceneActive } from './motion-budget';

interface Params { speed: number; height: number; strength: number; fade: number; density: number; }
interface Ripple { x: number; y: number; born: number; strength: number; }

const DEFAULTS: Params = { speed: 1, height: 1, strength: 0.8, fade: 3, density: 24 };
const LIMITS: Record<keyof Params, [number, number]> = { speed: [0, 3], height: [0, 2], strength: [0.1, 1.5], fade: [1, 8], density: [12, 48] };
const FORMAT: Record<keyof Params, (value: number) => string> = {
  speed: value => `${value.toFixed(1)}×`,
  height: value => `${value.toFixed(1)}×`,
  strength: value => value.toFixed(1),
  fade: value => `${value.toFixed(1)} s`,
  density: value => `${value} lines`,
};
const TAU = Math.PI * 2;
const root = document.documentElement;
const lite = matchMedia('(max-width: 767px), (pointer: coarse)');

function mount(stage: HTMLElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, panel: HTMLElement): void {
  const inputs = Array.from(panel.querySelectorAll<HTMLInputElement>('input[type="range"][data-param]'));
  const toggle = panel.querySelector<HTMLButtonElement>('[data-pg-toggle]');
  const reset = panel.querySelector<HTMLButtonElement>('[data-pg-reset]');
  const drop = panel.querySelector<HTMLButtonElement>('[data-pg-drop]');
  const status = panel.querySelector<HTMLElement>('[data-pg-status]');
  const params: Params = { ...DEFAULTS };
  const ripples: Ripple[] = [];
  let palette = { top: '', bottom: '', line: '', crest: '' };
  let gradient: CanvasGradient | null = null;
  let width = 0;
  let height = 0;
  let ys = new Float32Array(0);
  let clock = 0;
  let rafId = 0;
  let lastFrame = 0;
  let onScreen = false;
  // The visitor's choice. Starts on only when animation is allowed.
  let playing = root.dataset.motion === 'full';

  function readPalette(): void {
    const style = getComputedStyle(stage);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    palette = { top: read('--scene-bg-top', '#F0EEE8'), bottom: read('--scene-bg-bottom', '#E2E8DF'), line: read('--scene-line', '#7EA88A'), crest: read('--scene-crest', '#456657') };
    gradient = null;
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
    const columns = Math.round(Math.min(lite.matches ? 64 : 120, Math.max(28, width / 7)));
    if (ys.length !== columns + 1) ys = new Float32Array(columns + 1);
    const step = width / columns;
    const count = params.density;
    const gap = height / (count + 1);
    const amp = gap * 0.4 * params.height;
    const k1 = TAU / Math.max(160, width * 0.5);
    const k2 = k1 * 1.7;
    const band = Math.max(18, width * 0.035); // Ripple ring width, px.
    const front = Math.max(60, width * 0.12); // Ripple front speed, px per second.
    const t = clock;
    for (let i = 0; i < count; i++) {
      const y0 = gap * (i + 1);
      const phase = i * 0.9;
      for (let j = 0; j <= columns; j++) {
        const x = j * step;
        let dy = amp * (0.65 * Math.sin(x * k1 - t * 1.1 * params.speed + phase) + 0.35 * Math.sin(x * k2 + t * 0.6 * params.speed + phase * 1.6));
        for (const ripple of ripples) {
          const age = t - ripple.born;
          const q = Math.hypot(x - ripple.x, y0 - ripple.y) - age * front;
          if (q > band * 2.2 || q < -band * 2.2) continue;
          dy += gap * ripple.strength * Math.exp(-(q * q) / (band * band) - age / params.fade) * Math.cos((q * Math.PI) / band);
        }
        ys[j] = y0 + dy;
      }
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ys[0]);
      for (let j = 1; j <= columns; j++) ctx.lineTo(j * step, ys[j]);
      ctx.stroke();
      // Steep segments re-stroked in the crest color.
      const threshold = -0.6 * Math.max(amp, gap * 0.15) * k1 * step;
      ctx.beginPath();
      let crest = false;
      for (let j = 0; j < columns; j++) {
        if (ys[j + 1] - ys[j] >= threshold) continue;
        ctx.moveTo(j * step, ys[j]);
        ctx.lineTo((j + 1) * step, ys[j + 1]);
        crest = true;
      }
      if (crest) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = palette.crest;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (!stage.hasAttribute('data-ready')) stage.setAttribute('data-ready', '');
  }

  function prune(): void {
    // A ripple is gone once its amplitude is below ~1% or its ring has left the canvas.
    const reach = Math.hypot(width, height);
    const front = Math.max(60, width * 0.12);
    for (let i = ripples.length - 1; i >= 0; i--) {
      const age = clock - ripples[i].born;
      if (age > params.fade * 4.6 || age * front > reach + 60) ripples.splice(i, 1);
    }
  }

  function tick(now: number): void {
    rafId = requestAnimationFrame(tick);
    if (lastFrame && now - lastFrame < (lite.matches ? 30 : 0)) return; // ~30 fps on lite devices.
    clock += lastFrame ? Math.min(now - lastFrame, 100) / 1000 : 0;
    lastFrame = now;
    prune();
    draw();
  }

  function update(): void {
    const run = playing && onScreen && !document.hidden && width > 0;
    if (run && !rafId) {
      lastFrame = 0;
      rafId = requestAnimationFrame(tick);
    } else if (!run && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    stage.toggleAttribute('data-running', run);
    setSceneActive(run);
  }

  function say(text: string): void {
    if (status) status.textContent = text;
  }

  function setPlaying(value: boolean, announce = true): void {
    playing = value;
    if (toggle) toggle.textContent = value ? 'Pause' : 'Play';
    if (announce) say(value ? 'Playing.' : 'Paused.');
    update();
  }

  function showValue(input: HTMLInputElement): void {
    const key = input.dataset.param as keyof Params;
    const output = panel.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`);
    if (output) output.textContent = FORMAT[key](params[key]);
  }

  function readInput(input: HTMLInputElement): void {
    const key = input.dataset.param as keyof Params;
    const [min, max] = LIMITS[key];
    const value = Number(input.value);
    params[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : DEFAULTS[key];
    showValue(input);
    if (!rafId) draw(); // Paused: show the new setting on the still frame.
  }

  function addRipple(x: number, y: number): void {
    if (ripples.length >= (lite.matches ? 5 : 8)) ripples.shift();
    // When paused, start the ripple slightly aged so its ring is visible on the still frame.
    ripples.push({ x, y, born: rafId ? clock : clock - 0.35, strength: params.strength });
    if (!rafId) draw();
  }

  function resize(): void {
    const rect = stage.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, lite.matches ? 1.5 : 2);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    gradient = null;
    ripples.length = 0; // Old positions belong to the previous size.
    draw();
    update();
  }

  for (const input of inputs) {
    readInput(input);
    input.addEventListener('input', () => readInput(input));
  }
  toggle?.addEventListener('click', () => setPlaying(!playing));
  reset?.addEventListener('click', () => {
    Object.assign(params, DEFAULTS);
    for (const input of inputs) {
      input.value = String(DEFAULTS[input.dataset.param as keyof Params]);
      showValue(input);
    }
    ripples.length = 0;
    clock = 0;
    draw();
    say('Settings reset to defaults.');
  });
  drop?.addEventListener('click', () => addRipple(width * (0.3 + 0.4 * Math.random()), height * (0.3 + 0.4 * Math.random())));
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    addRipple(event.clientX - rect.left, event.clientY - rect.top);
  });

  readPalette();
  setPlaying(playing, false);
  if (!playing) say('Animation is off in your settings, so this is a still frame. Press Play to start.');
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries => {
    onScreen = entries[entries.length - 1].isIntersecting;
    update();
  }).observe(stage);
  new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'data-theme')) {
      readPalette();
      draw();
    }
    // Turning animation off pauses; turning it on leaves the visitor's choice alone.
    if (records.some(record => record.attributeName === 'data-motion') && root.dataset.motion !== 'full' && playing) setPlaying(false);
  }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-motion'] });
  document.addEventListener('visibilitychange', update);
  lite.addEventListener('change', resize);
}

const stage = document.querySelector<HTMLElement>('[data-pg-stage]');
const panel = document.querySelector<HTMLElement>('[data-pg-panel]');
const canvas = stage?.querySelector('canvas');
const context = canvas?.getContext('2d', { alpha: false });
if (stage && panel && canvas && context) {
  try {
    mount(stage, canvas, context, panel);
  } catch (error) {
    stage.removeAttribute('data-ready');
    console.warn('[playground] Canvas disabled; showing the static frame.', error);
  }
}
