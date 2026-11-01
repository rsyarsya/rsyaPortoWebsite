import { lockScroll, unlockScroll } from './smooth-scroll';
import { applyLanguage } from './language';
const dialog = document.querySelector<HTMLDialogElement>('#project-dialog');
const section = document.querySelector('#projects');
if (dialog && section) {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let locked = false;
  let trigger: HTMLElement | null = null;
  const close = dialog.querySelector<HTMLButtonElement>('.project-close')!;
  const cleanup = () => {
    if (!locked) return;
    locked = false;
    unlockScroll();
    trigger?.focus({ preventScroll: true });
  };
  section.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-project]') : null;
    if (!button) return;
    const template = document.getElementById(`project-${button.dataset.project}`);
    if (!(template instanceof HTMLTemplateElement)) return;
    trigger = button;
    dialog.querySelector('[data-project-content]')!.replaceChildren(template.content.cloneNode(true));
    dialog.querySelector('#project-dialog-title')!.textContent = button.closest('li')!.querySelector('h3')!.textContent;
    applyLanguage();
    if (!dialog.open) dialog.showModal();
    if (!locked) { lockScroll(); locked = true; }
    dialog.scrollTop = 0;
    close.focus({ preventScroll: true });
  }, options);
  close.addEventListener('click', () => dialog.close(), options);
  let backdrop = false;
  const outside = (event: PointerEvent) => {
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  };
  dialog.addEventListener('pointerdown', event => { backdrop = event.target === dialog && outside(event); }, options);
  dialog.addEventListener('pointerup', event => {
    if (backdrop && event.target === dialog && outside(event)) dialog.close();
    backdrop = false;
  }, options);
  dialog.addEventListener('pointercancel', () => { backdrop = false; }, options);
  dialog.addEventListener('close', () => { if (!dialog.open) cleanup(); }, options);
  if (import.meta.hot) import.meta.hot.dispose(() => { dialog.close(); cleanup(); controller.abort(); });
}
