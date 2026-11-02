/** Read an API response with one deadline covering both headers and JSON body. */
export async function requestJson(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15_000): Promise<{ response: Response; data: unknown }> {
  const controller = new AbortController();
  const external = init.signal;
  const abort = () => controller.abort(external?.reason);
  if (external?.aborted) abort();
  else external?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('The request timed out.', 'TimeoutError')), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const data: unknown = await response.json();
    return { response, data };
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', abort);
  }
}
