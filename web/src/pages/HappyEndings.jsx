import { Link } from 'react-router-dom';
import AnimalCard from '../components/AnimalCard.jsx';
import { useFetch } from '../components/useFetch.js';

export default function HappyEndings() {
  const { data: animals, loading, error } = useFetch('/animals?status=adotado');

  return (
    <>
      <div className="happy-endings-page">
        <div className="happy-endings-paws" aria-hidden="true">
          <span>🐾</span>
          <span>🐾</span>
          <span>🐾</span>
          <span>🐾</span>
          <span>🐾</span>
          <span>🐾</span>
        </div>

        <div className="happy-endings-content">
          <section className="hero hero-sm">
            <h1>🎉 Finais felizes</h1>
            <p>
              Toda história merece um final feliz. Cada um destes animais
              chegou até nós precisando de uma chance e hoje descobriu
              o verdadeiro significado de ter um lar.
              {animals?.length > 0 && (
                <>
                  {' '}
                  Já são <strong>{animals.length}</strong>{' '}
                  {animals.length === 1 ? 'história' : 'histórias'} de amor
                  e transformação por aqui.
                </>
              )}
            </p>
          </section>

          {loading && <p>Carregando...</p>}
          {error && <p className="error">{error}</p>}

          {animals?.length === 0 && (
            <p className="muted center">
              As primeiras histórias estão sendo escritas.{' '}
              <Link to="/adote">Que tal começar a sua?</Link>
            </p>
          )}

          <div className="grid">
            {animals?.map((a) => (
              <AnimalCard key={a.id} animal={a} />
            ))}
          </div>

          <section className="happy-endings-message">
            <div className="happy-endings-message-icon">❤️</div>

            <h2>Uma adoção muda duas vidas.</h2>

            <p>
              A de quem finalmente encontra um lar e a de quem descobre
              uma forma de amor que não conhecia. Por trás de cada final feliz,
              existem pessoas que escolheram fazer a diferença.
            </p>

            <p className="happy-endings-thanks">
              Obrigado a todos que resgatam, cuidam, acolhem e adotam.
              Vocês fazem essas histórias acontecerem.
            </p>

            <Link to="/adote" className="btn">
              Escreva uma nova história
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
