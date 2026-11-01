import { describe, expect, it } from 'vitest';
import { createRateLimiter, readGuardedJson } from '../src/server/http';

const headers = { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };
function request(body: BodyInit | null, extra: Record<string, string> = {}) {
  return new Request('https://portfolio.test/api/contact', { method: 'POST', headers: { ...headers, ...extra }, body, duplex: 'half' } as RequestInit);
}
async function status(result: Record<string, unknown> | Response) { return result instanceof Response ? result.status : 200; }

describe('shared JSON body limits', () => {
  it('accepts JSON with a charset, but rejects a lookalike media type', async () => {
    expect(await readGuardedJson(request('{"message":"hi"}', { 'content-type': 'Application/JSON; charset=utf-8' }), 40)).toEqual({ message: 'hi' });
    expect(await status(await readGuardedJson(request('{}', { 'content-type': 'application/jsonp' }), 40))).toBe(415);
  });
  it('rejects an oversized declared body before reading it', async () => {
    const source = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([123])); } });
    expect(await status(await readGuardedJson(request(source, { 'content-length': '100' }), 20))).toBe(413);
  });
  it('stops pulling and cancels an oversized stream without trusting Content-Length', async () => {
    let pulls = 0;
    let cancelled = false;
    const source = new ReadableStream({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(16)); if (pulls === 20) controller.close(); }, cancel() { cancelled = true; } }, { highWaterMark: 0 });
    expect(await status(await readGuardedJson(request(source, { 'content-length': '2' }), 32))).toBe(413);
    expect(pulls).toBe(3);
    expect(cancelled).toBe(true);
  });
  it('counts UTF-8 bytes and decodes multibyte characters across chunk boundaries', async () => {
    const encoded = new TextEncoder().encode('{"text":"海🌊"}');
    const source = new ReadableStream({ start(controller) { for (const byte of encoded) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
    expect(await readGuardedJson(request(source), encoded.length)).toEqual({ text: '海🌊' });
    expect(await status(await readGuardedJson(request('{"text":"海🌊"}'), encoded.length - 1))).toBe(413);
  });
  it('returns a client error for a broken stream or empty/non-object body', async () => {
    const source = new ReadableStream({ start(controller) { controller.error(new Error('disconnected')); } });
    expect(await status(await readGuardedJson(request(source), 32))).toBe(400);
    for (const body of [null, 'null', '[]', 'false', '"text"']) expect(await status(await readGuardedJson(request(body), 32))).toBe(400);
    const consumed = request('{}');
    await consumed.text();
    expect(await status(await readGuardedJson(consumed, 32))).toBe(400);
  });
});

describe('bounded rate limit storage', () => {
  it('keeps active limits when capacity is reached and reclaims expired buckets', () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 10_000, maxKeys: 2, now: () => time });
    expect(limiter.hit('first')).toBe(0);
    expect(limiter.hit('second')).toBe(0);
    expect(limiter.hit('new-address')).toBe(10);
    expect(limiter.hit('first')).toBe(0);
    expect(limiter.hit('first')).toBe(10);
    time = 10_000;
    expect(limiter.hit('new-address')).toBe(0);
    expect(limiter.hit('another-address')).toBe(0);
    expect(limiter.hit('third-address')).toBe(10);
  });
});
