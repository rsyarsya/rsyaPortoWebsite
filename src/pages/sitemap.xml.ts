import type { APIRoute } from 'astro';
import { canonicalUrl, isProductionSite } from '../lib/site';
export const GET: APIRoute = () => new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${isProductionSite(import.meta.env.VERCEL_ENV, import.meta.env.PUBLIC_SITE_INDEXABLE) ? ['/', '/guestbook/', '/playground/'].map(path => `<url><loc>${canonicalUrl(path)}</loc></url>`).join('') : ''}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
