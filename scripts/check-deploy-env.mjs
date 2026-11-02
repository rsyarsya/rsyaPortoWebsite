import { pathToFileURL } from 'node:url';
// Production build gate. Reports variable names only, never their values.
export function deploymentProblems(env) {
  const problems = [];
  for (const name of ['RESEND_API_KEY', 'CONTACT_FROM_EMAIL', 'GUESTBOOK_DB_URL', 'GUESTBOOK_DB_AUTH_TOKEN', 'RATE_LIMIT_SECRET']) {
    if (!env[name]?.trim()) problems.push(`${name} is required`);
  }
  if (env.RATE_LIMIT_SECRET && env.RATE_LIMIT_SECRET.length < 32) problems.push('RATE_LIMIT_SECRET must contain at least 32 characters');
  if (env.GUESTBOOK_DB_URL && !/^libsql:\/\//.test(env.GUESTBOOK_DB_URL)) problems.push('GUESTBOOK_DB_URL must use a remote libsql:// database');
  if (env.CONTACT_FROM_EMAIL && (!/@/.test(env.CONTACT_FROM_EMAIL) || /onboarding@resend\.dev/i.test(env.CONTACT_FROM_EMAIL))) problems.push('CONTACT_FROM_EMAIL must use your verified sending domain');
  if (env.RESEND_API_KEY && !env.RESEND_API_KEY.startsWith('re_')) problems.push('RESEND_API_KEY format is invalid');
  return problems;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.VERCEL_ENV === 'production' || process.argv.includes('--strict')) {
    const problems = deploymentProblems(process.env);
    if (problems.length) { console.error('Production configuration incomplete:\n' + problems.map(p => '- ' + p).join('\n')); process.exitCode = 1; }
    else console.log('Production environment shape: ready. Verify provider credentials and sender separately.');
  } else console.log('Preview/local build: indexing disabled; unconfigured services return 503.');
}
