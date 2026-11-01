import { translateText } from '../lib/translations';

// This bridge translates curated UI copy, including late API/form states, while
// leaving visitor input and externally supplied names/messages untouched.
const excluded = 'script,style,noscript,textarea,input,[translate="no"],.entry-name:not([data-site-copy]),.entry-message,[data-np-art]';
const texts = new WeakMap<Text, { source: string; rendered: string }>();
const attributes = new WeakMap<Element, Map<string, { source: string; rendered: string }>>();
const names = ['aria-label', 'title', 'placeholder', 'content'];
let queued = false;
let disposed = false;
const observer = new MutationObserver(() => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; applyLanguage(); });
});

export function applyLanguage(): void {
  if (disposed) return;
  observer.disconnect();
  const language = document.documentElement.dataset.language === 'id' ? 'id' : 'en';
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    if (!text.textContent?.trim() || text.parentElement?.closest(excluded)) continue;
    const previous = texts.get(text);
    const source = previous?.rendered === text.data ? previous.source : text.data;
    const rendered = translateText(source, language);
    if (text.data !== rendered) text.data = rendered;
    texts.set(text, { source, rendered });
  }
  for (const element of document.querySelectorAll('[aria-label],[title],[placeholder],meta[name="description"],meta[property="og:description"],meta[property="og:title"]')) {
    if (element.closest('[translate="no"],.entry-name:not([data-site-copy]),.entry-message,[data-np-art]')) continue;
    const records = attributes.get(element) ?? new Map();
    for (const name of names) {
      const value = element.getAttribute(name);
      if (value === null) continue;
      const previous = records.get(name);
      const source = previous?.rendered === value ? previous.source : value;
      const rendered = translateText(source, language);
      if (value !== rendered) element.setAttribute(name, rendered);
      records.set(name, { source, rendered });
    }
    attributes.set(element, records);
  }
  observer.observe(document.documentElement, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: names});
}

queueMicrotask(applyLanguage);
if (import.meta.hot) import.meta.hot.dispose(() => { disposed = true; observer.disconnect(); });
