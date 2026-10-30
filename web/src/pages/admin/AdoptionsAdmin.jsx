import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../components/useFetch.js';
import { api, LABELS, formatDate } from '../../api.js';

export default function AdoptionsAdmin() {
  const [filter, setFilter] = useState('pendente');
  const { data: requests, loading, error, reload } = useFetch(`/adoptions${filter ? `?status=${filter}` : ''}`);

  async function setStatus(request, status) {
    try {
      await api(`/adoptions/${request.id}`, { method: 'PATCH', body: { status } });
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="row-between">
        <h1>Solicitações de adoção</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(LABELS.adoption).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}
      {requests?.length === 0 && <p className="muted">Nenhuma solicitação.</p>}
      <div className="list">
        {requests?.map((r) => (
          <article key={r.id} className="card card-body">
            <div className="row-between">
              <h3>
                {r.name} →{' '}
                {r.animal_id ? <Link to={`/admin/animais/${r.animal_id}`}>{r.animal_name}</Link> : <em>animal removido</em>}
              </h3>
              <span className="badge">{LABELS.adoption[r.status]}</span>
            </div>
            <p className="muted">
              {formatDate(r.created_at)} · {r.email} · {r.phone} · {r.city}
            </p>
            {r.message && <p className="pre">{r.message}</p>}
            <div className="actions">
              {r.status !== 'aprovado' && (
                <button className="btn btn-sm" onClick={() => setStatus(r, 'aprovado')}>
                  Aprovar
                </button>
              )}
              {r.status !== 'recusado' && (
                <button className="btn btn-outline btn-sm" onClick={() => setStatus(r, 'recusado')}>
                  Recusar
                </button>
              )}
              {r.status !== 'pendente' && (
                <button className="link" onClick={() => setStatus(r, 'pendente')}>
                  Voltar para pendente
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
