import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../components/useFetch.js';
import { api, LABELS, formatAge, photoUrl } from '../api.js';

export default function AnimalDetail() {
  const { id } = useParams();
  const { data: animal, loading, error } = useFetch(`/animals/${id}`);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="error">{error}</p>;

  const photo = animal.photos[photoIndex];
  const canAdopt = ['disponivel', 'em_processo'].includes(animal.status);

  return (
    <>
      <p>
        <Link to="/adote">← Voltar</Link>
      </p>
      <div className="detail">
        <div>
          <div className="detail-photo">
            {photo ? <img src={photoUrl(photo.filename)} alt={animal.name} /> : <span className="no-photo">🐾</span>}
          </div>
          {animal.photos.length > 1 && (
            <div className="thumbs">
              {animal.photos.map((p, i) => (
                <button key={p.id} className={i === photoIndex ? 'active' : ''} onClick={() => setPhotoIndex(i)}>
                  <img src={photoUrl(p.filename)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1>{animal.name}</h1>
          <span className="badge">{LABELS.status[animal.status]}</span>
          <ul className="facts">
            <li>
              <strong>Espécie:</strong> {LABELS.species[animal.species]}
            </li>
            <li>
              <strong>Sexo:</strong> {LABELS.sex[animal.sex]}
            </li>
            <li>
              <strong>Porte:</strong> {LABELS.size[animal.size]}
            </li>
            <li>
              <strong>Idade:</strong> {formatAge(animal.age_months)}
            </li>
            <li>
              <strong>Castrado:</strong> {animal.neutered ? 'Sim' : 'Não'} · <strong>Vacinado:</strong>{' '}
              {animal.vaccinated ? 'Sim' : 'Não'}
            </li>
          </ul>
          {animal.description && <p className="pre">{animal.description}</p>}
          {animal.health_notes && (
            <p className="pre muted">
              <strong>Saúde:</strong> {animal.health_notes}
            </p>
          )}
        </div>
      </div>

      {canAdopt && <AdoptionForm animal={animal} />}
    </>
  );
}

function AdoptionForm({ animal }) {
  const [status, setStatus] = useState({ sending: false, done: false, error: null });

  async function handleSubmit(e) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setStatus({ sending: true, done: false, error: null });
    try {
      await api('/adoptions', { method: 'POST', body: { ...form, animal_id: animal.id } });
      setStatus({ sending: false, done: true, error: null });
    } catch (err) {
      setStatus({ sending: false, done: false, error: err.message });
    }
  }

  if (status.done) {
    return (
      <div className="card card-body success">
        Recebemos seu interesse em adotar {animal.name}! Nossa equipe entrará em contato em breve. 💛
      </div>
    );
  }

  return (
    <form className="card card-body form" onSubmit={handleSubmit}>
      <h2>Quero adotar {animal.name}</h2>
      <div className="form-row">
        <label>
          Nome completo
          <input name="name" required minLength={2} />
        </label>
        <label>
          E-mail
          <input name="email" type="email" required />
        </label>
      </div>
      <div className="form-row">
        <label>
          Telefone / WhatsApp
          <input name="phone" required minLength={8} />
        </label>
        <label>
          Cidade
          <input name="city" required />
        </label>
      </div>
      <label>
        Conte um pouco sobre você e sua casa
        <textarea name="message" rows={4} />
      </label>
      {status.error && <p className="error">{status.error}</p>}
      <button className="btn" disabled={status.sending}>
        {status.sending ? 'Enviando...' : 'Enviar interesse'}
      </button>
    </form>
  );
}
