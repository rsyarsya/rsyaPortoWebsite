import type { APIRoute } from 'astro';
import { SITE_URL, isProductionSite } from '../lib/site';
export const GET: APIRoute = () => new Response(isProductionSite(import.meta.env.VERCEL_ENV, import.meta.env.PUBLIC_SITE_INDEXABLE)
  ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
