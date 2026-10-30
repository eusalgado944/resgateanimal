import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, auth } from '../api.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const { token } = await api('/auth/login', {
        method: 'POST',
        body: Object.fromEntries(new FormData(e.currentTarget)),
      });
      auth.set(token);
      navigate(location.state?.from ?? '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <form className="card card-body form narrow" onSubmit={handleSubmit}>
      <h1>Entrar</h1>
      <label>
        E-mail
        <input name="email" type="email" required autoComplete="username" />
      </label>
      <label>
        Senha
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={sending}>
        {sending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
