import { rateLimit } from 'express-rate-limit';

// Protege formulários públicos e login contra spam/força bruta.
export const publicFormLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});
