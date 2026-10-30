// Migrações registradas explicitamente: evita depender de leitura de diretório
// e funciona igual em Windows, Linux e dentro do container.
// Para criar uma nova: adicione o arquivo NNN_descricao.js e registre-o aqui.
import * as m001 from './001_init.js';

const migrations = {
  '001_init': m001,
};

export const migrationSource = {
  getMigrations: async () => Object.keys(migrations),
  getMigrationName: (name) => name,
  getMigration: async (name) => migrations[name],
};
