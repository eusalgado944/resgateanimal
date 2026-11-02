export async function seed(knex) {
  const animals = [
    { id: 'dbe646d1-43b5-4b91-8c8a-dc5622d47101', name: 'Luna', species: 'dog', age: '2 anos', sex: 'female', size: 'medium', description: 'Carinhosa e brincalhona, Luna procura uma família para compartilhar passeios e afeto.', featured: true },
    { id: 'dbe646d1-43b5-4b91-8c8a-dc5622d47102', name: 'Simba', species: 'cat', age: '1 ano', sex: 'male', size: 'small', description: 'Um gatinho curioso e tranquilo que adora companhia e janelas ensolaradas.', featured: true },
    { id: 'dbe646d1-43b5-4b91-8c8a-dc5622d47103', name: 'Thor', species: 'dog', age: '4 anos', sex: 'male', size: 'large', description: 'Companheiro gentil e cheio de energia, pronto para um lar responsável.', featured: false },
    { id: 'dbe646d1-43b5-4b91-8c8a-dc5622d47104', name: 'Mel', species: 'cat', age: '3 anos', sex: 'female', size: 'small', description: 'Doce e afetuosa, Mel gosta de uma rotina calma e muito carinho.', featured: false }
  ];
  for (const animal of animals) await knex('animals').insert(animal).onConflict('id').ignore();
}
