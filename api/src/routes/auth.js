import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { publicFormLimit } from '../middleware/rateLimit.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post('/login', publicFormLimit, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await db('users').where({ email }).first();
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos' });
  }
  const token = jwt.sign({ sub: user.id, name: user.name, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.sub, name: req.user.name, email: req.user.email });
});

export async function ensureAdmin() {
  const { name, email, password } = config.admin;
  if (!email || !password) return;
  const normalized = email.trim().toLowerCase();
  const exists = await db('users').where({ email: normalized }).first();
  if (exists) return;
  await db('users').insert({ name, email: normalized, password_hash: await bcrypt.hash(password, 12) });
  console.log(`Usuário administrador criado: ${normalized}`);
}
