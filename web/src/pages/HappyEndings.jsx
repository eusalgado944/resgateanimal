
import { Link } from 'react-router-dom';
import AnimalCard from '../components/AnimalCard.jsx';
import { useFetch } from '../components/useFetch.js';

export default function HappyEndings() {
  const { data: animals, loading, error } = useFetch('/animals?status=adotado');

  return (
    <>
      <style>{`
        .happy-endings-page {
          position: relative;
          isolation: isolate;
          overflow: hidden;
        }

        .happy-endings-paws {
          position: absolute;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .happy-endings-paws span {
          position: absolute;
          opacity: 0.07;
          font-size: 32px;
          animation: happyPawsFloat 12s ease-in-out infinite;
        }

        .happy-endings-paws span:nth-child(1) {
          top: 12%;
          left: 8%;
          animation-delay: 0s;
        }

        .happy-endings-paws span:nth-child(2) {
          top: 32%;
          right: 10%;
          animation-delay: -3s;
        }

        .happy-endings-paws span:nth-child(3) {
          top: 55%;
          left: 18%;
          animation-delay: -6s;
        }

        .happy-endings-paws span:nth-child(4) {
          top: 70%;
          right: 15%;
          animation-delay: -2s;
        }

        .happy-endings-paws span:nth-child(5) {
          top: 85%;
          left: 45%;
          animation-delay: -8s;
        }

        .happy-endings-paws span:nth-child(6) {
          top: 42%;
          left: 75%;
          animation-delay: -5s;
        }

        @keyframes happyPawsFloat {
          0%, 100% {
            transform: translateY(0) rotate(-12deg);
          }

          50% {
            transform: translateY(-22px) rotate(12deg);
          }
        }

        .happy-endings-content {
          position: relative;
          z-index: 1;
        }

        .happy-endings-message {
          max-width: 720px;
          margin: 70px auto 35px;
          padding: 35px 25px;
          text-align: center;
        }

        .happy-endings-message-icon {
          font-size: 38px;
          margin-bottom: 12px;
          animation: happyHeart 2.5s ease-in-out infinite;
        }

        .happy-endings-message h2 {
          margin-bottom: 16px;
        }

        .happy-endings-message p {
          line-height: 1.8;
        }

        .happy-endings-thanks {
          margin: 20px 0 25px;
          font-weight: 500;
        }

        @keyframes happyHeart {
          0%, 100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.12);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .happy-endings-paws span,
          .happy-endings-message-icon {
            animation: none;
          }
        }
      `}</style>

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
