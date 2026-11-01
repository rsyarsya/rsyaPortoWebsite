import { lockScroll, unlockScroll } from './smooth-scroll';
import { applyLanguage } from './language';

const section = document.querySelector<HTMLElement>('#off-the-clock');
const dialog = document.querySelector<HTMLDialogElement>('#off-clock-dialog');
if (section && dialog) setup(section, dialog);

function setup(section: HTMLElement, dialog: HTMLDialogElement) {
  const content = dialog.querySelector<HTMLElement>('[data-off-clock-content]')!;
  const title = dialog.querySelector<HTMLElement>('#off-clock-dialog-title')!;
  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-off-clock-close]')!;
  const photos = section.querySelectorAll('template[id^="off-photo-"]').length;
  let photoIndex: number | null = null;
  let returnTo: HTMLElement | null = null;
  let collection: 'games' | 'books' | null = null;
  let filter = 'all';
  let locked = false;
  const controller = new AbortController();
  const { signal } = controller;

  function render(templateId: string, heading: string) {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) return false;
    content.replaceChildren(template.content.cloneNode(true));
    title.textContent = heading;
    dialog.scrollTop = 0;
    applyLanguage();
    return true;
  }
  function open(trigger: HTMLElement) {
    returnTo = trigger;
    if (!dialog.open) {
      dialog.showModal();
      lockScroll();
      locked = true;
    }
    closeButton.focus({ preventScroll: true });
  }
  function cleanup() {
    if (!locked) return;
    locked = false;
    unlockScroll();
    returnTo?.focus({ preventScroll: true });
    photoIndex = null;
    collection = null;
  }
  function showPhoto(index: number) {
    photoIndex = (index + photos) % photos;
    render(`off-photo-${photoIndex}`, 'Gallery');
  }
  function filterCollection(value: string) {
    filter = value;
    let count = 0;
    content.querySelectorAll<HTMLElement>('.library-item').forEach(item => {
      item.hidden = value !== 'all' && (value === 'formative' ? item.dataset.formative !== 'true' : item.dataset.status !== value);
      if (!item.hidden) count++;
    });
    content.querySelectorAll<HTMLElement>('[data-collection-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.collectionFilter === value)));
    const empty = content.querySelector<HTMLElement>('.filter-empty');
    if (empty) empty.hidden = count !== 0;
  }
  function showCollection() {
    if (!collection) return;
    photoIndex = null;
    render(`off-collection-${collection}`, collection === 'games' ? 'Games' : 'Books');
    filterCollection(filter);
  }
  function showEntry(key: string) {
    photoIndex = null;
    if (!render(`off-entry-${key}`, key.startsWith('game-') ? 'Games' : 'Books')) return;
    if (collection) {
      const back = document.createElement('button');
      back.className = 'collection-back';
      back.textContent = 'Back to collection';
      back.addEventListener('click', () => {
        showCollection();
        const origin = [...content.querySelectorAll<HTMLButtonElement>('[data-entry]')].find(button => button.dataset.entry === key);
        origin?.focus({ preventScroll: true });
      }, { once: true });
      content.prepend(back);
      applyLanguage();
    }
  }
  section.addEventListener('click', event => {
    // A detail render replaces the clicked card before this event bubbles here.
    // The original event path remains reliable even after that card is detached.
    if (event.composedPath().includes(dialog)) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-photo-index],[data-open-collection],[data-entry]') : null;
    if (!target || dialog.contains(target)) return;
    if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    collection = null;
    if (target.dataset.photoIndex !== undefined) showPhoto(Number(target.dataset.photoIndex));
    else if (target.dataset.openCollection === 'games' || target.dataset.openCollection === 'books') {
      collection = target.dataset.openCollection;
      filter = 'all';
      showCollection();
    } else if (target.dataset.entry) showEntry(target.dataset.entry);
    open(target);
  }, { signal });
  dialog.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button') : null;
    if (target?.hasAttribute('data-off-clock-close')) dialog.close();
    else if (target?.dataset.photoStep && photoIndex !== null) {
      const direction = target.dataset.photoStep;
      showPhoto(photoIndex + Number(direction));
      content.querySelector<HTMLButtonElement>(`[data-photo-step="${direction}"]`)?.focus({ preventScroll: true });
    } else if (target?.dataset.collectionFilter) filterCollection(target.dataset.collectionFilter);
    else if (target?.dataset.entry) { showEntry(target.dataset.entry); closeButton.focus({ preventScroll: true }); }
  }, { signal });
  // Native dialog click coordinates distinguish its backdrop from empty inner space.
  let pressedBackdrop = false;
  const outside = (event: PointerEvent) => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  dialog.addEventListener('pointerdown', event => { pressedBackdrop = event.target === dialog && outside(event); }, { signal });
  dialog.addEventListener('pointerup', event => {
    if (pressedBackdrop && event.target === dialog && outside(event)) dialog.close();
    pressedBackdrop = false;
  }, { signal });
  dialog.addEventListener('keydown', event => {
    if (photoIndex === null || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    showPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
    closeButton.focus({ preventScroll: true });
  }, { signal });
  dialog.addEventListener('close', cleanup, { signal });
  if (import.meta.hot) import.meta.hot.dispose(() => { dialog.close(); cleanup(); controller.abort(); });
}
