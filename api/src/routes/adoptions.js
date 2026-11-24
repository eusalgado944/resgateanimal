import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { publicFormLimit } from '../middleware/rateLimit.js';
import { ADOPTION_STATUS } from '../constants.js';
import { lgpdConsent, ANONYMIZED } from '../lgpd.js';

export const adoptionsRouter = Router();

const requestSchema = z.object({
  animal_id: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(8).max(30),
  city: z.string().trim().min(2).max(100),
  message: z.string().trim().max(3000).default(''),
  lgpd_consent: lgpdConsent,
});

const idParam = z.coerce.number().int().positive();

adoptionsRouter.post('/', publicFormLimit, async (req, res) => {
  const { lgpd_consent, ...data } = requestSchema.parse(req.body);
  const animal = await db('animals').where({ id: data.animal_id }).first();
  if (!animal || !['disponivel', 'em_processo'].includes(animal.status)) {
    return res.status(400).json({ error: 'Este animal não está disponível para adoção' });
  }
  await db('adoption_requests').insert({ ...data, lgpd_consent_at: db.fn.now() });
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
  if (status === 'aprovado') return approve(id, res);
  const updated = await db('adoption_requests')
    .where({ id })
    .update({ status, updated_at: db.fn.now() });
  if (!updated) return res.status(404).json({ error: 'Solicitação não encontrada' });
  res.status(204).end();
});

// RN05 — exclusividade: só uma candidatura aprovada por animal. Aprovar recusa as demais
// pendentes e reserva o animal ("em processo"). A linha do animal fica bloqueada durante a
// transação para que duas aprovações simultâneas não passem juntas.
async function approve(id, res) {
  const result = await db.transaction(async (trx) => {
    const request = await trx('adoption_requests').where({ id }).first();
    if (!request) return { status: 404, error: 'Solicitação não encontrada' };
    if (request.status === 'aprovado') return { status: 200, declined: 0 };
    if (!request.animal_id) return { status: 409, error: 'O animal desta candidatura foi removido' };

    const animal = await trx('animals').where({ id: request.animal_id }).forUpdate().first();
    const other = await trx('adoption_requests')
      .where({ animal_id: animal.id, status: 'aprovado' })
      .whereNot({ id })
      .first();
    if (other) {
      return { status: 409, error: `${animal.name} já tem uma candidatura aprovada (${other.name})` };
    }

    const now = trx.fn.now();
    await trx('adoption_requests').where({ id }).update({ status: 'aprovado', updated_at: now });
    const declined = await trx('adoption_requests')
      .where({ animal_id: animal.id, status: 'pendente' })
      .whereNot({ id })
      .update({ status: 'recusado', updated_at: now });
    if (animal.status === 'disponivel') {
      await trx('animals').where({ id: animal.id }).update({ status: 'em_processo', updated_at: now });
    }
    return { status: 200, declined };
  });

  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ declined: result.declined });
}

// Direito do titular (LGPD, art. 18): apaga os dados pessoais e mantém o registro para o histórico.
adoptionsRouter.post('/:id/anonymize', requireAuth, async (req, res) => {
  const id = idParam.parse(req.params.id);
  const updated = await db('adoption_requests').where({ id }).update({
    ...ANONYMIZED,
    phone: '-',
    city: '-',
    message: '',
    anonymized_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
  if (!updated) return res.status(404).json({ error: 'Solicitação não encontrada' });
  res.status(204).end();
});
