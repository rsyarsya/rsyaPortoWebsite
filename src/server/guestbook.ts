// Guestbook handlers over libSQL. Pure Request -> Response; the route
// (src/pages/api/guestbook.ts) supplies the client from astro:env.
// Entries store no IP address, user agent or email.
import { z } from 'astro/zod';
import type { Client } from '@libsql/client';
import { normalizeWebsite } from '../lib/website';
import { fieldErrors, json, readGuardedJson, type RateLimiter } from './http';

export const MAX_BODY_BYTES = 8 * 1024;
export const PAGE_SIZE = 20;

export interface GuestbookOptions {
  /** null when GUESTBOOK_DB_URL is not configured. */
  db: Client | null;
  clientAddress?: string;
  limiter?: RateLimiter;
  now?: () => Date;
}

export interface PublicEntry {
  id: string;
  name: string | null;
  website: string | null;
  message: string;
  created_at: string;
}

const optionalText = z.string().nullish().transform(value => value ?? '');

export const entrySchema = z.object({
  name: optionalText.transform(value => value.replace(/[\r\n]+/g, ' '))
    .pipe(z.string().trim().max(80, 'Use 80 characters or fewer.'))
    .transform(value => value || null),
  website: optionalText.pipe(z.string().trim().max(200, 'Use 200 characters or fewer.'))
    .transform((value, ctx) => {
      if (!value) return null;
      const url = normalizeWebsite(value);
      if (!url) {
        ctx.addIssue({ code: 'custom', message: 'Enter a web address, like example.com.' });
        return z.NEVER;
      }
      return url;
    }),
  message: z.string().transform(value => value.replace(/\r\n?/g, '\n'))
    .pipe(z.string().trim().min(1, 'Enter a message.').max(1000, 'Use 1,000 characters or fewer.')),
});

const ready = new WeakMap<Client, Promise<unknown>>();

/** Creates the table on first use (no migration framework). */
export function ensureSchema(db: Client) {
  let pending = ready.get(db);
  if (!pending) {
    pending = db.batch([
      `CREATE TABLE IF NOT EXISTS guestbook_entries (
        id TEXT PRIMARY KEY,
        name TEXT,
        website TEXT,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TEXT NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS guestbook_entries_status_created ON guestbook_entries (status, created_at DESC, id DESC)',
    ], 'write');
    // A failed attempt is retried on the next request.
    pending.catch(() => ready.delete(db));
    ready.set(db, pending);
  }
  return pending;
}

const CURSOR = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)~([0-9a-f-]{36})$/;

function storeError(error: unknown) {
  // Error class only: never log entry contents or driver messages that might echo them.
  console.warn(`[guestbook] store error (${error instanceof Error ? error.name : 'error'}).`);
  return json(500, { ok: false, code: 'store_error' });
}

/** GET: approved entries only, newest first, `?cursor=` pagination, 20 per page. */
export async function listEntries(request: Request, { db }: GuestbookOptions): Promise<Response> {
  if (!db) return json(503, { ok: false, code: 'not_configured' });
  const cursorParam = new URL(request.url).searchParams.get('cursor');
  const cursor = cursorParam ? CURSOR.exec(cursorParam) : null;
  if (cursorParam && !cursor) return json(400, { ok: false, code: 'bad_cursor' });

  try {
    await ensureSchema(db);
    const result = await db.execute(cursor
      ? {
          sql: `SELECT id, name, website, message, created_at FROM guestbook_entries
                WHERE status = 'approved' AND (created_at < ? OR (created_at = ? AND id < ?))
                ORDER BY created_at DESC, id DESC LIMIT ?`,
          args: [cursor[1], cursor[1], cursor[2], PAGE_SIZE + 1],
        }
      : {
          sql: `SELECT id, name, website, message, created_at FROM guestbook_entries
                WHERE status = 'approved' ORDER BY created_at DESC, id DESC LIMIT ?`,
          args: [PAGE_SIZE + 1],
        });
    const rows = result.rows.map(row => ({
      id: String(row.id),
      name: row.name == null ? null : String(row.name),
      website: row.website == null ? null : String(row.website),
      message: String(row.message),
      created_at: String(row.created_at),
    })) satisfies PublicEntry[];
    const entries = rows.slice(0, PAGE_SIZE);
    const last = entries.at(-1);
    const nextCursor = rows.length > PAGE_SIZE && last ? `${last.created_at}~${last.id}` : null;
    // no-store (json default): an approval must show on the next reload; stale-while-revalidate would serve the old list first.
    return json(200, { ok: true, entries, nextCursor });
  } catch (error) {
    return storeError(error);
  }
}

/** POST: guarded, validated, stored as pending. 202 because it is not public until approved. */
export async function createEntry(request: Request, { db, clientAddress = '', limiter, now = () => new Date() }: GuestbookOptions): Promise<Response> {
  const body = await readGuardedJson(request, MAX_BODY_BYTES);
  if (body instanceof Response) return body;

  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) {
    return json(422, { ok: false, code: 'invalid', errors: fieldErrors(parsed.error.issues, ['name', 'website', 'message']) });
  }
  if (!db) return json(503, { ok: false, code: 'not_configured' });

  const retryAfter = limiter?.hit(clientAddress || 'unknown') ?? 0;
  if (retryAfter > 0) return json(429, { ok: false, code: 'rate_limited' }, { 'Retry-After': String(retryAfter) });

  const { name, website, message } = parsed.data;
  try {
    await ensureSchema(db);
    await db.execute({
      sql: `INSERT INTO guestbook_entries (id, name, website, message, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`,
      args: [crypto.randomUUID(), name, website, message, now().toISOString()],
    });
  } catch (error) {
    return storeError(error);
  }
  return json(202, { ok: true, status: 'pending' });
}
