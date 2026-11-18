/**
 * npm run backup                                → backs up the DB in server/.env
 * ENV_FILE=.env.cloud npm run backup            → backs up the cloud (TiDB) DB
 *
 * Writes server/backups/<db>-<UTC timestamp>.sql: plain INSERT statements for every table, in
 * foreign-key order, ids preserved. Restore with `npm run restore -- <file>` into a freshly migrated, EMPTY DB.
 * Uses mysql2 (not mysqldump), so it works the same against local MySQL and TiDB Cloud.
 * Backups contain password hashes and private messages: server/backups/ is gitignored — keep them private.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { DATA_TABLES as TABLES, connectForScripts } from './connect.js';
import { env } from '../src/config/env.js';

const CHUNK = 200;

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backups');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z'); // 20261118T153000Z
const file = path.join(dir, `${env.db.database}-${stamp}.sql`);

const conn = await connectForScripts();
try {
  const parts = [
    `-- Flatmate Finder backup`,
    `-- Source: ${env.db.host}/${env.db.database}   Taken: ${new Date().toISOString()}`,
    `-- Restore into a freshly migrated, EMPTY database (run migrate, NOT seed), then \`npm run restore -- <this file>\`.`,
    `-- Plain INSERTs with original ids: restore refuses non-empty targets and runs in one transaction, so it is all-or-nothing.`,
    `SET time_zone = '+00:00';`,
    `SET FOREIGN_KEY_CHECKS = 0;`,
    '',
  ];
  const counts = {};

  for (const table of TABLES) {
    const [rows, fields] = await conn.query(`SELECT * FROM \`${table}\` ORDER BY 1`);
    counts[table] = rows.length;
    parts.push(`-- ${table}: ${rows.length} rows`);
    if (!rows.length) continue;
    const cols = fields.map((f) => `\`${f.name}\``).join(', ');
    for (let i = 0; i < rows.length; i += CHUNK) {
      const values = rows
        .slice(i, i + CHUNK)
        .map((r) => `(${fields.map((f) => mysql.escape(r[f.name])).join(', ')})`)
        .join(',\n  ');
      parts.push(`INSERT INTO \`${table}\` (${cols}) VALUES\n  ${values};`);
    }
    parts.push('');
  }
  parts.push('SET FOREIGN_KEY_CHECKS = 1;', '');

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, parts.join('\n'), 'utf8');
  console.log('Rows:', Object.entries(counts).map(([t, n]) => `${t}=${n}`).join(', '));
  console.log(`Backup written: ${file}`);
} finally {
  await conn.end();
}
