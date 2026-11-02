import { resolve } from 'node:path';

export function readConfig(env = process.env) {
  if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32 || env.JWT_SECRET.startsWith('replace-')) {
    throw new Error('JWT_SECRET must be a random secret of at least 32 bytes.');
  }
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  if (env.TRUST_PROXY && !['0', '1'].includes(env.TRUST_PROXY)) throw new Error('TRUST_PROXY must be 0 or 1.');
  return {
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET,
    port,
    trustProxy: env.TRUST_PROXY === '1' ? 1 : false,
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    uploadDir: resolve(env.UPLOAD_DIR || './uploads')
  };
}
