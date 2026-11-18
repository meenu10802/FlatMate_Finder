import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// server/<ENV_FILE> (default `.env`) always wins over machine-wide variables (e.g. a global DB_PASSWORD
// from another project), and is found regardless of the directory the process was started from.
// ENV_FILE lets local scripts target another database, e.g. `ENV_FILE=.env.cloud npm run backup`.
// On Render there is no file, so the platform's environment variables are used as-is.
const envFile = process.env.ENV_FILE || '.env';
if (envFile.includes('/') || envFile.includes('\\')) throw new Error('ENV_FILE must be a file name inside /server, e.g. .env.cloud');
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', envFile),
  override: true,
  quiet: true,
});

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    // TiDB Cloud (production) requires TLS. Node's built-in CA bundle verifies its certificate.
    ...(process.env.DB_SSL === 'true' ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {}),
  },
  envFile,
  jwtSecret: process.env.JWT_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  isProd: process.env.NODE_ENV === 'production',
};
