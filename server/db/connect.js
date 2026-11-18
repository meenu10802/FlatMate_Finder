import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

// Data tables in foreign-key order (parents first) — used by backup/restore.
export const DATA_TABLES = ['cities', 'areas', 'users', 'profiles', 'connections', 'messages'];

// Connection for migration/seed/backup scripts: allows multi-statement SQL files and creates the DB if missing.
export async function connectForScripts({ quiet = false } = {}) {
  const { database, ...server } = env.db;
  if (!quiet) {
    // Always say which database is about to be touched (never the password).
    console.log(`→ ${server.user}@${server.host}:${server.port}/${database}${server.ssl ? ' (TLS)' : ''}  [${env.envFile}]`);
  }
  const conn = await mysql.createConnection({ ...server, multipleStatements: true, dateStrings: true });
  await conn.query("SET time_zone = '+00:00'"); // same as the app pool: timestamps are UTC
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${database}\``);
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
