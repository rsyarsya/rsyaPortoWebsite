import { beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { createRateLimiter } from '../src/server/http';
import { createEntry, listEntries } from '../src/server/guestbook';

const url = 'http://localhost:4321/api/guestbook';
const post = (body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' },
    body: JSON.stringify(body),
  });

let db: Client;
beforeEach(() => { db = createClient({ url: ':memory:' }); });
const opts = () => ({ db, clientAddress: '203.0.113.7', limiter: createRateLimiter({ limit: 100, windowMs: 60_000 }) });

describe('/api/guestbook', () => {
  it('rejects invalid fields, including a javascript: website', async () => {
    const res = await createEntry(post({ name: 'x'.repeat(81), website: 'javascript:alert(1)', message: '  ' }), opts());
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(Object.keys(data.errors).sort()).toEqual(['message', 'name', 'website']);
  });

  it('stores a valid note as pending with a normalized website, and GET hides it until approved', async () => {
    const res = await createEntry(post({ name: ' Ada ', website: 'Example.com', message: '<img src=x onerror=alert(1)>', trap: '' }), opts());
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, status: 'pending' });

    const stored = await db.execute('SELECT name, website, message, status FROM guestbook_entries');
    expect(stored.rows[0]).toMatchObject({ name: 'Ada', website: 'https://example.com/', status: 'pending' });

    const hidden = await (await listEntries(new Request(url), { db })).json();
    expect(hidden.entries).toEqual([]);

    await db.execute("UPDATE guestbook_entries SET status = 'approved'");
    const shown = await (await listEntries(new Request(url), { db })).json();
    expect(shown.entries).toHaveLength(1);
    expect(Object.keys(shown.entries[0]).sort()).toEqual(['created_at', 'id', 'message', 'name', 'website']);
    expect(shown.entries[0].message).toBe('<img src=x onerror=alert(1)>');
  });

  it('paginates approved notes 20 at a time, newest first', async () => {
    let tick = Date.UTC(2026, 9, 1);
    const options = { ...opts(), now: () => new Date((tick += 1000)) };
    for (let i = 0; i < 21; i++) expect((await createEntry(post({ message: `note ${i}` }), options)).status).toBe(202);
    await db.execute("UPDATE guestbook_entries SET status = 'approved'");

    const first = await (await listEntries(new Request(url), { db })).json();
    expect(first.entries).toHaveLength(20);
    expect(first.entries[0].message).toBe('note 20');
    const second = await (await listEntries(new Request(`${url}?cursor=${encodeURIComponent(first.nextCursor)}`), { db })).json();
    expect(second.entries.map((e: { message: string }) => e.message)).toEqual(['note 0']);
    expect(second.nextCursor).toBeNull();
  });

  it('answers 503 not_configured without a database', async () => {
    const get = await listEntries(new Request(url), { db: null });
    expect(get.status).toBe(503);
    expect((await get.json()).code).toBe('not_configured');
    const res = await createEntry(post({ message: 'hi' }), { ...opts(), db: null });
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('not_configured');
  });
});
