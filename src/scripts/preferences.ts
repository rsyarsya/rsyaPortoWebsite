// Single preferences path for the settings menu and the command palette.
// Writes html data attributes + rsya:* storage, then syncs the menu radios and theme button.
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function save(key: string, value: string) {
  try { localStorage.setItem(`rsya:${key}`, value); } catch { /* Storage is optional. */ }
}

/** Reflect the current preferences in the settings menu radios and the theme button label. */
export function syncPreferenceControls() {
  const dark = root.dataset.theme === 'dark';
  // The label names the action, so the button carries no aria-pressed (a toggle's label must not change with its state).
  document.querySelector('.theme-toggle')?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  for (const input of document.querySelectorAll<HTMLInputElement>('#display-settings input')) {
    input.checked = input.value === (input.name === 'motion' ? root.dataset.motionSetting : root.dataset.layout);
  }
}

export function applyMotion() {
  root.dataset.motion = root.dataset.motionSetting === 'off' || (root.dataset.motionSetting !== 'on' && reducedMotion.matches) ? 'reduce' : 'full';
}

export function setTheme(theme: 'light' | 'dark') {
  root.dataset.theme = theme;
  save('theme', theme);
  syncPreferenceControls();
}

export function setMotion(value: 'system' | 'on' | 'off') {
  root.dataset.motionSetting = value;
  applyMotion();
  save('motion', value);
  syncPreferenceControls();
}

export function setLayout(value: 'default' | 'wide' | 'wider') {
  root.dataset.layout = value;
  save('layout', value);
  syncPreferenceControls();
}

reducedMotion.addEventListener('change', applyMotion);
