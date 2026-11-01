/** A horizontal gesture must clear the threshold and dominate vertical movement. */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  return Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.25 ? (dx < 0 ? 1 : -1) : 0;
}

/** Ignore completions belonging to an earlier navigation or a closed dialog. */
export function latestRequest<T>() {
  let version = 0;
  return {
    invalidate() { version++; },
    async run(load: () => Promise<T>, ready: (value: T) => void, failed: () => void) {
      const current = ++version;
      try {
        const value = await load();
        if (current === version) ready(value);
      } catch {
        if (current === version) failed();
      }
    },
  };
}
