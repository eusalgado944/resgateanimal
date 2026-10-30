import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import { ZodError } from 'zod';
import { config } from './config.js';
import { db } from './db.js';
import { authRouter } from './routes/auth.js';
import { animalsRouter } from './routes/animals.js';
import { adoptionsRouter } from './routes/adoptions.js';
import { contactsRouter } from './routes/contacts.js';

export const app = express();

// Atrás do Nginx (container web) — necessário para o rate limit enxergar o IP real.
app.set('trust proxy', 1);
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '100kb' }));

app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', immutable: true }));

app.get('/api/health', async (req, res) => {
  await db.raw('select 1');
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/animals', animalsRouter);
app.use('/api/adoptions', adoptionsRouter);
app.use('/api/contacts', contactsRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', details: err.issues });
  }
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'Cada imagem pode ter no máximo 5 MB',
      LIMIT_FILE_COUNT: 'Envie no máximo 10 imagens por vez',
      LIMIT_UNEXPECTED_FILE: 'Apenas imagens JPG, PNG ou WEBP',
    };
    return res.status(400).json({ error: messages[err.code] ?? err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});
