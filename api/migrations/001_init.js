import { SPECIES, SEX, SIZES, ANIMAL_STATUS, ADOPTION_STATUS, CONTACT_TYPES } from '../src/constants.js';

export async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('name', 100).notNullable();
    t.string('email', 200).notNullable().unique();
    t.string('password_hash').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('animals', (t) => {
    t.increments('id');
    t.string('name', 100).notNullable();
    t.enu('species', SPECIES).notNullable();
    t.enu('sex', SEX).notNullable();
    t.enu('size', SIZES).notNullable();
    t.integer('age_months');
    t.text('description').notNullable().defaultTo('');
    t.text('health_notes').notNullable().defaultTo('');
    t.boolean('neutered').notNullable().defaultTo(false);
    t.boolean('vaccinated').notNullable().defaultTo(false);
    t.enu('status', ANIMAL_STATUS).notNullable().defaultTo('disponivel').index();
    t.date('rescued_at');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('animal_photos', (t) => {
    t.increments('id');
    t.integer('animal_id').notNullable().references('animals.id').onDelete('CASCADE').index();
    t.string('filename').notNullable();
    t.integer('position').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('adoption_requests', (t) => {
    t.increments('id');
    t.integer('animal_id').references('animals.id').onDelete('SET NULL').index();
    t.string('name', 100).notNullable();
    t.string('email', 200).notNullable();
    t.string('phone', 30).notNullable();
    t.string('city', 100).notNullable();
    t.text('message').notNullable().defaultTo('');
    t.enu('status', ADOPTION_STATUS).notNullable().defaultTo('pendente').index();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('contact_messages', (t) => {
    t.increments('id');
    t.string('name', 100).notNullable();
    t.string('email', 200).notNullable();
    t.string('phone', 30);
    t.enu('type', CONTACT_TYPES).notNullable().defaultTo('contato');
    t.text('message').notNullable();
    t.boolean('read').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('contact_messages');
  await knex.schema.dropTable('adoption_requests');
  await knex.schema.dropTable('animal_photos');
  await knex.schema.dropTable('animals');
  await knex.schema.dropTable('users');
}
