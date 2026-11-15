
import { Link } from 'react-router-dom';
import AnimalCard from '../components/AnimalCard.jsx';
import { useFetch } from '../components/useFetch.js';

export default function Home() {
  const { data: animals } = useFetch('/animals?status=disponivel');

  return (
    <>
      <section className="hero">
        <h1>Todo animal merece uma segunda chance. Todo lar pode mudar uma vida.</h1>
        <p>
          Por trás de cada olhar existe uma história esperando por um novo começo.
          Resgatamos, cuidamos e conectamos cães e gatos abandonados a famílias
          que possam oferecer aquilo que eles mais precisam: amor, respeito e um lar.
        </p>
        <div className="actions">
          <Link to="/adote" className="btn">
            Quero transformar uma vida
          </Link>
          <Link to="/ajude" className="btn btn-outline">
            Quero fazer a diferença
          </Link>
        </div>
      </section>

      {animals?.length > 0 && (
        <section>
          <h2>Talvez seu melhor amigo esteja aqui</h2>
          <div className="grid">
            {animals.slice(0, 6).map((a) => (
              <AnimalCard key={a.id} animal={a} />
            ))}
          </div>
          <p className="center">
            <Link to="/adote">Conheça todos os animais que esperam por você →</Link>
          </p>
        </section>
      )}

      <section className="features">
        <div className="card card-body">
          <h3>🚑 Resgate e esperança</h3>
          <p>
            Cada resgate representa uma vida que ganha uma nova oportunidade.
            Estamos aqui para dar voz a quem não pode pedir ajuda.
          </p>
        </div>
        <div className="card card-body">
          <h3>💉 Cuidado e proteção</h3>
          <p>
            Oferecemos atendimento veterinário, vacinação e castração,
            porque todo animal merece saúde, dignidade e uma vida feliz.
          </p>
        </div>
        <div className="card card-body">
          <h3>🏡 Adoção responsável</h3>
          <p>
            Buscamos famílias que entendam que adotar é um compromisso
            para a vida toda, feito de carinho, cuidado e responsabilidade.
          </p>
        </div>
        <div className="card card-body">
          <h3>❤️ Amor que transforma</h3>
          <p>
            Um gesto de carinho pode mudar completamente a história de um animal.
            Pequenas atitudes podem criar grandes histórias de felicidade.
          </p>
        </div>
        <div className="card card-body">
          <h3>🤝 Sua ajuda importa</h3>
          <p>
            Não é preciso adotar para salvar uma vida. Doações, divulgação
            e voluntariado também ajudam a escrever finais felizes.
          </p>
        </div>
        <div className="card card-body">
          <h3>🐾 Finais felizes</h3>
          <p>
            Cada adoção bem-sucedida é uma história de superação.
            Acreditamos que todo resgate merece terminar com uma família e muito amor.
          </p>
        </div>
      </section>
    </>
  );
}
