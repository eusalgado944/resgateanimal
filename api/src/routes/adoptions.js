import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { publicFormLimit } from '../middleware/rateLimit.js';
import { ADOPTION_STATUS } from '../constants.js';

export const adoptionsRouter = Router();

const requestSchema = z.object({
  animal_id: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(8).max(30),
  city: z.string().trim().min(2).max(100),
  message: z.string().trim().max(3000).default(''),
});

const idParam = z.coerce.number().int().positive();

adoptionsRouter.post('/', publicFormLimit, async (req, res) => {
  const data = requestSchema.parse(req.body);
  const animal = await db('animals').where({ id: data.animal_id }).first();
  if (!animal || !['disponivel', 'em_processo'].includes(animal.status)) {
    return res.status(400).json({ error: 'Este animal não está disponível para adoção' });
  }
  await db('adoption_requests').insert(data);
  res.status(201).json({ ok: true });
});

adoptionsRouter.get('/', requireAuth, async (req, res) => {
  const { status } = z.object({ status: z.enum(ADOPTION_STATUS).optional() }).parse(req.query);
  const query = db('adoption_requests as r')
    .leftJoin('animals as a', 'a.id', 'r.animal_id')
    .select('r.*', 'a.name as animal_name', 'a.status as animal_status')
    .orderBy('r.created_at', 'desc');
  if (status) query.where('r.status', status);
  res.json(await query);
});

adoptionsRouter.patch('/:id', requireAuth, async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { status } = z.object({ status: z.enum(ADOPTION_STATUS) }).parse(req.body);
  const updated = await db('adoption_requests')
    .where({ id })
    .update({ status, updated_at: db.fn.now() });
  if (!updated) return res.status(404).json({ error: 'Solicitação não encontrada' });
  res.status(204).end();
});
