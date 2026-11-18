import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  charset: 'utf8mb4',
});

// Every app connection works in UTC so CURRENT_TIMESTAMP values are unambiguous; see toIsoUtc().
pool.pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** 'YYYY-MM-DD HH:MM:SS' (UTC, from MySQL) → ISO-8601 'YYYY-MM-DDTHH:MM:SSZ'. */
export const toIsoUtc = (s) => (s ? `${String(s).replace(' ', 'T')}Z` : null);
