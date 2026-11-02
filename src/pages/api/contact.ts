import type { APIRoute } from 'astro';
import { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } from 'astro:env/server';
import { CONTACT_FORM_ENABLED } from '../../lib/contact-mode';
import { json } from '../../server/http';
import { profile } from '../../data/profile';
import { handleContact } from '../../server/contact';

import { safeClientAddress } from '../../server/client-address';
import { limiterFor } from '../../server/runtime';

export const prerender = false;

const limiter = limiterFor('contact');

export const POST: APIRoute = context => !CONTACT_FORM_ENABLED
  ? json(503, { ok: false, code: 'not_configured' })
  : handleContact(context.request, {
    config: {
      apiKey: RESEND_API_KEY,
      // The recipient comes from server configuration only, never from the request.
      to: CONTACT_TO_EMAIL || profile.email,
      from: CONTACT_FROM_EMAIL || (process.env.VERCEL === '1' ? '' : 'Portfolio <onboarding@resend.dev>'),
    },
    clientAddress: safeClientAddress(context),
    limiter,
  });
