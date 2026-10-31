// One-time helper: get a Spotify refresh token for /api/now-playing.
// Usage (PowerShell): $env:SPOTIFY_CLIENT_ID='…'; $env:SPOTIFY_CLIENT_SECRET='…'; npm run spotify:auth
// The token is printed to this terminal only; it is never written to a file.
// Put it in the host environment as SPOTIFY_REFRESH_TOKEN.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
if (!clientId || !clientSecret) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in this shell first.');
  process.exit(1);
}

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = 'user-read-currently-playing user-read-recently-played';
const state = randomBytes(16).toString('hex');

const authorizeUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  scope: SCOPES,
  redirect_uri: REDIRECT_URI,
  state,
})}`;

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch { /* the URL is printed below as a fallback */ }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT_URI);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  const finish = (status, text, code = 0) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(text);
    server.close();
    process.exitCode = code;
  };
  if (url.searchParams.get('state') !== state) return finish(400, 'State mismatch. Run the script again.', 1);
  const code = url.searchParams.get('code');
  if (!code) return finish(400, `Authorization failed: ${url.searchParams.get('error') ?? 'no code'}`, 1);

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || typeof data.refresh_token !== 'string') {
      console.error(`Token exchange failed (HTTP ${tokenRes.status}${data.error ? `, ${data.error}` : ''}).`);
      return finish(502, 'Token exchange failed. See the terminal.', 1);
    }
    console.log('\nSPOTIFY_REFRESH_TOKEN (store it in the host environment; do not commit it):\n');
    console.log(data.refresh_token);
    console.log('');
    finish(200, 'Done. The refresh token is in your terminal. You can close this tab.');
  } catch (error) {
    console.error(`Token exchange failed (${error instanceof Error ? error.name : 'error'}).`);
    finish(502, 'Token exchange failed. See the terminal.', 1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Add this redirect URI to your Spotify app: ${REDIRECT_URI}`);
  console.log(`Opening the Spotify authorization page. If nothing opens, visit:\n${authorizeUrl}\n`);
  openBrowser(authorizeUrl);
});
