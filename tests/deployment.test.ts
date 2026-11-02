import { expect, it, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createSharedRateLimiter } from '../src/server/shared-rate-limit';
import { checkRateLimit } from '../src/server/http';
import { handleContact } from '../src/server/contact';
import { createEntry } from '../src/server/guestbook';
import { databaseFactory } from '../src/server/database';
import { canonicalUrl, isProductionSite } from '../src/lib/site';

it('only indexes production and always canonicalizes to the owned apex domain', () => {
  for (const env of [undefined, 'development', 'preview']) expect(isProductionSite(env)).toBe(false);
  expect(isProductionSite('production')).toBe(true);
  expect(canonicalUrl('/guestbook/')).toBe('https://rasyadwaarsya.my.id/guestbook/');
});
it('rejects local or unauthenticated databases on hosted functions', () => {
  expect(databaseFactory('file:.data/guestbook.db', undefined, true)()).toBeNull();
  expect(databaseFactory('libsql://test.turso.io', '', true)()).toBeNull();
  expect(databaseFactory(undefined, undefined, true)()).toBeNull();
});
it('limits concurrent calls from independent clients against one shared database', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'portfolio-limiter-'));
  const url = `file:${join(dir, 'limits.db')}`;
  try {
    // A child process releases libSQL's native Windows file handles before cleanup.
    const script = `
      import { createClient } from '@libsql/client';
      import { createSharedRateLimiter } from './src/server/shared-rate-limit.ts';
      const a = createClient({ url: process.argv[1] }), b = createClient({ url: process.argv[1] });
      let time = 1000;
      const config = { secret: 'test-only-secret-with-at-least-32-characters', scope: 'contact', limit: 3, windowMs: 10000, now: () => time };
      const first = createSharedRateLimiter({ ...config, db: () => a });
      const second = createSharedRateLimiter({ ...config, db: () => b });
      await a.execute('PRAGMA busy_timeout=3000'); await b.execute('PRAGMA busy_timeout=3000');
      await first.hit('warmup'); await second.hit('warmup'); await a.execute('DELETE FROM request_limits');
      const results = await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? first : second).hit('203.0.113.7')));
      const separateScope = await createSharedRateLimiter({ ...config, db: () => b, scope: 'guestbook' }).hit('203.0.113.7');
      const rows = (await a.execute('SELECT key, hits FROM request_limits')).rows;
      time += 10001;
      const reset = await second.hit('203.0.113.7');
      const remaining = (await a.execute('SELECT key FROM request_limits')).rows.length;
      a.close(); b.close();
      console.log(JSON.stringify({ results, separateScope, rows, reset, remaining }));
    `;
    const result = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script, url], { encoding: 'utf8', timeout: 15000 }));
    expect(result.results.filter((x: number) => x === 0)).toHaveLength(3);
    expect(result.results.filter((x: number) => x === 10)).toHaveLength(9);
    expect(result.separateScope).toBe(0);
    expect(JSON.stringify(result.rows)).not.toContain('203.0.113.7');
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row: { hits: number }) => Number(row.hits) <= 3)).toBe(true);
    expect(result.reset).toBe(0); expect(result.remaining).toBe(1);
  } finally {
    if (!dir.startsWith(join(tmpdir(), 'portfolio-limiter-'))) throw new Error('Unexpected temp path');
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}, 20000);

it('fails closed when the shared store is unavailable, without email or guestbook side effects', async () => {
  const limiter = { hit: async () => { throw new Error('offline'); } };
  expect((await checkRateLimit(limiter, 'client'))?.status).toBe(503);
  const request = (path: string, body: object) => new Request('https://rasyadwaarsya.my.id/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' }, body: JSON.stringify(body) });
  const send = vi.fn();
  const mail = await handleContact(request('contact', { name: 'Test', email: 'test@example.com', message: 'Test' }), { config: { apiKey: 're_test', from: 'from@example.com', to: 'to@example.com' }, limiter, clientAddress: 'client', fetch: send });
  expect(mail.status).toBe(503); expect(send).not.toHaveBeenCalled();
  const db = createClient({ url: ':memory:' });
  try {
    expect((await createEntry(request('guestbook', { message: 'Test' }), { db, limiter })).status).toBe(503);
    expect((await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows).toHaveLength(0);
  } finally { db.close(); }
});
it('does not fall back to local limiting when hosted config is incomplete', async () => {
  const limiter = createSharedRateLimiter({ db: () => null, scope: 'contact' });
  expect((await checkRateLimit(limiter, 'client'))?.status).toBe(503);
});

it('blocks incomplete production builds and accepts complete configuration without exposing values', () => {
  const env = { ...process.env, VERCEL_ENV: 'production', RESEND_API_KEY: '', CONTACT_FROM_EMAIL: '', GUESTBOOK_DB_URL: '', GUESTBOOK_DB_AUTH_TOKEN: '', RATE_LIMIT_SECRET: '' };
  const blocked = spawnSync(process.execPath, ['scripts/check-deploy-env.mjs'], { env, encoding: 'utf8' });
  expect(blocked.status).toBe(1);
  expect(blocked.stderr).toContain('CONTACT_FROM_EMAIL is required');
  const good = { ...env, RESEND_API_KEY: 're_test_only', CONTACT_FROM_EMAIL: 'Portfolio <hello@example.test>', GUESTBOOK_DB_URL: 'libsql://test.example.test', GUESTBOOK_DB_AUTH_TOKEN: 'test-token-only', RATE_LIMIT_SECRET: 'test-only-secret-with-at-least-32-characters' };
  const ready = spawnSync(process.execPath, ['scripts/check-deploy-env.mjs'], { env: good, encoding: 'utf8' });
  expect(ready.status).toBe(0);
  expect(ready.stdout).not.toContain(good.RATE_LIMIT_SECRET);
  for (const invalid of [{ GUESTBOOK_DB_URL: 'file:test.db' }, { CONTACT_FROM_EMAIL: 'onboarding@resend.dev' }, { RATE_LIMIT_SECRET: 'short' }]) {
    expect(spawnSync(process.execPath, ['scripts/check-deploy-env.mjs'], { env: { ...good, ...invalid }, encoding: 'utf8' }).status).toBe(1);
  }
});
