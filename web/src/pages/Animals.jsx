import { useSearchParams } from 'react-router-dom';
import AnimalCard from '../components/AnimalCard.jsx';
import { useFetch } from '../components/useFetch.js';
import { LABELS } from '../api.js';

const FILTERS = ['species', 'sex', 'size'];

export default function Animals() {
  const [params, setParams] = useSearchParams();
  const query = new URLSearchParams({ status: 'disponivel' });
  FILTERS.forEach((f) => params.get(f) && query.set(f, params.get(f)));
  const { data: animals, loading, error } = useFetch(`/animals?${query}`);

  function setFilter(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  return (
    <>
      <h1>Adote um amigo</h1>
      <div className="filters">
        {FILTERS.map((f) => (
          <select key={f} value={params.get(f) ?? ''} onChange={(e) => setFilter(f, e.target.value)}>
            <option value="">
              {{ species: 'Todas as espécies', sex: 'Qualquer sexo', size: 'Qualquer porte' }[f]}
            </option>
            {Object.entries(LABELS[f]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ))}
      </div>

      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}
      {animals?.length === 0 && <p className="muted">Nenhum animal encontrado com esses filtros.</p>}
      <div className="grid">
        {animals?.map((a) => (
          <AnimalCard key={a.id} animal={a} />
        ))}
      </div>
    </>
  );
}
