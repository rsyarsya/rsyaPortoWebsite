export const SITE_URL = 'https://rasyadwaarsya.my.id';
/** Only Vercel production builds are indexable, never local or preview builds. */
export const isProductionSite = (environment: string | undefined) => environment === 'production';
export const canonicalUrl = (pathname: string) => new URL(pathname, SITE_URL).href;
