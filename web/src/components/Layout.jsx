import { NavLink, Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            🐾 Resgate Animal
          </Link>
          <nav className="nav">
            <NavLink to="/" end>
              Início
            </NavLink>
            <NavLink to="/adote">Adote</NavLink>
            <NavLink to="/ajude">Como ajudar</NavLink>
          </nav>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>© {new Date().getFullYear()} Resgate Animal — adoção responsável salva vidas.</p>
          <Link to="/admin">Área administrativa</Link>
        </div>
      </footer>
    </>
  );
}
