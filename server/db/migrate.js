import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectForScripts, runSqlDir } from './connect.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

const conn = await connectForScripts();
try {
  await conn.query(`CREATE TABLE IF NOT EXISTS _migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const [rows] = await conn.query('SELECT name FROM _migrations');
  // Note: MySQL DDL auto-commits, so a failed migration may be partially applied — fix forward.
  const ran = await runSqlDir(conn, dir, {
    skip: new Set(rows.map((r) => r.name)),
    onFile: async (file) => {
      await conn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
      console.log(`Applied ${file}`);
    },
  });
  console.log(ran.length ? `Applied ${ran.length} migration(s).` : 'Database is up to date.');
} finally {
  await conn.end();
}
