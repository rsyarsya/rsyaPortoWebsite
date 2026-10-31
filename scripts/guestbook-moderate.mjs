#!/usr/bin/env node
// Local guestbook moderation. Reads GUESTBOOK_DB_URL (and GUESTBOOK_DB_AUTH_TOKEN
// for Turso) from the process environment. Holding the DB credential is the
// protection; there is no admin HTTP endpoint.
//
//   npm run guestbook:moderate -- list            pending entries
//   npm run guestbook:moderate -- approve <id>
//   npm run guestbook:moderate -- reject <id>
//   npm run guestbook:moderate -- delete <id>
import { createClient } from '@libsql/client';

const [command = 'list', id] = process.argv.slice(2);
const usage = 'Usage: guestbook:moderate -- list | approve <id> | reject <id> | delete <id>';

const url = process.env.GUESTBOOK_DB_URL?.trim();
if (!url) {
  console.error('GUESTBOOK_DB_URL is not set.');
  process.exit(1);
}
const db = createClient({ url, authToken: process.env.GUESTBOOK_DB_AUTH_TOKEN?.trim() || undefined });

// Visitor text may contain terminal control sequences; print it inert.
const clean = value => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');

try {
  // Same table definition as src/server/guestbook.ts, so the CLI also works on a fresh DB.
  await db.execute(`CREATE TABLE IF NOT EXISTS guestbook_entries (
    id TEXT PRIMARY KEY,
    name TEXT,
    website TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL
  )`);

  if (command === 'list') {
    const { rows } = await db.execute(
      "SELECT id, name, website, message, created_at FROM guestbook_entries WHERE status = 'pending' ORDER BY created_at",
    );
    if (!rows.length) console.log('No pending entries.');
    for (const row of rows) {
      console.log(`${row.id}  ${row.created_at}`);
      console.log(`  name:    ${clean(row.name) || '(anonymous)'}`);
      if (row.website) console.log(`  website: ${clean(row.website)}`);
      console.log(`  message: ${clean(row.message).replace(/\n/g, '\n           ')}\n`);
    }
  } else if (['approve', 'reject', 'delete'].includes(command) && id) {
    const result = command === 'delete'
      ? await db.execute({ sql: 'DELETE FROM guestbook_entries WHERE id = ?', args: [id] })
      : await db.execute({
          sql: 'UPDATE guestbook_entries SET status = ? WHERE id = ?',
          args: [command === 'approve' ? 'approved' : 'rejected', id],
        });
    if (!result.rowsAffected) {
      console.error(`No entry with id ${id}.`);
      process.exit(2);
    }
    console.log(`${command === 'delete' ? 'Deleted' : command === 'approve' ? 'Approved' : 'Rejected'} ${id}.`);
  } else {
    console.error(usage);
    process.exit(2);
  }
} catch (error) {
  console.error(`Store error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
} finally {
  db.close();
}
