export async function up(knex) {
  await knex.schema.createTable('admins', table => {
    table.uuid('id').primary();
    table.string('name', 120).notNullable();
    table.string('email', 254).notNullable().unique();
    table.string('password_hash', 100).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('animals', table => {
    table.uuid('id').primary();
    table.string('name', 120).notNullable();
    table.enu('species', ['dog', 'cat'], { useNative: false }).notNullable();
    table.string('breed', 120).notNullable().defaultTo('Sem raça definida');
    table.string('age', 80).notNullable();
    table.enu('sex', ['male', 'female'], { useNative: false }).notNullable();
    table.enu('size', ['small', 'medium', 'large'], { useNative: false }).notNullable();
    table.text('description').notNullable();
    table.enu('status', ['available', 'adopted', 'unavailable'], { useNative: false }).notNullable().defaultTo('available');
    table.string('photo_url', 400).nullable();
    table.boolean('featured').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['status', 'species', 'size']);
  });
  await knex.schema.createTable('applications', table => {
    table.uuid('id').primary();
    table.uuid('animal_id').nullable().references('id').inTable('animals').onDelete('SET NULL');
    table.string('animal_name', 120).notNullable();
    table.string('name', 120).notNullable();
    table.string('email', 254).notNullable();
    table.string('phone', 40).notNullable();
    table.string('city', 120).notNullable();
    table.string('housing', 200).notNullable().defaultTo('');
    table.text('experience').notNullable().defaultTo('');
    table.text('message').notNullable().defaultTo('');
    table.enu('status', ['pending', 'approved', 'rejected'], { useNative: false }).notNullable().defaultTo('pending');
    table.text('notes').notNullable().defaultTo('');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index('status');
  });
  await knex.schema.createTable('messages', table => {
    table.uuid('id').primary();
    table.enu('type', ['contact', 'volunteer', 'donation', 'abuse'], { useNative: false }).notNullable();
    table.string('name', 120).notNullable();
    table.string('email', 254).notNullable();
    table.string('phone', 40).notNullable().defaultTo('');
    table.text('message').notNullable();
    table.string('address', 300).notNullable().defaultTo('');
    table.enu('status', ['new', 'read', 'archived'], { useNative: false }).notNullable().defaultTo('new');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['type', 'status']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('animals');
  await knex.schema.dropTableIfExists('admins');
}
