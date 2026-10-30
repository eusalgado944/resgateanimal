import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { publicFormLimit } from '../middleware/rateLimit.js';
import { CONTACT_TYPES } from '../constants.js';

export const contactsRouter = Router();

const messageSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional(),
  type: z.enum(CONTACT_TYPES).default('contato'),
  message: z.string().trim().min(5).max(5000),
});

contactsRouter.post('/', publicFormLimit, async (req, res) => {
  await db('contact_messages').insert(messageSchema.parse(req.body));
  res.status(201).json({ ok: true });
});

contactsRouter.get('/', requireAuth, async (req, res) => {
  res.json(await db('contact_messages').orderBy('created_at', 'desc'));
});

contactsRouter.patch('/:id', requireAuth, async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const { read } = z.object({ read: z.boolean() }).parse(req.body);
  const updated = await db('contact_messages').where({ id }).update({ read });
  if (!updated) return res.status(404).json({ error: 'Mensagem não encontrada' });
  res.status(204).end();
});
