import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectForScripts, runSqlDir } from './connect.js';
import { seedSampleUsers } from './seeds/sampleUsers.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seeds');

const conn = await connectForScripts();
try {
  await runSqlDir(conn, dir, { onFile: (file) => console.log(`Seeded ${file}`) });
  const n = await seedSampleUsers(conn);
  console.log(`Seeded ${n} sample flatmates.`);
  console.log('Seed complete.');
} finally {
  await conn.end();
}
