// Shared request guards for the on-demand API routes (contact, guestbook).
// Pure Web APIs only, so handlers run on any adapter and in vitest.

export const json = (status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

/** Same-origin only: Sec-Fetch-Site when the browser sends it, otherwise Origin vs. the request host. */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    return host === new URL(request.url).host || host === request.headers.get('host');
  } catch {
    return false;
  }
}

/**
 * Best-effort fixed-window limit kept in process memory. It holds on a single
 * long-lived Node server; on serverless each instance has its own memory.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 5000, now = Date.now }: { limit: number; windowMs: number; maxKeys?: number; now?: () => number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    /** Returns seconds until retry when the key is over the limit, otherwise 0 and counts the hit. */
    hit(key: string): number {
      const time = now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= time) {
        if (!entry && hits.size >= maxKeys) {
          let nextExpiry = Infinity;
          for (const [k, value] of hits) {
            if (value.resetAt <= time) hits.delete(k);
            else nextExpiry = Math.min(nextExpiry, value.resetAt);
          }
          // Do not evict active buckets: rotating addresses must not reset their
          // limits or grow process memory without a bound.
          if (hits.size >= maxKeys) return Math.max(1, Math.ceil((nextExpiry - time) / 1000));
        }
        hits.set(key, { count: 1, resetAt: time + windowMs });
        return 0;
      }
      if (entry.count >= limit) return Math.ceil((entry.resetAt - time) / 1000);
      entry.count += 1;
      return 0;
    },
  };
}
export type RateLimiter = ReturnType<typeof createRateLimiter>;

/**
 * Same-origin, JSON content type, body size cap, JSON object and honeypot (`trap`).
 * Returns the parsed body, or the error Response to send.
 */
export async function readGuardedJson(request: Request, maxBytes: number): Promise<Record<string, unknown> | Response> {
  if (!isSameOrigin(request)) return json(403, { ok: false, code: 'forbidden_origin' });
  const mediaType = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return json(415, { ok: false, code: 'unsupported_media_type' });
  }
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return json(413, { ok: false, code: 'too_large' });

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    reader = request.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          // Stop at the cap, including chunked requests and understated lengths.
          // A misbehaving source's cancellation must not delay the 413 response.
          void reader.cancel().catch(() => {});
          return json(413, { ok: false, code: 'too_large' });
        }
        chunks.push(value);
      }
    }
  } catch {
    return json(400, { ok: false, code: 'bad_request' });
  } finally {
    reader?.releaseLock();
  }
  const input = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { input.set(chunk, offset); offset += chunk.byteLength; }
  const raw = new TextDecoder().decode(input);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, code: 'bad_request' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { ok: false, code: 'bad_request' });

  // Honeypot: hidden from people, often filled by bots. Rejected honestly, never a fake success.
  const trap = (body as Record<string, unknown>).trap;
  if (typeof trap === 'string' ? trap.trim() !== '' : trap !== undefined) return json(422, { ok: false, code: 'rejected' });
  return body as Record<string, unknown>;
}

/** First zod issue per known field, as `{ field: message }`. */
export function fieldErrors(issues: { path: PropertyKey[]; code: string; message: string }[], fields: string[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    if (fields.includes(field) && !errors[field]) {
      errors[field] = issue.code === 'invalid_type' ? 'This field is required.' : issue.message;
    }
  }
  return errors;
}
