import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { auth } from '../../api.js';
import AnimalsAdmin from './AnimalsAdmin.jsx';
import AnimalEditor from './AnimalEditor.jsx';
import AdoptionsAdmin from './AdoptionsAdmin.jsx';
import MessagesAdmin from './MessagesAdmin.jsx';

export default function Admin() {
  const navigate = useNavigate();

  function logout() {
    auth.clear();
    navigate('/');
  }

  return (
    <>
      <div className="admin-bar">
        <nav className="tabs">
          <NavLink to="/admin" end>
            Animais
          </NavLink>
          <NavLink to="/admin/adocoes">Adoções</NavLink>
          <NavLink to="/admin/mensagens">Mensagens</NavLink>
        </nav>
        <button className="btn btn-outline btn-sm" onClick={logout}>
          Sair
        </button>
      </div>
      <Routes>
        <Route index element={<AnimalsAdmin />} />
        <Route path="animais/novo" element={<AnimalEditor />} />
        <Route path="animais/:id" element={<AnimalEditor />} />
        <Route path="adocoes" element={<AdoptionsAdmin />} />
        <Route path="mensagens" element={<MessagesAdmin />} />
      </Routes>
    </>
  );
}
