import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="center">
      <h1>Página não encontrada</h1>
      <Link to="/">Voltar ao início</Link>
    </div>
  );
}
