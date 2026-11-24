import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../components/useFetch.js';
import ConsentInfo from '../../components/ConsentInfo.jsx';
import { api, LABELS, formatDate } from '../../api.js';

export default function AdoptionsAdmin() {
  const [filter, setFilter] = useState('pendente');
  const { data: requests, loading, error, reload } = useFetch(`/adoptions${filter ? `?status=${filter}` : ''}`);

  async function run(action) {
    try {
      await action();
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  function setStatus(request, status) {
    if (status !== 'aprovado') {
      return run(() => api(`/adoptions/${request.id}`, { method: 'PATCH', body: { status } }));
    }
    // RN05: aprovar reserva o animal e recusa as outras candidaturas pendentes para ele.
    const others = requests.filter((r) => r.animal_id === request.animal_id && r.id !== request.id && r.status === 'pendente');
    const warning = others.length
      ? `\n\nAs outras ${others.length} candidatura(s) pendente(s) para ${request.animal_name} serão recusadas.`
      : '';
    if (!confirm(`Aprovar a candidatura de ${request.name} para ${request.animal_name}? O animal ficará "em processo de adoção".${warning}`)) return;
    run(async () => {
      const { declined } = await api(`/adoptions/${request.id}`, { method: 'PATCH', body: { status } });
      if (declined) alert(`Candidatura aprovada. ${declined} outra(s) candidatura(s) para ${request.animal_name} foram recusadas.`);
    });
  }

  function anonymize(request) {
    if (!confirm(`Apagar os dados pessoais de ${request.name}? O registro da candidatura continua, sem identificação. Esta ação não pode ser desfeita.`)) return;
    run(() => api(`/adoptions/${request.id}/anonymize`, { method: 'POST' }));
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
            {!r.anonymized_at && (
              <p className="muted">
                {formatDate(r.created_at)} · {r.email} · {r.phone} · {r.city}
              </p>
            )}
            {r.message && <p className="pre">{r.message}</p>}
            <ConsentInfo item={r} />
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
              {!r.anonymized_at && (
                <button className="link danger" onClick={() => anonymize(r)}>
                  Anonimizar dados
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
