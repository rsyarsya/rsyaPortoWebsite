/** Some adapters throw from clientAddress when the proxy did not supply it.
 * Unknown clients share one rate-limit bucket rather than bypassing the limit.
 */
export function safeClientAddress(context: { readonly clientAddress: string }): string {
  try { return context.clientAddress || 'unknown'; }
  catch { return 'unknown'; }
}
