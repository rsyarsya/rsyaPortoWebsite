import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const production = process.argv.includes('--production');
const out = '.vercel/output';
const read = path => readFileSync(join(out, path), 'utf8');
const assert = (ok, label) => { if (!ok) throw new Error(label); };
const card = readFileSync(join(out, 'static/social-card.png'));
assert(card.readUInt32BE(16) === 1200 && card.readUInt32BE(20) === 630, 'Social card asset dimensions');
const config = JSON.parse(read('config.json'));
assert(config.version === 3, 'Vercel Build Output API version');
for (const path of ['index.html', 'guestbook/index.html', 'playground/index.html']) {
  const html = read('static/' + path);
  const pathname = path === 'index.html' ? '/' : '/' + path.replace('index.html', '');
  assert(html.includes(`rel="canonical" href="https://rasyadwaarsya.my.id${pathname}"`), 'Canonical: ' + path);
  assert(html.includes(`name="robots" content="${production ? 'index, follow' : 'noindex, nofollow'}"`), 'Indexing: ' + path);
  assert(html.includes('https://rasyadwaarsya.my.id/social-card.png'), 'Social metadata: ' + path);
}
const robots = read('static/robots.txt'), sitemap = read('static/sitemap.xml');
assert(production ? robots.includes('Disallow: /api/') && robots.includes('Sitemap: https://rasyadwaarsya.my.id/sitemap.xml') : robots.trim() === 'User-agent: *\nDisallow: /', 'Robots policy');
assert((sitemap.match(/<loc>/g) ?? []).length === (production ? 3 : 0), 'Sitemap entries');
const files = [];
function scan(dir) { for (const item of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, item.name); if (item.isDirectory()) scan(p); else files.push(p); } }
scan(join(out, 'functions'));
const functions = files.filter(p => p.endsWith('.vc-config.json')).map(p => JSON.parse(readFileSync(p, 'utf8')));
assert(functions.length > 0 && functions.every(f => f.runtime === 'nodejs22.x' && f.maxDuration === 30), 'Node serverless runtime');
assert(!files.some(p => /(?:^|[\\/])(?:\.env(?:\..*)?|AGENTS\.md|CLAUDE\.md)$/.test(p)), 'Private source traced into functions');
const deployment = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert(deployment.redirects.some(r => r.permanent && r.has?.some(h => h.type === 'host' && h.value === 'www.rasyadwaarsya.my.id') && r.destination === 'https://rasyadwaarsya.my.id/:path*'), 'www redirect');
console.log(`Verified ${production ? 'production' : 'preview'} artifact: three pages, indexing, canonicals, sitemap, social card metadata, functions and domain redirect.`);
