import { config } from './config.js';
import { db } from './db.js';
import { app } from './app.js';
import { ensureAdmin } from './routes/auth.js';
import { migrationSource } from '../migrations/index.js';

const [, applied] = await db.migrate.latest({ migrationSource });
if (applied.length) console.log(`Migrações aplicadas: ${applied.join(', ')}`);
await ensureAdmin();

const server = app.listen(config.port, () => {
  console.log(`API ouvindo na porta ${config.port}`);
});

function shutdown() {
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
