import { createHmac } from 'node:crypto';
import type { Client } from '@libsql/client';
import type { RateLimiter } from './http';

/** Atomic fixed windows shared by every serverless instance. Raw IPs are never stored. */
export function createSharedRateLimiter({ db, secret, scope, limit = 3, windowMs = 600_000, now = Date.now }: {
  db: () => Client | null; secret?: string; scope: string; limit?: number; windowMs?: number; now?: () => number;
}): RateLimiter {
  let schema: Promise<unknown> | undefined;
  return {
    async hit(address) {
      const client = db();
      if (!client || !secret || secret.length < 32) throw new Error('Shared limiter is not configured');
      schema ??= client.batch([
        `CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL)`,
        `CREATE INDEX IF NOT EXISTS request_limits_expiry ON request_limits(reset_at)`,
      ], 'write').catch(error => { schema = undefined; throw error; });
      await schema;
      const time = now();
      const key = `${scope}:${createHmac('sha256', secret).update(address).digest('hex')}`;
      const results = await client.batch([
        { sql: 'DELETE FROM request_limits WHERE reset_at <= ?', args: [time] },
        {
          sql: `INSERT INTO request_limits (key, hits, reset_at) VALUES (?, 1, ?)
            ON CONFLICT(key) DO UPDATE SET hits = request_limits.hits + 1
            WHERE request_limits.hits < ? RETURNING hits, reset_at`,
          args: [key, time + windowMs, limit],
        },
        { sql: 'SELECT reset_at FROM request_limits WHERE key = ?', args: [key] },
      ], 'write');
      return results[1].rows.length ? 0 : Math.max(1, Math.ceil((Number(results[2].rows[0]?.reset_at ?? time + windowMs) - time) / 1000));
    },
  };
}
