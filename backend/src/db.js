import knex from 'knex';

export function createDatabase(connection) {
  return knex({ client: 'pg', connection, pool: { min: 0, max: 10 } });
}
