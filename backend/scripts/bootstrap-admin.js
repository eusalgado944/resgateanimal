import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { createDatabase } from '../src/db.js';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_NAME: z.string().trim().min(2).max(120),
  ADMIN_EMAIL: z.email().max(254).transform(value => value.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(12).refine(value => Buffer.byteLength(value) <= 72, 'Password exceeds bcrypt limit.')
});
const result = schema.safeParse(process.env);
if (!result.success) {
  console.error('Set DATABASE_URL, ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters, max 72 bytes).');
  process.exit(1);
}
const values = result.data;
const db = createDatabase(values.DATABASE_URL);
try {
  await db('admins').insert({
    id: randomUUID(), name: values.ADMIN_NAME, email: values.ADMIN_EMAIL,
    password_hash: await bcrypt.hash(values.ADMIN_PASSWORD, 12)
  });
  console.log('Administrator created. Remove ADMIN_PASSWORD from the environment.');
} catch (error) {
  console.error(error.code === '23505' ? 'Administrator already exists; no credentials changed.' : 'Unable to create administrator. Check database and migrations.');
  process.exitCode = 1;
} finally {
  await db.destroy();
}
