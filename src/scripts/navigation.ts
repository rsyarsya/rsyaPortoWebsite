const root = document.documentElement;
const header = document.querySelector<HTMLElement>('.site-header');
const settings = document.querySelector<HTMLElement>('#display-settings');
const settingsButton = document.querySelector<HTMLButtonElement>('.settings-toggle');
const themeButton = document.querySelector<HTMLButtonElement>('.theme-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let lastY = Math.max(0, scrollY);
let frame = 0;

function save(key: string, value: string) {
  try { localStorage.setItem(`rsya:${key}`, value); } catch { /* Storage is optional. */ }
}
// The label names the action, so the button carries no aria-pressed (a toggle's label must not change with its state).
function syncThemeButton() {
  const dark = root.dataset.theme === 'dark';
  themeButton?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
}
function applyMotion() {
  root.dataset.motion = root.dataset.motionSetting === 'off' || (root.dataset.motionSetting !== 'on' && reducedMotion.matches) ? 'reduce' : 'full';
}
function reveal() {
  if (header) header.dataset.state = scrollY <= 0 ? 'top' : 'pill';
}
function closeSettings(restoreFocus = false) {
  if (settings) settings.hidden = true;
  settingsButton?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) settingsButton?.focus();
}
settingsButton?.addEventListener('click', () => {
  if (!settings) return;
  settings.hidden = !settings.hidden;
  settingsButton.setAttribute('aria-expanded', String(!settings.hidden));
  reveal();
  if (!settings.hidden) settings.querySelector<HTMLInputElement>('input:checked')?.focus();
});
document.addEventListener('pointerdown', event => {
  if (event.target instanceof Node && !document.querySelector('.settings-wrap')?.contains(event.target)) closeSettings();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && settings && !settings.hidden) closeSettings(true);
});
header?.addEventListener('focusout', event => {
  if (event.relatedTarget instanceof Node && header.contains(event.relatedTarget)) return;
  requestAnimationFrame(() => { if (!header.contains(document.activeElement)) closeSettings(); });
});
header?.addEventListener('focusin', reveal);
themeButton?.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  save('theme', root.dataset.theme);
  syncThemeButton();
});
for (const input of document.querySelectorAll<HTMLInputElement>('#display-settings input')) {
  input.checked = input.value === (input.name === 'motion' ? root.dataset.motionSetting : root.dataset.layout);
  input.addEventListener('change', () => {
    if (input.name === 'motion') {
      root.dataset.motionSetting = input.value;
      applyMotion();
    } else root.dataset.layout = input.value;
    save(input.name, input.value);
  });
}
reducedMotion.addEventListener('change', applyMotion);
syncThemeButton();
function update() {
  frame = 0;
  const max = Math.max(0, root.scrollHeight - innerHeight);
  const y = Math.min(Math.max(scrollY, 0), max);
  root.style.setProperty('--edge-top', String(Math.min(y / 120, 1)));
  root.style.setProperty('--edge-bottom', String(Math.min((max - y) / 120, 1)));
  if (!header) return;
  const delta = y - lastY;
  if (y === 0) header.dataset.state = 'top';
  else if ((settings && !settings.hidden) || header.matches(':has(:focus-visible)')) reveal();
  else if (Math.abs(delta) >= 8) {
    if (header.dataset.state === 'top' && y < 64) header.dataset.state = 'top';
    else header.dataset.state = delta > 0 ? 'hidden' : 'pill';
  }
  if (y === 0 || Math.abs(delta) >= 8) lastY = y;
}
function schedule() { if (!frame) frame = requestAnimationFrame(update); }
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule, { passive: true });
new ResizeObserver(schedule).observe(document.body);
addEventListener('pageshow', () => { lastY = Math.max(0, scrollY); reveal(); schedule(); });
header?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  closeSettings();
  if (link instanceof HTMLElement && !link.matches(':focus-visible')) link.blur();
}));
reveal();
update();
