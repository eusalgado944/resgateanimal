import knex from 'knex';
import pg from 'pg';
import { config } from './config.js';

// Colunas DATE voltam como texto 'AAAA-MM-DD', sem conversão de fuso horário.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const db = knex({
  client: 'pg',
  connection: config.databaseUrl,
  pool: { min: 0, max: 10 },
});
