import { Link } from 'react-router-dom';
import { useFetch } from '../../components/useFetch.js';
import { api, LABELS, formatDate } from '../../api.js';

export default function AnimalsAdmin() {
  const { data: animals, loading, error, reload } = useFetch('/animals');

  async function remove(animal) {
    if (!confirm(`Excluir ${animal.name} e todas as suas fotos?`)) return;
    try {
      await api(`/animals/${animal.id}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="row-between">
        <h1>Animais</h1>
        <Link to="/admin/animais/novo" className="btn">
          + Cadastrar animal
        </Link>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}
      {animals?.length === 0 && <p className="muted">Nenhum animal cadastrado ainda.</p>}
      {animals?.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Espécie</th>
                <th>Status</th>
                <th>Cadastro</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {animals.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{LABELS.species[a.species]}</td>
                  <td>{LABELS.status[a.status]}</td>
                  <td>{formatDate(a.created_at)}</td>
                  <td className="actions-cell">
                    <Link to={`/admin/animais/${a.id}`}>Editar</Link>
                    <button className="link danger" onClick={() => remove(a)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
