import { lockScroll, unlockScroll } from './smooth-scroll';
import { applyLanguage } from './language';

const dialog = document.querySelector<HTMLDialogElement>('#highlights-dialog');
const trigger = document.querySelector<HTMLElement>('[data-highlights-open]');
const archive = document.querySelector<HTMLElement>('[data-highlights-archive]');
if (dialog && trigger && archive && typeof dialog.showModal === 'function') {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const close = dialog.querySelector<HTMLButtonElement>('[data-highlights-close]')!;
  let locked = false;
  // With JS, move the archive into the dialog; without JS, native details still works.
  dialog.querySelector('[data-highlights-content]')!.append(archive);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  function cleanup() {
    if (!locked) return;
    locked = false;
    unlockScroll();
    trigger?.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', event => {
    event.preventDefault();
    applyLanguage();
    if (!dialog.open) dialog.showModal();
    if (!locked) { lockScroll(); locked = true; }
    dialog.scrollTop = 0;
    close.focus({ preventScroll: true });
  }, options);
  close.addEventListener('click', () => dialog.close(), options);
  let backdrop = false;
  const outside = (event: PointerEvent) => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  dialog.addEventListener('pointerdown', event => { backdrop = event.target === dialog && outside(event); }, options);
  dialog.addEventListener('pointerup', event => {
    if (backdrop && event.target === dialog && outside(event)) dialog.close();
    backdrop = false;
  }, options);
  dialog.addEventListener('pointercancel', () => { backdrop = false; }, options);
  dialog.addEventListener('close', () => { if (!dialog.open) cleanup(); }, options);
  if (import.meta.hot) import.meta.hot.dispose(() => {
    dialog.close(); cleanup(); controller.abort();
    trigger.parentElement?.append(archive);
  });
}
