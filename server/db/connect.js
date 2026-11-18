import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

// Connection for migration/seed scripts: allows multi-statement SQL files and creates the DB if missing.
export async function connectForScripts() {
  const { database, ...server } = env.db;
  const conn = await mysql.createConnection({ ...server, multipleStatements: true });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.changeUser({ database });
  return conn;
}

export async function runSqlDir(conn, dir, { onFile, skip = new Set() } = {}) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const ran = [];
  for (const file of files) {
    if (skip.has(file)) continue;
    await conn.query(await fs.readFile(path.join(dir, file), 'utf8'));
    if (onFile) await onFile(file);
    ran.push(file);
  }
  return ran;
}
