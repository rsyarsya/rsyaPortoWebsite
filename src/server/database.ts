import { createClient, type Client } from '@libsql/client';

export function databaseFactory(url?: string, token?: string, hosted = false): () => Client | null {
  let client: Client | null | undefined;
  return () => {
    if (client !== undefined) return client;
    const value = url?.trim();
    if (!value || (hosted && (!/^libsql:\/\//.test(value) || !token?.trim()))) return client = null;
    try { return client = createClient({ url: value, authToken: token?.trim() || undefined }); }
    catch { return client = null; }
  };
}
