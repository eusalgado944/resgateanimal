import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

const idSchema = z.uuid();
const text = (max, min = 1) => z.string().trim().min(min).max(max);
const email = z.email().max(254).transform(value => value.toLowerCase());
const phone = text(40, 6).regex(/^[+\d()\s.-]+$/);
const animalSchema = z.object({
  name: text(120), species: z.enum(['dog', 'cat']), breed: text(120).default('Sem raça definida'),
  age: text(80), sex: z.enum(['male', 'female']), size: z.enum(['small', 'medium', 'large']),
  description: text(5000), status: z.enum(['available', 'adopted', 'unavailable']).default('available'),
  featured: z.boolean().default(false)
}).strict();
const animalUpdateSchema = animalSchema.partial().extend({
  breed: text(120).optional(),
  status: z.enum(['available', 'adopted', 'unavailable']).optional(),
  featured: z.boolean().optional()
}).refine(value => Object.keys(value).length > 0, 'Informe ao menos um campo.');
const applicationSchema = z.object({
  animalId: idSchema, name: text(120, 2), email, phone, city: text(120, 2),
  housing: text(200, 0).default(''), experience: text(2000, 0).default(''),
  message: text(3000, 0).default('')
}).strict();
const messageSchema = z.object({
  type: z.enum(['contact', 'volunteer', 'donation', 'abuse']), name: text(120, 2),
  email, phone: phone.or(z.literal('')).default(''), message: text(5000, 10),
  address: text(300, 0).default('')
}).strict().refine(value => value.type !== 'abuse' || value.address.length >= 5, {
  message: 'Informe o endereço ou local da ocorrência.', path: ['address']
});
const paging = {
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).max(10000).default(0)
};
const animalQuery = z.object({
  ...paging, species: z.enum(['dog', 'cat']).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(), search: text(120, 0).optional()
}).strict();
const organization = {
  name: 'Associação Focinho Amigo',
  tagline: 'Todo focinho merece um lar.',
  description: 'Estudo de caso de uma ONG dedicada ao resgate, cuidado e adoção responsável de cães e gatos.',
  email: 'contato@focinhoamigo.example',
  phone: '(11) 4000-0000',
  city: 'São Paulo, SP',
  isCaseStudy: true,
  donationNotice: 'Este site não processa pagamentos. Envie uma mensagem para conhecer formas de apoiar.'
};
const publicAnimal = row => ({
  id: row.id, name: row.name, species: row.species, breed: row.breed, age: row.age,
  sex: row.sex, size: row.size, description: row.description, status: row.status,
  photoUrl: row.photo_url, featured: row.featured
});
const application = row => ({
  id: row.id, animalId: row.animal_id, animalName: row.animal_name, name: row.name,
  email: row.email, phone: row.phone, city: row.city, housing: row.housing,
  experience: row.experience, message: row.message, status: row.status,
  notes: row.notes, createdAt: row.created_at
});
const message = row => ({
  id: row.id, type: row.type, name: row.name, email: row.email, phone: row.phone,
  message: row.message, address: row.address, status: row.status, createdAt: row.created_at
});

function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error('Dados inválidos.');
    error.status = 400;
    error.details = result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }));
    throw error;
  }
  return result.data;
}
function notFound() {
  const error = new Error('Registro não encontrado.');
  error.status = 404;
  return error;
}
function imageExtension(buffer) {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
      buffer.toString('ascii', 12, 16) === 'IHDR' &&
      buffer.readUInt32BE(16) > 0 && buffer.readUInt32BE(16) <= 10000 &&
      buffer.readUInt32BE(20) > 0 && buffer.readUInt32BE(20) <= 10000) return 'png';
  if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 &&
      buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217) return 'jpg';
  if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP' &&
      ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16))) return 'webp';
  return null;
}

export async function createApp({ db, config, limits = {} }) {
  if (!config.jwtSecret || Buffer.byteLength(config.jwtSecret) < 32) throw new Error('JWT_SECRET is required (32+ bytes).');
  await mkdir(config.uploadDir, { recursive: true });
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy === 1 ? 1 : false);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigin, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  const limiter = (max, windowMs) => rateLimit({
    windowMs, limit: max, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
  });
  app.use('/api', limiter(limits.general || 300, 15 * 60 * 1000));
  app.use(express.json({ limit: '32kb' }));
  app.use('/uploads', (req, res, next) => {
    if (!/^\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(req.path)) return res.status(404).json({ error: 'Imagem não encontrada.' });
    res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    next();
  }, express.static(config.uploadDir, { dotfiles: 'deny', index: false, fallthrough: true, maxAge: '1d' }));

  app.get('/api/health', async (req, res) => {
    await db.raw('SELECT 1');
    res.json({ status: 'ok' });
  });
  app.get('/api/organization', (req, res) => res.json({ organization }));

  async function listAnimals(req, res, admin) {
    const query = parse(animalQuery, req.query);
    const base = db('animals');
    if (!admin) base.where('status', 'available');
    if (query.species) base.where('species', query.species);
    if (query.size) base.where('size', query.size);
    if (query.search) base.whereILike('name', `%${query.search.replace(/[\\%_]/g, '\\$&')}%`);
    const [{ count }] = await base.clone().count('* as count');
    const rows = await base.orderBy('featured', 'desc').orderBy('created_at', 'desc').orderBy('id').limit(query.limit).offset(query.offset);
    res.json({ animals: rows.map(publicAnimal), total: Number(count) });
  }
  app.get('/api/animals', (req, res) => listAnimals(req, res, false));
  app.get('/api/animals/:id', async (req, res) => {
    const row = await db('animals').where({ id: parse(idSchema, req.params.id), status: 'available' }).first();
    if (!row) throw notFound();
    res.json({ animal: publicAnimal(row) });
  });
  const submissionLimit = limiter(limits.submissions || 20, 60 * 60 * 1000);
  app.post('/api/applications', submissionLimit, async (req, res) => {
    const values = parse(applicationSchema, req.body);
    const row = await db.transaction(async trx => {
      const animal = await trx('animals').where({ id: values.animalId, status: 'available' }).forShare().first();
      if (!animal) throw notFound();
      const { animalId, ...fields } = values;
      const [created] = await trx('applications').insert({
        ...fields, id: randomUUID(), animal_id: animalId, animal_name: animal.name
      }).returning('*');
      return created;
    });
    res.status(201).json({ application: { id: row.id, status: row.status } });
  });
  app.post('/api/messages', submissionLimit, async (req, res) => {
    const values = parse(messageSchema, req.body);
    const [row] = await db('messages').insert({ ...values, id: randomUUID() }).returning('*');
    res.status(201).json({ message: { id: row.id, status: row.status } });
  });

  // A real bcrypt comparison also runs for nonexistent accounts to avoid a timing oracle.
  const dummyHash = await bcrypt.hash(randomUUID(), 12);
  app.post('/api/admin/login', limiter(limits.login || 10, 15 * 60 * 1000), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const result = z.object({
      email, password: z.string().min(1).refine(value => Buffer.byteLength(value) <= 72)
    }).strict().safeParse(req.body);
    if (!result.success) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    const admin = await db('admins').where('email', result.data.email).first();
    const valid = await bcrypt.compare(result.data.password, admin?.password_hash || dummyHash);
    if (!admin || !valid) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    const token = jwt.sign({}, config.jwtSecret, { algorithm: 'HS256', subject: admin.id, expiresIn: '2h', issuer: 'focinho-amigo', audience: 'focinho-admin' });
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  });
  app.use('/api/admin', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const auth = req.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Autenticação necessária.' });
    let payload;
    try {
      payload = jwt.verify(auth.slice(7), config.jwtSecret, { algorithms: ['HS256'], issuer: 'focinho-amigo', audience: 'focinho-admin' });
      if (!idSchema.safeParse(payload.sub).success) throw new Error('Invalid subject');
    } catch {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
    const admin = await db('admins').where('id', payload.sub).first();
    if (!admin) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    next();
  });
  app.get('/api/admin/animals', (req, res) => listAnimals(req, res, true));
  app.post('/api/admin/animals', async (req, res) => {
    const values = parse(animalSchema, req.body);
    const [row] = await db('animals').insert({ ...values, id: randomUUID() }).returning('*');
    res.status(201).json({ animal: publicAnimal(row) });
  });
  app.patch('/api/admin/animals/:id', async (req, res) => {
    const values = parse(animalUpdateSchema, req.body);
    const [row] = await db('animals').where('id', parse(idSchema, req.params.id)).update({ ...values, updated_at: db.fn.now() }).returning('*');
    if (!row) throw notFound();
    res.json({ animal: publicAnimal(row) });
  });
  async function removePhoto(url) {
    if (url && /^\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(url)) {
      await unlink(join(config.uploadDir, url.slice('/uploads/'.length))).catch(error => {
        if (error.code !== 'ENOENT') console.error('Photo cleanup failed.');
      });
    }
  }
  app.delete('/api/admin/animals/:id', async (req, res) => {
    const [row] = await db('animals').where('id', parse(idSchema, req.params.id)).delete().returning('*');
    if (!row) throw notFound();
    await removePhoto(row.photo_url);
    res.status(204).end();
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    fileFilter: (req, file, callback) => {
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) callback(null, true);
      else {
        const error = new Error('Envie uma imagem PNG, JPEG ou WebP.');
        error.status = 400;
        callback(error);
      }
    }
  });
  app.post('/api/admin/animals/:id/photo', limiter(limits.uploads || 30, 60 * 60 * 1000),
    (req, res, next) => { parse(idSchema, req.params.id); next(); },
    upload.single('photo'), async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'Selecione uma imagem.' });
      const extension = imageExtension(req.file.buffer);
      const expected = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[extension];
      if (!extension || expected !== req.file.mimetype) return res.status(400).json({ error: 'Imagem inválida.' });
      const url = `/uploads/${randomUUID()}.${extension}`;
      let previous;
      let row;
      try {
        row = await db.transaction(async trx => {
          const old = await trx('animals').where('id', req.params.id).forUpdate().first();
          if (!old) throw notFound();
          previous = old.photo_url;
          await writeFile(join(config.uploadDir, url.slice('/uploads/'.length)), req.file.buffer, { flag: 'wx', mode: 0o644 });
          const [updated] = await trx('animals').where('id', old.id).update({ photo_url: url, updated_at: trx.fn.now() }).returning('*');
          return updated;
        });
      } catch (error) {
        await removePhoto(url);
        throw error;
      }
      await removePhoto(previous);
      res.json({ animal: publicAnimal(row) });
    });
  app.get('/api/admin/applications', async (req, res) => {
    const query = parse(z.object({ ...paging, status: z.enum(['pending', 'approved', 'rejected']).optional() }).strict(), req.query);
    const base = db('applications');
    if (query.status) base.where('status', query.status);
    const [{ count }] = await base.clone().count('* as count');
    const rows = await base.orderBy('created_at', 'desc').orderBy('id').limit(query.limit).offset(query.offset);
    res.json({ applications: rows.map(application), total: Number(count) });
  });
  app.patch('/api/admin/applications/:id', async (req, res) => {
    const values = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected']), notes: text(3000, 0).optional() }).strict(), req.body);
    const [row] = await db('applications').where('id', parse(idSchema, req.params.id)).update(values).returning('*');
    if (!row) throw notFound();
    res.json({ application: application(row) });
  });
  app.get('/api/admin/messages', async (req, res) => {
    const query = parse(z.object({ ...paging, type: z.enum(['contact', 'volunteer', 'donation', 'abuse']).optional(), status: z.enum(['new', 'read', 'archived']).optional() }).strict(), req.query);
    const base = db('messages');
    if (query.type) base.where('type', query.type);
    if (query.status) base.where('status', query.status);
    const [{ count }] = await base.clone().count('* as count');
    const rows = await base.orderBy('created_at', 'desc').orderBy('id').limit(query.limit).offset(query.offset);
    res.json({ messages: rows.map(message), total: Number(count) });
  });
  app.patch('/api/admin/messages/:id', async (req, res) => {
    const values = parse(z.object({ status: z.enum(['new', 'read', 'archived']) }).strict(), req.body);
    const [row] = await db('messages').where('id', parse(idSchema, req.params.id)).update(values).returning('*');
    if (!row) throw notFound();
    res.json({ message: message(row) });
  });
  app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'Upload inválido. Envie uma única imagem de até 5 MB.' });
    const status = error.status || (error.type === 'entity.too.large' ? 413 : 500);
    if (status >= 500) console.error('Request failed:', error.code || error.name);
    res.status(status).json({
      error: status >= 500 ? 'Não foi possível concluir a solicitação.' : error.type === 'entity.parse.failed' ? 'JSON inválido.' : error.message,
      ...(error.details ? { details: error.details } : {})
    });
  });
  return app;
}
