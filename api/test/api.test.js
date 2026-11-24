// Testes de ponta a ponta contra uma API em execução, com um banco descartável.
//   API_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... npm test
// Os testes criam e apagam registros: nunca rode contra o banco de produção.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const B = (process.env.API_URL ?? 'http://localhost:3000') + '/api';
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };

async function call(path, { method = 'GET', body, token, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !raw) headers['Content-Type'] = 'application/json';
  if (raw) headers['Content-Type'] = 'application/json';
  const res = await fetch(B + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const consent = { lgpd_consent: true };
let token;
let thor;
let mia;
let photos;

before(async () => {
  assert.ok(ADMIN.email && ADMIN.password, 'defina ADMIN_EMAIL e ADMIN_PASSWORD');
  const r = await call('/auth/login', { method: 'POST', body: ADMIN });
  assert.equal(r.status, 200, 'login do admin falhou');
  token = r.data.token;
});

test('health check', async () => {
  assert.deepEqual((await call('/health')).data, { ok: true });
});

test('autenticação', async (t) => {
  await t.test('senha errada -> 401', async () => {
    const r = await call('/auth/login', { method: 'POST', body: { ...ADMIN, password: 'errada' } });
    assert.equal(r.status, 401);
  });
  await t.test('e-mail em maiúsculas é aceito', async () => {
    const r = await call('/auth/login', { method: 'POST', body: { ...ADMIN, email: ADMIN.email.toUpperCase() } });
    assert.equal(r.status, 200);
  });
  await t.test('/auth/me devolve o usuário', async () => {
    assert.equal((await call('/auth/me', { token })).data.email, ADMIN.email.toLowerCase());
  });
});

test('proteção e validação', async (t) => {
  await t.test('cadastro sem token -> 401', async () => {
    const r = await call('/animals', { method: 'POST', body: { name: 'X', species: 'gato', sex: 'macho', size: 'pequeno' } });
    assert.equal(r.status, 401);
  });
  await t.test('espécie inválida -> 400', async () => {
    const r = await call('/animals', { method: 'POST', token, body: { name: 'X', species: 'dragao', sex: 'macho', size: 'pequeno' } });
    assert.equal(r.status, 400);
  });
  await t.test('JSON malformado -> 400', async () => {
    assert.equal((await call('/contacts', { method: 'POST', raw: '{quebrado' })).status, 400);
  });
  await t.test('rota inexistente -> 404 em JSON', async () => {
    const r = await call('/nao-existe');
    assert.equal(r.status, 404);
    assert.ok(r.data.error);
  });
  await t.test('estatísticas exigem login', async () => {
    assert.equal((await call('/stats')).status, 401);
  });
});

test('animais', async (t) => {
  await t.test('cadastro', async () => {
    const r = await call('/animals', {
      method: 'POST',
      token,
      body: { name: 'Thor', species: 'cachorro', sex: 'macho', size: 'grande', age_months: 30, neutered: true, rescued_at: '2026-09-15' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.rescued_at, '2026-09-15', 'data sem deslocamento de fuso');
    assert.equal(r.data.views, 0);
    thor = r.data.id;
    const r2 = await call('/animals', { method: 'POST', token, body: { name: 'Mia', species: 'gato', sex: 'femea', size: 'pequeno', status: 'adotado' } });
    assert.equal(r2.status, 201);
    mia = r2.data.id;
  });
  await t.test('filtros da listagem pública', async () => {
    const gatos = (await call('/animals?species=gato')).data;
    assert.ok(gatos.some((a) => a.id === mia) && !gatos.some((a) => a.id === thor));
    const adotados = (await call('/animals?status=adotado')).data;
    assert.ok(adotados.some((a) => a.id === mia));
  });
  await t.test('animal inexistente -> 404', async () => {
    assert.equal((await call('/animals/999999')).status, 404);
  });
  await t.test('edição', async () => {
    const r = await call(`/animals/${thor}`, { method: 'PUT', token, body: { name: 'Thor', species: 'cachorro', sex: 'macho', size: 'grande', status: 'disponivel' } });
    assert.equal(r.status, 200);
  });
});

test('fotos', async (t) => {
  const upload = (files) => {
    const fd = new FormData();
    files.forEach(([content, type, name]) => fd.append('photos', new Blob([content], { type }), name));
    return fetch(`${B}/animals/${thor}/photos`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  };
  await t.test('envio de duas fotos', async () => {
    const res = await upload([[png, 'image/png', 'a.png'], [png, 'image/png', 'b.png']]);
    assert.equal(res.status, 201);
    photos = (await res.json()).photos;
    assert.equal(photos.length, 2);
  });
  await t.test('arquivo que não é imagem -> 400', async () => {
    assert.equal((await upload([['oi', 'text/plain', 'x.txt']])).status, 400);
  });
  await t.test('imagem acima de 5 MB -> 400 com mensagem', async () => {
    const res = await upload([[Buffer.alloc(5 * 1024 * 1024 + 1), 'image/jpeg', 'grande.jpg']]);
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /5 MB/);
  });
  await t.test('foto servida e removida do disco', async () => {
    const url = `${B.replace(/\/api$/, '')}/uploads/${photos[1].filename}`;
    assert.equal((await fetch(url)).status, 200);
    assert.equal((await call(`/animals/${thor}/photos/${photos[1].id}`, { method: 'DELETE', token })).status, 204);
    assert.equal((await fetch(url)).status, 404);
  });
  await t.test('capa na listagem', async () => {
    const lista = (await call('/animals?status=disponivel')).data;
    assert.equal(lista.find((a) => a.id === thor).cover, photos[0].filename);
  });
});

test('visualizações', async (t) => {
  await t.test('incrementa o contador', async () => {
    assert.equal((await call(`/animals/${thor}/view`, { method: 'POST' })).status, 204);
    await call(`/animals/${thor}/view`, { method: 'POST' });
    assert.equal((await call(`/animals/${thor}`)).data.views, 2);
  });
  await t.test('animal inexistente -> 404', async () => {
    assert.equal((await call('/animals/999999/view', { method: 'POST' })).status, 404);
  });
});

test('adoção e LGPD', async (t) => {
  const pedido = { name: 'Maria Silva', email: 'maria@exemplo.com', phone: '11999998888', city: 'São Paulo', message: 'Tenho quintal' };
  let pedidoId;
  await t.test('sem consentimento -> 400', async () => {
    const r = await call('/adoptions', { method: 'POST', body: { ...pedido, animal_id: thor } });
    assert.equal(r.status, 400);
  });
  await t.test('com consentimento -> 201 e data registrada', async () => {
    assert.equal((await call('/adoptions', { method: 'POST', body: { ...pedido, ...consent, animal_id: thor } })).status, 201);
    const lista = (await call('/adoptions', { token })).data;
    const r = lista.find((x) => x.animal_id === thor && x.email === pedido.email);
    assert.ok(r.lgpd_consent_at);
    pedidoId = r.id;
  });
  await t.test('animal já adotado -> 400', async () => {
    assert.equal((await call('/adoptions', { method: 'POST', body: { ...pedido, ...consent, animal_id: mia } })).status, 400);
  });
  await t.test('listagem exige login', async () => {
    assert.equal((await call('/adoptions')).status, 401);
  });
  await t.test('aprovação', async () => {
    assert.equal((await call(`/adoptions/${pedidoId}`, { method: 'PATCH', token, body: { status: 'aprovado' } })).status, 204);
  });
  await t.test('anonimização apaga os dados pessoais', async () => {
    assert.equal((await call(`/adoptions/${pedidoId}/anonymize`, { method: 'POST', token })).status, 204);
    const r = (await call('/adoptions', { token })).data.find((x) => x.id === pedidoId);
    assert.notEqual(r.email, pedido.email);
    assert.equal(r.phone, '-');
    assert.ok(r.anonymized_at);
    assert.equal(r.status, 'aprovado', 'o histórico da adoção é preservado');
  });
});

test('contato e LGPD', async (t) => {
  const msg = { name: 'João', email: 'joao@exemplo.com', type: 'voluntario', message: 'Quero ajudar aos sábados' };
  await t.test('sem consentimento -> 400', async () => {
    assert.equal((await call('/contacts', { method: 'POST', body: msg })).status, 400);
  });
  await t.test('envio, leitura e anonimização', async () => {
    assert.equal((await call('/contacts', { method: 'POST', body: { ...msg, ...consent } })).status, 201);
    const m = (await call('/contacts', { token })).data.find((x) => x.email === msg.email);
    assert.ok(m.lgpd_consent_at);
    assert.equal((await call(`/contacts/${m.id}`, { method: 'PATCH', token, body: { read: true } })).status, 204);
    assert.equal((await call(`/contacts/${m.id}/anonymize`, { method: 'POST', token })).status, 204);
    const depois = (await call('/contacts', { token })).data.find((x) => x.id === m.id);
    assert.equal(depois.phone, null);
    assert.ok(!depois.message.includes('sábados'));
  });
});

test('visão geral do painel', async () => {
  const r = await call('/stats', { token });
  assert.equal(r.status, 200);
  assert.ok(r.data.byStatus.disponivel >= 1);
  assert.ok(r.data.approvedLast30Days >= 1);
  assert.ok(r.data.topViewed.some((a) => a.id === thor && a.views === 2));
});

test('exclusão do animal', async (t) => {
  await t.test('remove as fotos e preserva as candidaturas', async () => {
    assert.equal((await call(`/animals/${thor}`, { method: 'DELETE', token })).status, 204);
    const url = `${B.replace(/\/api$/, '')}/uploads/${photos[0].filename}`;
    assert.equal((await fetch(url)).status, 404);
    const pedidos = (await call('/adoptions', { token })).data;
    assert.ok(pedidos.some((p) => p.animal_id === null));
    await call(`/animals/${mia}`, { method: 'DELETE', token });
  });
});
