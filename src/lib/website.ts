/**
 * Normalizes a visitor-supplied website to an absolute http(s) URL, or returns
 * null when it is not a safe web address. A bare domain gets https://.
 * Shared by the guestbook API (validation) and the page (form check, rendering).
 */
export function normalizeWebsite(value: string): string | null {
  const text = value.trim();
  if (!text || text.length > 200 || /\s/.test(text)) return null;
  // Any explicit scheme other than http(s) (javascript:, data:, mailto:, …) is refused outright.
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https?:\/\//i.test(text) && !/^[^:/]+:\d+(\/|$)/.test(text)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (!/^[^.]+(\.[^.]+)+$/.test(url.hostname)) return null;
    return url.href.length <= 200 ? url.href : null;
  } catch {
    return null;
  }
}
