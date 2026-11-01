// Contact form handler. Pure Request -> Response so it runs on any adapter and
// can be tested without the Astro runtime. The route (src/pages/api/contact.ts)
// supplies configuration from astro:env.
import { z } from 'astro/zod';
import { fieldErrors, json, readGuardedJson, type RateLimiter } from './http';

// Re-exported so existing imports (route, tests) keep working.
export { createRateLimiter, isSameOrigin, type RateLimiter } from './http';

export interface ContactConfig {
  apiKey?: string;
  to: string;
  from: string;
}

export interface ContactOptions {
  config: ContactConfig;
  clientAddress: string;
  limiter: RateLimiter;
  fetch?: typeof fetch;
}

export const MAX_BODY_BYTES = 16 * 1024;

const singleLine = (value: string) => value.replace(/[\r\n]+/g, ' ');

export const contactSchema = z.object({
  name: z.string().transform(singleLine).pipe(z.string().trim().min(1, 'Enter your name.').max(80, 'Use 80 characters or fewer.')),
  email: z.string().trim().min(1, 'Enter your email address.').max(254, 'Use 254 characters or fewer.')
    .pipe(z.email('Enter a valid email address, like name@example.com.')),
  message: z.string().transform(value => value.replace(/\r\n?/g, '\n'))
    .pipe(z.string().trim().min(1, 'Enter a message.').max(2000, 'Use 2,000 characters or fewer.')),
});

export type ContactFields = z.infer<typeof contactSchema>;

export async function handleContact(request: Request, options: ContactOptions): Promise<Response> {
  const body = await readGuardedJson(request, MAX_BODY_BYTES);
  if (body instanceof Response) return body;

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return json(422, { ok: false, code: 'invalid', errors: fieldErrors(parsed.error.issues, ['name', 'email', 'message']) });
  }

  const { apiKey, to, from } = options.config;
  if (!apiKey?.trim() || !to.trim() || !from.trim()) return json(503, { ok: false, code: 'not_configured' });

  const submissionId = request.headers.get('Idempotency-Key');
  if (submissionId !== null && !z.uuid().safeParse(submissionId).success) return json(400, { ok: false, code: 'bad_request' });

  const retryAfter = options.limiter.hit(options.clientAddress || 'unknown');
  if (retryAfter > 0) return json(429, { ok: false, code: 'rate_limited' }, { 'Retry-After': String(retryAfter) });

  const { name, email, message } = parsed.data;
  const doFetch = options.fetch ?? fetch;
  const payload = JSON.stringify({
    from,
    to: [to],
    reply_to: email,
    subject: `Portfolio message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}\n`,
  });
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' };
    if (submissionId) {
      // Scope replay to this exact normalized mail, including its server-owned
      // recipient. A reused visitor key must never replay a different message.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      headers['Idempotency-Key'] = `portfolio-contact/${submissionId}/${hash}`;
    }
    const response = await doFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json().catch(() => null)) as { id?: unknown; name?: unknown } | null;
    if (response.ok && typeof result?.id === 'string' && result.id) return json(200, { ok: true });
    // Status only: never log the message, names or email addresses.
    console.warn(`[contact] mail provider rejected the request (HTTP ${response.status}).`);
    if (response.status === 409 && result?.name === 'concurrent_idempotent_requests') return json(409, { ok: false, code: 'delivery_pending' });
    if (response.ok || response.status >= 500) return json(502, { ok: false, code: 'delivery_unknown' });
  } catch (error) {
    console.warn(`[contact] mail provider unreachable (${error instanceof Error ? error.name : 'error'}).`);
    return json(502, { ok: false, code: 'delivery_unknown' });
  }
  return json(502, { ok: false, code: 'send_failed' });
}
