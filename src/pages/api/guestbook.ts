import type { APIRoute } from 'astro';
import { createClient, type Client } from '@libsql/client';
import { GUESTBOOK_DB_URL, GUESTBOOK_DB_AUTH_TOKEN } from 'astro:env/server';
import { createRateLimiter } from '../../server/http';
import { createEntry, listEntries } from '../../server/guestbook';

export const prerender = false;

// 3 notes per client address per 10 minutes (in-memory, best-effort).
const limiter = createRateLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });

let client: Client | null | undefined;

/** One client per process; null when the DB is not configured or the URL is unusable. */
function db(): Client | null {
  if (client !== undefined) return client;
  const url = GUESTBOOK_DB_URL?.trim();
  try {
    client = url ? createClient({ url, authToken: GUESTBOOK_DB_AUTH_TOKEN?.trim() || undefined }) : null;
  } catch (error) {
    console.warn(`[guestbook] invalid GUESTBOOK_DB_URL (${error instanceof Error ? error.name : 'error'}).`);
    client = null;
  }
  return client;
}

export const GET: APIRoute = ({ request }) => listEntries(request, { db: db() });

export const POST: APIRoute = ({ request, clientAddress }) =>
  createEntry(request, { db: db(), clientAddress, limiter });
