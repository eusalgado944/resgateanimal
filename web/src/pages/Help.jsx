import { useState } from 'react';
import { api, LABELS } from '../api.js';

export default function Help() {
  const [status, setStatus] = useState({ sending: false, done: false, error: null });

  async function handleSubmit(e) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = Object.fromEntries(new FormData(formEl));
    if (!form.phone) delete form.phone;
    setStatus({ sending: true, done: false, error: null });
    try {
      await api('/contacts', { method: 'POST', body: form });
      formEl.reset();
      setStatus({ sending: false, done: true, error: null });
    } catch (err) {
      setStatus({ sending: false, done: false, error: err.message });
    }
  }

  return (
    <>
      <h1>Como ajudar</h1>
      <section className="features">
        <div className="card card-body">
          <h3>💰 Doe</h3>
          <p>
            Sua doação paga ração, vacinas, castrações e cirurgias.
            <br />
            <strong>PIX:</strong> <code>defina-a-chave-pix@ong.org</code>
          </p>
        </div>
        <div className="card card-body">
          <h3>🙋 Seja voluntário</h3>
          <p>Ajude em feiras de adoção, transporte, lar temporário ou divulgação.</p>
        </div>
        <div className="card card-body">
          <h3>📢 Denuncie</h3>
          <p>Viu um animal em risco ou sofrendo maus-tratos? Fale com a gente.</p>
        </div>
      </section>

      <form className="card card-body form" onSubmit={handleSubmit}>
        <h2>Fale com a gente</h2>
        <div className="form-row">
          <label>
            Nome
            <input name="name" required minLength={2} />
          </label>
          <label>
            E-mail
            <input name="email" type="email" required />
          </label>
        </div>
        <div className="form-row">
          <label>
            Telefone (opcional)
            <input name="phone" />
          </label>
          <label>
            Assunto
            <select name="type" defaultValue="contato">
              {Object.entries(LABELS.contact).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Mensagem
          <textarea name="message" rows={5} required minLength={5} />
        </label>
        {status.error && <p className="error">{status.error}</p>}
        {status.done && <p className="success">Mensagem enviada! Obrigado pelo contato. 💛</p>}
        <button className="btn" disabled={status.sending}>
          {status.sending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </>
  );
}
