// =====================================================================
// Migration 003: Ficha completa do animal e perfis de usuário
// Responsável: Banco de dados (DBA)
//
// O que esta migration faz:
//   1) Completa o cadastro do animal com raça, cor, data de nascimento
//      e origem (requisitos RF09, RF11 e regra RN01 do README).
//   2) Prepara os perfis de acesso dos usuários com "role" (perfil) e
//      "active" (ativo/inativo) (requisitos RF06, RF07 e regra RN13).
//
// Segurança:
//   - Antes de criar cada coluna, verifica se ela já existe.
//     Assim a migration não quebra se rodar em um banco diferente.
//   - Usuários que já existem viram "admin" ativo, para ninguém
//     perder o acesso atual.
// =====================================================================

// Função auxiliar: cria uma coluna somente se ela ainda não existir.
//   tabela  -> nome da tabela (ex.: 'animals')
//   coluna  -> nome da coluna (ex.: 'breed')
//   definir -> função que descreve o tipo da coluna
async function adicionarColunaSeNaoExistir(knex, tabela, coluna, definir) {
  const jaExiste = await knex.schema.hasColumn(tabela, coluna);
  if (!jaExiste) {
    await knex.schema.alterTable(tabela, (t) => definir(t));
  }
}

// "up" = o que acontece quando a migration é APLICADA
export async function up(knex) {
  // ------------------------- TABELA animals -------------------------

  // Raça aproximada do animal (texto, opcional)
  await adicionarColunaSeNaoExistir(knex, 'animals', 'breed', (t) =>
    t.string('breed', 80).nullable()
  );

  // Cor ou pelagem do animal (texto, opcional)
  await adicionarColunaSeNaoExistir(knex, 'animals', 'color', (t) =>
    t.string('color', 60).nullable()
  );

  // Data de nascimento (opcional, pois muitas vezes é desconhecida)
  await adicionarColunaSeNaoExistir(knex, 'animals', 'birth_date', (t) =>
    t.date('birth_date').nullable()
  );

  // Indica se a data de nascimento é apenas uma estimativa (RN01).
  // Padrão "true", porque em resgates quase sempre a idade é aproximada.
  await adicionarColunaSeNaoExistir(knex, 'animals', 'birth_estimated', (t) =>
    t.boolean('birth_estimated').notNullable().defaultTo(true)
  );

  // Origem do animal (RF11). Só aceita os valores definidos no README.
  const temOrigem = await knex.schema.hasColumn('animals', 'origin');
  if (!temOrigem) {
    await knex.schema.alterTable('animals', (t) => {
      t.string('origin', 30).nullable();
    });
    // CHECK = regra do banco que impede valores inválidos
    await knex.raw(`
      ALTER TABLE animals
      ADD CONSTRAINT animals_origin_check
      CHECK (origin IS NULL OR origin IN
        ('resgate_rua', 'entrega_voluntaria', 'transferencia', 'nascido_ong'))
    `);
  }

  // ------------------------- TABELA users ---------------------------

  // Perfil de acesso do usuário (RN13).
  // O padrão é 'admin' para não bloquear quem já usa o sistema.
  const temRole = await knex.schema.hasColumn('users', 'role');
  if (!temRole) {
    await knex.schema.alterTable('users', (t) => {
      t.string('role', 20).notNullable().defaultTo('admin');
    });
    await knex.raw(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'veterinario', 'voluntario'))
    `);
  }

  // Usuário ativo ou desativado (RF07).
  // Permite desativar uma pessoa sem apagar o histórico (RN09).
  await adicionarColunaSeNaoExistir(knex, 'users', 'active', (t) =>
    t.boolean('active').notNullable().defaultTo(true)
  );
}

// "down" = o que acontece quando a migration é DESFEITA (rollback).
// Remove as colunas na ordem inversa da criação.
export async function down(knex) {
  // Remove as colunas de users
  for (const coluna of ['active', 'role']) {
    if (await knex.schema.hasColumn('users', coluna)) {
      await knex.schema.alterTable('users', (t) => t.dropColumn(coluna));
    }
  }

  // Remove as colunas de animals
  for (const coluna of ['origin', 'birth_estimated', 'birth_date', 'color', 'breed']) {
    if (await knex.schema.hasColumn('animals', coluna)) {
      await knex.schema.alterTable('animals', (t) => t.dropColumn(coluna));
    }
  }
}
