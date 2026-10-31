import type { APIRoute } from 'astro';
import { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } from 'astro:env/server';
import { profile } from '../../data/profile';
import { createRateLimiter, handleContact } from '../../server/contact';

export const prerender = false;

// 3 messages per client address per 10 minutes (in-memory, best-effort).
const limiter = createRateLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });

export const POST: APIRoute = ({ request, clientAddress }) =>
  handleContact(request, {
    config: {
      apiKey: RESEND_API_KEY,
      // The recipient comes from server configuration only, never from the request.
      to: CONTACT_TO_EMAIL || profile.email,
      from: CONTACT_FROM_EMAIL || 'Portfolio <onboarding@resend.dev>',
    },
    clientAddress,
    limiter,
  });
