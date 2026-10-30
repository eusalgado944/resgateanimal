import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { upload, removeUpload } from '../middleware/upload.js';
import { SPECIES, SEX, SIZES, ANIMAL_STATUS } from '../constants.js';

export const animalsRouter = Router();

const animalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  species: z.enum(SPECIES),
  sex: z.enum(SEX),
  size: z.enum(SIZES),
  age_months: z.number().int().min(0).max(400).nullable().default(null),
  description: z.string().max(5000).default(''),
  health_notes: z.string().max(2000).default(''),
  neutered: z.boolean().default(false),
  vaccinated: z.boolean().default(false),
  status: z.enum(ANIMAL_STATUS).default('disponivel'),
  rescued_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
});

const filtersSchema = z.object({
  species: z.enum(SPECIES).optional(),
  sex: z.enum(SEX).optional(),
  size: z.enum(SIZES).optional(),
  status: z.enum(ANIMAL_STATUS).optional(),
});

const idParam = z.coerce.number().int().positive();

async function findAnimal(id) {
  const animal = await db('animals').where({ id }).first();
  if (!animal) return null;
  animal.photos = await db('animal_photos')
    .where({ animal_id: id })
    .orderBy([{ column: 'position' }, { column: 'id' }])
    .select('id', 'filename');
  return animal;
}

animalsRouter.get('/', async (req, res) => {
  const filters = filtersSchema.parse(req.query);
  const animals = await db('animals')
    .where(filters)
    .select(
      'animals.*',
      db.raw(
        '(select filename from animal_photos p where p.animal_id = animals.id order by position, id limit 1) as cover',
      ),
    )
    .orderBy('created_at', 'desc');
  res.json(animals);
});

animalsRouter.get('/:id', async (req, res) => {
  const animal = await findAnimal(idParam.parse(req.params.id));
  if (!animal) return res.status(404).json({ error: 'Animal não encontrado' });
  res.json(animal);
});

animalsRouter.post('/', requireAuth, async (req, res) => {
  const data = animalSchema.parse(req.body);
  const [{ id }] = await db('animals').insert(data).returning('id');
  res.status(201).json(await findAnimal(id));
});

animalsRouter.put('/:id', requireAuth, async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = animalSchema.parse(req.body);
  const updated = await db('animals')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() });
  if (!updated) return res.status(404).json({ error: 'Animal não encontrado' });
  res.json(await findAnimal(id));
});

animalsRouter.delete('/:id', requireAuth, async (req, res) => {
  const id = idParam.parse(req.params.id);
  const photos = await db('animal_photos').where({ animal_id: id }).select('filename');
  const deleted = await db('animals').where({ id }).del();
  if (!deleted) return res.status(404).json({ error: 'Animal não encontrado' });
  photos.forEach((p) => removeUpload(p.filename));
  res.status(204).end();
});

animalsRouter.post('/:id/photos', requireAuth, upload.array('photos', 10), async (req, res) => {
  const id = idParam.parse(req.params.id);
  const files = req.files ?? [];
  const animal = await db('animals').where({ id }).first();
  if (!animal) {
    files.forEach((f) => removeUpload(f.filename));
    return res.status(404).json({ error: 'Animal não encontrado' });
  }
  const { count } = await db('animal_photos').where({ animal_id: id }).count({ count: '*' }).first();
  if (files.length) {
    await db('animal_photos').insert(
      files.map((f, i) => ({ animal_id: id, filename: f.filename, position: Number(count) + i })),
    );
  }
  res.status(201).json(await findAnimal(id));
});

animalsRouter.delete('/:id/photos/:photoId', requireAuth, async (req, res) => {
  const animalId = idParam.parse(req.params.id);
  const photoId = idParam.parse(req.params.photoId);
  const [photo] = await db('animal_photos')
    .where({ id: photoId, animal_id: animalId })
    .del()
    .returning('filename');
  if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });
  removeUpload(photo.filename);
  res.status(204).end();
});
