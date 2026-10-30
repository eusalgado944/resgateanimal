const TOKEN_KEY = 'resgate.token';

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  if (res.status === 401 && auth.token) {
    auth.clear();
    window.location.assign('/login');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
  return data;
}

export const photoUrl = (filename) => `/uploads/${filename}`;

export const LABELS = {
  species: { cachorro: 'Cachorro', gato: 'Gato', outro: 'Outro' },
  sex: { macho: 'Macho', femea: 'Fêmea' },
  size: { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' },
  status: {
    disponivel: 'Disponível',
    em_processo: 'Em processo de adoção',
    adotado: 'Adotado',
    em_tratamento: 'Em tratamento',
  },
  adoption: { pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado' },
  contact: { contato: 'Contato', voluntario: 'Voluntariado', doacao: 'Doação', denuncia: 'Denúncia' },
};

export function formatAge(months) {
  if (months == null) return 'Idade desconhecida';
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

export const formatDate = (value) => new Date(value).toLocaleDateString('pt-BR');
