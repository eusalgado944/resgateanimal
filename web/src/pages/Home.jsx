import { Link } from 'react-router-dom';
import AnimalCard from '../components/AnimalCard.jsx';
import { useFetch } from '../components/useFetch.js';

export default function Home() {
  const { data: animals } = useFetch('/animals?status=disponivel');

  return (
    <>
      <section className="hero">
        <h1>Todo animal merece um lar</h1>
        <p>
          Resgatamos, tratamos e encontramos famílias responsáveis para cães e gatos em situação de
          abandono ou maus-tratos.
        </p>
        <div className="actions">
          <Link to="/adote" className="btn">
            Quero adotar
          </Link>
          <Link to="/ajude" className="btn btn-outline">
            Quero ajudar
          </Link>
        </div>
      </section>

      {animals?.length > 0 && (
        <section>
          <h2>Esperando por você</h2>
          <div className="grid">
            {animals.slice(0, 6).map((a) => (
              <AnimalCard key={a.id} animal={a} />
            ))}
          </div>
          <p className="center">
            <Link to="/adote">Ver todos os animais →</Link>
          </p>
        </section>
      )}

      <section className="features">
        <div className="card card-body">
          <h3>🚑 Resgate</h3>
          <p>Atendemos denúncias de animais abandonados, feridos ou em situação de risco.</p>
        </div>
        <div className="card card-body">
          <h3>💉 Cuidado</h3>
          <p>Todos recebem atendimento veterinário, vacinas e castração antes da adoção.</p>
        </div>
        <div className="card card-body">
          <h3>🏡 Adoção responsável</h3>
          <p>Avaliamos cada família para garantir um lar seguro e definitivo.</p>
        </div>
      </section>
    </>
  );
}
