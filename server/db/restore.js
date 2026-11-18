/**
 * npm run restore -- backups/flatmate_finder-20261118T153000Z.sql
 * ENV_FILE=.env.cloud npm run restore -- <file>     → restore into the cloud DB
 *
 * Restores a file made by `npm run backup` into a freshly migrated, EMPTY database
 * (run `npm run migrate` on the target, but NOT `npm run seed`).
 *
 * Why empty-only: backups keep original ids so profiles, connections and messages stay attached to the
 * right users. Merging into a DB that already has rows could pair records with the wrong people.
 * The whole restore runs in one transaction — it either fully succeeds or changes nothing.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_TABLES as TABLES, connectForScripts } from './connect.js';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run restore -- <path to backup .sql>');
  process.exit(1);
}
const file = path.resolve(process.cwd(), arg);
const sql = await fs.readFile(file, 'utf8');
if (!sql.startsWith('-- Flatmate Finder backup')) {
  console.error(`${file} doesn't look like a Flatmate Finder backup (made by npm run backup). Refusing to run it.`);
  process.exit(1);
}

const conn = await connectForScripts();
try {
  const count = async () => Object.fromEntries(
    await Promise.all(TABLES.map(async (t) => [t, Number((await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``))[0][0].n)]))
  );

  const before = await count();
  const nonEmpty = Object.entries(before).filter(([, n]) => n > 0);
  if (nonEmpty.length) {
    console.error(`Refusing to restore: the target already has data (${nonEmpty.map(([t, n]) => `${t}=${n}`).join(', ')}).`);
    console.error('Restore only into a freshly migrated, empty database (run `npm run migrate`, not `npm run seed`).');
    process.exitCode = 1;
  } else {
    await conn.beginTransaction();
    try {
      await conn.query(sql);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      console.error('Restore failed and was rolled back — the database is unchanged.');
      throw err;
    }
    const after = await count();
    console.log(`Restored ${path.basename(file)}:`);
    for (const t of TABLES) console.log(`  ${t.padEnd(12)} ${after[t]} rows`);
  }
} finally {
  await conn.end();
}
