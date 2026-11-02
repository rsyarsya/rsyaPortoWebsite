export const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://rasyadwaarsya.my.id';
/** Only Vercel production builds are indexable, never local or preview builds. */
export const isProductionSite = (environment: string | undefined, indexable?: string) => environment === 'production' && indexable !== 'false';
export const canonicalUrl = (pathname: string, origin = SITE_URL) => new URL(pathname, origin).href;
