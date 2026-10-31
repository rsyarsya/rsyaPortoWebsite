import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter, handleContact, type ContactOptions } from '../src/server/contact';

const valid = { name: 'Ada\r\nBcc: x@evil.test', email: 'ada@example.com', message: 'Hello there', trap: '' };

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost:4321/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function options(overrides: Partial<ContactOptions> = {}): ContactOptions {
  return {
    config: { apiKey: 're_test', to: 'owner@example.com', from: 'Portfolio <onboarding@resend.dev>' },
    clientAddress: '203.0.113.7',
    limiter: createRateLimiter({ limit: 3, windowMs: 600_000 }),
    fetch: vi.fn(async () => Response.json({ id: 'email_123' })),
    ...overrides,
  };
}

describe('POST /api/contact', () => {
  it('rejects invalid fields with per-field errors', async () => {
    const res = await handleContact(request({ name: ' ', email: 'nope', message: '' }), options());
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe('invalid');
    expect(Object.keys(data.errors).sort()).toEqual(['email', 'message', 'name']);
  });

  it('returns 503 not_configured without an API key and never calls the provider', async () => {
    const opts = options({ config: { to: 'owner@example.com', from: 'x <a@b.dev>' } });
    const res = await handleContact(request(valid), opts);
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('not_configured');
    expect(opts.fetch).not.toHaveBeenCalled();
  });

  it('rejects a filled honeypot', async () => {
    const opts = options();
    const res = await handleContact(request({ ...valid, trap: 'http://spam.test' }), opts);
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('rejected');
    expect(opts.fetch).not.toHaveBeenCalled();
  });

  it('rejects cross-site and origin-less requests', async () => {
    const crossSite = await handleContact(request(valid, { 'Sec-Fetch-Site': 'cross-site' }), options());
    expect(crossSite.status).toBe(403);
    const noHeaders = new Request('http://localhost:4321/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(valid),
    });
    expect((await handleContact(noHeaders, options())).status).toBe(403);
    const otherOrigin = new Request('http://localhost:4321/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test' }, body: JSON.stringify(valid),
    });
    expect((await handleContact(otherOrigin, options())).status).toBe(403);
  });

  it('sends to the server recipient with the visitor as reply_to, ignoring a client "to"', async () => {
    const opts = options();
    const res = await handleContact(request({ ...valid, to: 'victim@example.com' }), opts);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const [url, init] = (opts.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    const sent = JSON.parse(init.body);
    expect(sent.to).toEqual(['owner@example.com']);
    expect(sent.reply_to).toBe('ada@example.com');
    expect(sent.subject).not.toMatch(/[\r\n]/);
    expect(sent.text).toContain('Hello there');
  });

  it('returns 502 when the provider fails, and 429 after the rate limit', async () => {
    const failing = options({ fetch: vi.fn(async () => Response.json({ message: 'nope' }, { status: 403 })) });
    expect((await handleContact(request(valid), failing)).status).toBe(502);

    const opts = options();
    for (let i = 0; i < 3; i++) expect((await handleContact(request(valid), opts)).status).toBe(200);
    const limited = await handleContact(request(valid), opts);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
  });
});
