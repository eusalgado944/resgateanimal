import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createDatabase } from './db.js';

const config = readConfig();
const db = createDatabase(config.databaseUrl);
await db.raw('SELECT 1');
const app = await createApp({ db, config });
const server = app.listen(config.port, '0.0.0.0', () => console.log(`API listening on ${config.port}`));
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    server.close(async () => { await db.destroy(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
