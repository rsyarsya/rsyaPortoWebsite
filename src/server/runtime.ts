import { GUESTBOOK_DB_URL, GUESTBOOK_DB_AUTH_TOKEN, RATE_LIMIT_SECRET } from 'astro:env/server';
import { databaseFactory } from './database';
import { createRateLimiter } from './http';
import { createSharedRateLimiter } from './shared-rate-limit';

const hosted = process.env.VERCEL === '1';
export const database = databaseFactory(GUESTBOOK_DB_URL, GUESTBOOK_DB_AUTH_TOKEN, hosted);
export const limiterFor = (scope: string) => hosted
  ? createSharedRateLimiter({ db: database, secret: RATE_LIMIT_SECRET, scope })
  : createRateLimiter({ limit: 3, windowMs: 600_000 });
