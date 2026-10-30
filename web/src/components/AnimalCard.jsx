import { Link } from 'react-router-dom';
import { LABELS, formatAge, photoUrl } from '../api.js';

export default function AnimalCard({ animal }) {
  return (
    <Link to={`/adote/${animal.id}`} className="card animal-card">
      <div className="animal-cover">
        {animal.cover ? (
          <img src={photoUrl(animal.cover)} alt={animal.name} loading="lazy" />
        ) : (
          <span className="no-photo">{animal.species === 'gato' ? '🐱' : '🐶'}</span>
        )}
      </div>
      <div className="card-body">
        <h3>{animal.name}</h3>
        <p className="muted">
          {LABELS.sex[animal.sex]} · {LABELS.size[animal.size]} · {formatAge(animal.age_months)}
        </p>
        {animal.status !== 'disponivel' && <span className="badge">{LABELS.status[animal.status]}</span>}
      </div>
    </Link>
  );
}
