// Shared motion budget for decorative animation loops.
//
// Contract: while the contact water scene is animating (on screen, tab visible,
// html[data-motion='full']), <html> carries the `data-scene-active` attribute.
// Other decorative loops can use this signal to reduce their work. The ASCII
// ocean drops to 10fps while a scene is active, keeping the background continuous.
// Subscribe with onSceneActiveChange() instead of polling; the attribute is
// also visible to CSS and to browser tests.
const root = document.documentElement;
const ATTRIBUTE = 'data-scene-active';

export function isSceneActive(): boolean {
  return root.hasAttribute(ATTRIBUTE);
}

export function setSceneActive(active: boolean): void {
  if (active !== isSceneActive()) root.toggleAttribute(ATTRIBUTE, active);
}

// Calls `listener` whenever the scene starts or stops. Returns an unsubscribe.
export function onSceneActiveChange(listener: (active: boolean) => void): () => void {
  const observer = new MutationObserver(() => listener(isSceneActive()));
  observer.observe(root, { attributes: true, attributeFilter: [ATTRIBUTE] });
  return () => observer.disconnect();
}
