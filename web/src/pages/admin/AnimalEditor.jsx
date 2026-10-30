import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, LABELS, photoUrl } from '../../api.js';

const EMPTY = {
  name: '',
  species: 'cachorro',
  sex: 'macho',
  size: 'medio',
  age_months: '',
  description: '',
  health_notes: '',
  neutered: false,
  vaccinated: false,
  status: 'disponivel',
  rescued_at: '',
};

export default function AnimalEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(id ? null : { ...EMPTY, photos: [] });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!id) return;
    api(`/animals/${id}`)
      .then((a) => setAnimal({ ...a, age_months: a.age_months ?? '', rescued_at: a.rescued_at?.slice(0, 10) ?? '' }))
      .catch((err) => setError(err.message));
  }, [id]);

  if (!animal) return error ? <p className="error">{error}</p> : <p>Carregando...</p>;

  const set = (field) => (e) =>
    setAnimal({ ...animal, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const body = {
      name: animal.name,
      species: animal.species,
      sex: animal.sex,
      size: animal.size,
      age_months: animal.age_months === '' ? null : Number(animal.age_months),
      description: animal.description,
      health_notes: animal.health_notes,
      neutered: animal.neutered,
      vaccinated: animal.vaccinated,
      status: animal.status,
      rescued_at: animal.rescued_at || null,
    };
    try {
      const saved = await api(id ? `/animals/${id}` : '/animals', { method: id ? 'PUT' : 'POST', body });
      if (!id) {
        navigate(`/admin/animais/${saved.id}`, { replace: true });
        return;
      }
      setNotice('Alterações salvas.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhotos(e) {
    const files = [...e.target.files];
    if (!files.length) return;
    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    setError(null);
    try {
      const updated = await api(`/animals/${id}/photos`, { method: 'POST', form });
      setAnimal({ ...animal, photos: updated.photos });
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  }

  async function removePhoto(photo) {
    if (!confirm('Remover esta foto?')) return;
    try {
      await api(`/animals/${id}/photos/${photo.id}`, { method: 'DELETE' });
      setAnimal({ ...animal, photos: animal.photos.filter((p) => p.id !== photo.id) });
    } catch (err) {
      setError(err.message);
    }
  }

  const select = (field) => (
    <select value={animal[field]} onChange={set(field)}>
      {Object.entries(LABELS[field]).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <p>
        <Link to="/admin">← Voltar</Link>
      </p>
      <form className="card card-body form" onSubmit={handleSubmit}>
        <h1>{id ? `Editar ${animal.name}` : 'Cadastrar animal'}</h1>
        <div className="form-row">
          <label>
            Nome
            <input value={animal.name} onChange={set('name')} required maxLength={100} />
          </label>
          <label>
            Status
            {select('status')}
          </label>
        </div>
        <div className="form-row">
          <label>
            Espécie
            {select('species')}
          </label>
          <label>
            Sexo
            {select('sex')}
          </label>
          <label>
            Porte
            {select('size')}
          </label>
        </div>
        <div className="form-row">
          <label>
            Idade aproximada (meses)
            <input type="number" min={0} max={400} value={animal.age_months} onChange={set('age_months')} />
          </label>
          <label>
            Data do resgate
            <input type="date" value={animal.rescued_at} onChange={set('rescued_at')} />
          </label>
        </div>
        <div className="checks">
          <label>
            <input type="checkbox" checked={animal.neutered} onChange={set('neutered')} /> Castrado
          </label>
          <label>
            <input type="checkbox" checked={animal.vaccinated} onChange={set('vaccinated')} /> Vacinado
          </label>
        </div>
        <label>
          Descrição / história
          <textarea rows={5} value={animal.description} onChange={set('description')} />
        </label>
        <label>
          Observações de saúde
          <textarea rows={3} value={animal.health_notes} onChange={set('health_notes')} />
        </label>
        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}
        <button className="btn" disabled={saving}>
          {saving ? 'Salvando...' : id ? 'Salvar alterações' : 'Cadastrar e adicionar fotos'}
        </button>
      </form>

      {id && (
        <section className="card card-body">
          <h2>Fotos</h2>
          <p className="muted">A primeira foto é usada como capa. JPG, PNG ou WEBP até 5 MB.</p>
          <div className="photo-grid">
            {animal.photos.map((p) => (
              <figure key={p.id}>
                <img src={photoUrl(p.filename)} alt="" />
                <button type="button" className="link danger" onClick={() => removePhoto(p)}>
                  Remover
                </button>
              </figure>
            ))}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPhotos} />
        </section>
      )}
    </>
  );
}
