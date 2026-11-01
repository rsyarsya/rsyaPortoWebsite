import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJson } from '../src/lib/request-json';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('API read deadlines', () => {
  it('returns HTTP error JSON for the UI to explain and clears the deadline', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'not_configured' }, { status: 503 })));
    const { response, data } = await requestJson('/api/example');
    expect(response.status).toBe(503);
    expect(data).toEqual({ code: 'not_configured' });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('aborts a request that never receives headers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
    })));
    const pending = requestJson('/api/example', {}, 1000);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps the deadline active while the response body is stalled', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async (_url, init: RequestInit) => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"unfinished":'));
        init.signal!.addEventListener('abort', () => controller.error(init.signal!.reason), { once: true });
      },
    }))));
    const pending = requestJson('/api/example', {}, 1000);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
  it('forwards cancellation without changing the caller signal', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      if (init.signal!.aborted) reject(init.signal!.reason);
      else init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
    })));
    const owner = new AbortController();
    const pending = requestJson('/api/example', { signal: owner.signal });
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    owner.abort();
    await assertion;
    expect(owner.signal.aborted).toBe(true);
  });
  it('rejects malformed JSON and leaves no pending timer', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not JSON')));
    await expect(requestJson('/api/example')).rejects.toBeInstanceOf(SyntaxError);
    expect(vi.getTimerCount()).toBe(0);
  });
});
