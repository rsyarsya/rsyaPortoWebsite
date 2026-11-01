import { lockScroll, unlockScroll } from './smooth-scroll';
import { applyLanguage } from './language';
import { latestRequest, swipeStep } from '../lib/gallery-navigation';

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

  const photoRequest = latestRequest<void>();
  const loaded = new Map<string, Promise<void>>();
  let animation: Animation | null = null;
  let outgoing: HTMLImageElement | null = null;
  function finishTransition() {
    animation?.cancel();
    animation = null;
    outgoing?.remove();
    outgoing = null;
  }
  function loadImage(src: string): Promise<void> {
    const cached = loaded.get(src);
    if (cached) return cached;
    const pending = new Promise<void>((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => done(false), 15000);
      const done = (ok: boolean) => {
        clearTimeout(timer);
        image.onload = image.onerror = null;
        if (ok) resolve(); else reject(new Error('Image unavailable'));
      };
      image.onload = () => { image.decode().then(() => done(true), () => done(false)); };
      image.onerror = () => done(false);
      image.src = src;
    });
    loaded.set(src, pending);
    void pending.catch(() => { if (loaded.get(src) === pending) loaded.delete(src); });
    return pending;
  }
  function photoTemplate(index: number) {
    return document.querySelector<HTMLTemplateElement>(`#off-photo-${index}`)!;
  }
  function preloadNeighbors(index: number) {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    for (const step of [-1, 1]) {
      const src = photoTemplate((index + step + photos) % photos).content.querySelector('img')!.src;
      void loadImage(src).catch(() => {});
    }
  }

  function render(templateId: string, heading: string) {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) return false;
    photoRequest.invalidate();
    finishTransition();
    delete dialog.dataset.gallery;
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
      // A native close event may still be queued when the dialog reopens.
      // Reuse that session's lock until the current opening actually closes.
      if (!locked) lockScroll();
      locked = true;
    }
    closeButton.focus({ preventScroll: true });
  }
  function cleanup() {
    if (!locked) return;
    photoRequest.invalidate();
    finishTransition();
    pointers.clear();
    gesture = null;
    locked = false;
    unlockScroll();
    returnTo?.focus({ preventScroll: true });
    photoIndex = null;
    collection = null;
  }
  function showPhoto(index: number) {
    if (!photos) return;
    photoIndex = (index + photos) % photos;
    const requested = photoIndex;
    if (!dialog.dataset.gallery) {
      render(`off-photo-${requested}`, 'Gallery');
      dialog.dataset.gallery = 'true';
      const figure = content.querySelector('figure')!;
      const stage = document.createElement('div');
      stage.className = 'photo-stage';
      figure.querySelector('img')!.remove();
      figure.prepend(stage);
      const feedback = document.createElement('div');
      feedback.className = 'photo-feedback';
      feedback.innerHTML = '<span role="status" data-photo-status></span><button data-photo-retry hidden>Try again</button>';
      content.append(feedback);
    }
    finishTransition();
    const stage = content.querySelector<HTMLElement>('.photo-stage')!;
    const status = content.querySelector<HTMLElement>('[data-photo-status]')!;
    const retry = content.querySelector<HTMLButtonElement>('[data-photo-retry]')!;
    status.textContent = 'Loading photo…';
    if (document.activeElement === retry) closeButton.focus({ preventScroll: true });
    retry.hidden = true;
    stage.setAttribute('aria-busy', 'true');
    applyLanguage();
    const template = photoTemplate(requested);
    const sourceImage = template.content.querySelector('img')!;
    void photoRequest.run(() => loadImage(sourceImage.src), () => {
      const old = stage.querySelector('img');
      const image = sourceImage.cloneNode(true) as HTMLImageElement;
      image.draggable = false;
      stage.replaceChildren(image);
      if (old && document.documentElement.dataset.motion !== 'reduce') {
        outgoing = old;
        old.classList.add('photo-outgoing');
        old.setAttribute('aria-hidden', 'true');
        stage.prepend(old);
        animation = image.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
        void animation.finished.then(finishTransition, () => {});
      }
      const caption = template.content.querySelector('figcaption')!.cloneNode(true);
      content.querySelector('figcaption')!.replaceWith(caption);
      content.querySelector('.photo-counter')!.textContent = `${requested + 1} / ${photos}`;
      status.textContent = '';
      stage.setAttribute('aria-busy', 'false');
      applyLanguage();
      preloadNeighbors(requested);
    }, () => {
      stage.setAttribute('aria-busy', 'false');
      status.textContent = 'This photo could not be loaded.';
      retry.hidden = false;
      applyLanguage();
    });
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
    } else if (target?.hasAttribute('data-photo-retry') && photoIndex !== null) showPhoto(photoIndex);
    else if (target?.dataset.collectionFilter) filterCollection(target.dataset.collectionFilter);
    else if (target?.dataset.entry) { showEntry(target.dataset.entry); closeButton.focus({ preventScroll: true }); }
  }, { signal });
  const pointers = new Set<number>();
  let gesture: { id: number; x: number; y: number } | null = null;
  dialog.addEventListener('pointerdown', event => {
    pointers.add(event.pointerId);
    if (pointers.size > 1) { gesture = null; return; }
    if (photoIndex === null || event.button !== 0 || !(event.target instanceof Element) || !event.target.closest('.photo-stage')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    (event.target.closest('.photo-stage') as HTMLElement).setPointerCapture(event.pointerId);
  }, { signal });
  dialog.addEventListener('pointerup', event => {
    pointers.delete(event.pointerId);
    const start = gesture;
    gesture = null;
    if (!start || start.id !== event.pointerId || photoIndex === null) return;
    const step = swipeStep(event.clientX - start.x, event.clientY - start.y);
    if (step) showPhoto(photoIndex + step);
  }, { signal });
  dialog.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); gesture = null; }, { signal });
  dialog.addEventListener('lostpointercapture', () => { gesture = null; }, { signal });

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
  }, { signal });
  dialog.addEventListener('close', () => { if (!dialog.open) cleanup(); }, { signal });
  if (import.meta.hot) import.meta.hot.dispose(() => { dialog.close(); cleanup(); controller.abort(); });
}
