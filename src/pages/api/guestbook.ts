import type { APIRoute } from 'astro';
import { createEntry, listEntries } from '../../server/guestbook';
import { safeClientAddress } from '../../server/client-address';
import { database, limiterFor } from '../../server/runtime';

export const prerender = false;
const limiter = limiterFor('guestbook');
export const GET: APIRoute = ({ request }) => listEntries(request, { db: database() });
export const POST: APIRoute = context => createEntry(context.request, { db: database(), clientAddress: safeClientAddress(context), limiter });
