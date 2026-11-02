import { describe, expect, it } from 'vitest';
import { latestRequest, swipeStep } from '../src/lib/gallery-navigation';

describe('gallery gestures', () => {
  it('requires a deliberate horizontal gesture', () => {
    expect(swipeStep(-50, 0)).toBe(1);
    expect(swipeStep(70, 20)).toBe(-1);
    expect(swipeStep(-49, 0)).toBe(0);
    expect(swipeStep(60, 80)).toBe(0);
    expect(swipeStep(50, 50)).toBe(0);
  });
});
describe('gallery loading', () => {
  it('only commits the latest navigation even if earlier work finishes later', async () => {
    const requests = latestRequest<string>();
    const shown: string[] = [];
    let resolve!: (value: string) => void;
    const first = requests.run(() => new Promise<string>(r => { resolve = r; }), x => shown.push(x), () => shown.push('error'));
    await requests.run(() => Promise.resolve('second'), x => shown.push(x), () => shown.push('error'));
    resolve('first'); await first;
    expect(shown).toEqual(['second']);
  });
  it('ignores failures after closing and permits retry after a current failure', async () => {
    const requests = latestRequest<string>();
    const shown: string[] = [];
    let reject!: () => void;
    const stale = requests.run(() => new Promise<string>((_, r) => { reject = r; }), x => shown.push(x), () => shown.push('stale error'));
    requests.invalidate(); reject(); await stale;
    await requests.run(() => Promise.reject(), x => shown.push(x), () => shown.push('error'));
    await requests.run(() => Promise.resolve('retry'), x => shown.push(x), () => shown.push('error'));
    expect(shown).toEqual(['error', 'retry']);
  });
  it('does not commit a successful load after leaving gallery mode', async () => {
    const requests = latestRequest<string>();
    let resolve!: (value: string) => void;
    const shown: string[] = [];
    const pending = requests.run(() => new Promise<string>(r => { resolve = r; }), x => shown.push(x), () => shown.push('error'));
    requests.invalidate(); resolve('photo'); await pending;
    expect(shown).toEqual([]);
  });
});
