import type { APIRoute } from 'astro';
import { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } from 'astro:env/server';
import { profile } from '../../data/profile';
import { handleContact } from '../../server/contact';

import { limiterFor } from '../../server/runtime';

export const prerender = false;

const limiter = limiterFor('contact');

export const POST: APIRoute = ({ request, clientAddress }) =>
  handleContact(request, {
    config: {
      apiKey: RESEND_API_KEY,
      // The recipient comes from server configuration only, never from the request.
      to: CONTACT_TO_EMAIL || profile.email,
      from: CONTACT_FROM_EMAIL || (process.env.VERCEL === '1' ? '' : 'Portfolio <onboarding@resend.dev>'),
    },
    clientAddress,
    limiter,
  });
