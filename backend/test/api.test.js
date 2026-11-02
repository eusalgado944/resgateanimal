import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, rm, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';
import { readConfig } from '../src/config.js';
import { seed } from '../seeds/001_animals.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must point to a dedicated database whose name ends in _test. Tests reset its tables.');
}
const db = createDatabase(databaseUrl);
const adminId = randomUUID();
const password = randomBytes(16).toString('hex');
const secret = randomBytes(48).toString('hex');
const uploadDir = resolve(`test/.uploads-${process.pid}`);
const config = { jwtSecret: secret, uploadDir, corsOrigin: 'http://localhost:5173' };
const animalId = 'dbe646d1-43b5-4b91-8c8a-dc5622d47101';
const missingId = '00000000-0000-4000-8000-000000000001';
let server;
let base;
let token;
let adminHash;
const animalBody = {
  name: 'Pipoca', species: 'dog', age: '2 anos', sex: 'female', size: 'small',
  description: 'Muito carinhosa e pronta para um lar.'
};
const applicationBody = {
  animalId, name: 'Pessoa de Teste', email: 'test@example.test', phone: '+55 11 99999-0000',
  city: 'São Paulo', housing: 'Apartamento', experience: 'Já cuidei de cães.', message: 'Gostaria de adotar.'
};
const messageBody = {
  type: 'contact', name: 'Pessoa de Teste', email: 'test@example.test',
  message: 'Gostaria de conhecer o projeto.'
};
async function request(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Authorization: ['Bearer', token].join(' ') } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data, headers: response.headers };
}
async function photoUpload(content, type = 'image/png', filename = 'safe.png', id = animalId, auth = true, field = 'photo') {
  const form = new FormData();
  form.append(field, new Blob([content], { type }), filename);
  const response = await fetch(`${base}/api/admin/animals/${id}/photo`, {
    method: 'POST', headers: auth ? { Authorization: ['Bearer', token].join(' ') } : {}, body: form
  });
  return { status: response.status, data: await response.json() };
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
before(async () => {
  await mkdir(uploadDir, { recursive: true });
  await db.migrate.latest({ directory: resolve('migrations') });
  adminHash = await bcrypt.hash(password, 4);
  const app = await createApp({ db, config, limits: { general: 2000, submissions: 1000, login: 100, uploads: 100 } });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  token = jwt.sign({}, secret, { algorithm: 'HS256', subject: adminId, expiresIn: '2h', issuer: 'focinho-amigo', audience: 'focinho-admin' });
});
beforeEach(async () => {
  await db.raw('TRUNCATE messages, applications, animals, admins CASCADE');
  await seed(db);
  await db('admins').insert({ id: adminId, name: 'Admin de Teste', email: 'admin@example.test', password_hash: adminHash });
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await db.destroy();
  await rm(uploadDir, { recursive: true, force: true });
});

test('health checks real database connectivity and sends security headers', async () => {
  const result = await request('/api/health');
  assert.equal(result.status, 200);
  assert.equal(result.data.status, 'ok');
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(result.headers.get('x-powered-by'), null);
});
test('organization identifies the single fictional case study', async () => {
  const result = await request('/api/organization');
  assert.equal(result.data.organization.name, 'Associação Focinho Amigo');
  assert.equal(result.data.organization.isCaseStudy, true);
});
test('public gallery lists seeded available animals without private records', async () => {
  const result = await request('/api/animals');
  assert.equal(result.status, 200);
  assert.equal(result.data.total, 4);
  assert.equal(result.data.animals[0].featured, true);
  assert.ok(!('password_hash' in result.data.animals[0]));
});
test('gallery filters species and size with pagination', async () => {
  const result = await request('/api/animals?species=cat&size=small&limit=1&offset=1');
  assert.equal(result.status, 200);
  assert.equal(result.data.total, 2);
  assert.equal(result.data.animals.length, 1);
  assert.equal(result.data.animals[0].species, 'cat');
});
test('gallery search treats SQL wildcard characters literally', async () => {
  assert.equal((await request('/api/animals?search=Luna')).data.total, 1);
  assert.equal((await request('/api/animals?search=%25')).data.total, 0);
  assert.equal((await request('/api/animals?search=%27%20OR%201%3D1--')).data.total, 0);
});
test('gallery rejects invalid enum, excessive limit and unknown query fields', async () => {
  for (const query of ['species=bird', 'limit=101', 'offset=-1', 'status=adopted']) {
    assert.equal((await request(`/api/animals?${query}`)).status, 400);
  }
});
test('public detail returns an available animal', async () => {
  const result = await request(`/api/animals/${animalId}`);
  assert.equal(result.status, 200);
  assert.equal(result.data.animal.name, 'Luna');
});
test('nonpublic animals are hidden from gallery and detail', async () => {
  await db('animals').where('id', animalId).update({ status: 'adopted' });
  assert.equal((await request('/api/animals')).data.total, 3);
  assert.equal((await request(`/api/animals/${animalId}`)).status, 404);
});
test('malformed and unknown animal IDs return 400 and 404 respectively', async () => {
  assert.equal((await request('/api/animals/not-a-uuid')).status, 400);
  assert.equal((await request(`/api/animals/${missingId}`)).status, 404);
});
test('application persists with animal snapshot and private fields do not echo', async () => {
  const result = await request('/api/applications', { method: 'POST', body: applicationBody });
  assert.equal(result.status, 201);
  assert.deepEqual(Object.keys(result.data.application).sort(), ['id', 'status']);
  const row = await db('applications').where('id', result.data.application.id).first();
  assert.equal(row.animal_name, 'Luna');
  assert.equal(row.status, 'pending');
  assert.equal(row.city, 'São Paulo');
});
test('application validation rejects bad email, missing phone and status injection', async () => {
  for (const change of [{ email: 'invalid' }, { phone: '' }, { status: 'approved' }]) {
    assert.equal((await request('/api/applications', { method: 'POST', body: { ...applicationBody, ...change } })).status, 400);
  }
  assert.equal(Number((await db('applications').count('* as count'))[0].count), 0);
});
test('application cannot target missing or already adopted animals', async () => {
  assert.equal((await request('/api/applications', { method: 'POST', body: { ...applicationBody, animalId: missingId } })).status, 404);
  await db('animals').where('id', animalId).update({ status: 'adopted' });
  assert.equal((await request('/api/applications', { method: 'POST', body: applicationBody })).status, 404);
});
for (const type of ['contact', 'volunteer', 'donation', 'abuse']) {
  test(`${type} inquiry persists and returns only public acknowledgement`, async () => {
    const result = await request('/api/messages', { method: 'POST', body: { ...messageBody, type, ...(type === 'abuse' ? { address: 'Rua de Teste, 100' } : {}) } });
    assert.equal(result.status, 201);
    assert.deepEqual(Object.keys(result.data.message).sort(), ['id', 'status']);
    assert.equal((await db('messages').where('id', result.data.message.id).first()).type, type);
  });
}
test('abuse report requires a location and unsupported message types fail', async () => {
  assert.equal((await request('/api/messages', { method: 'POST', body: { ...messageBody, type: 'abuse' } })).status, 400);
  assert.equal((await request('/api/messages', { method: 'POST', body: { ...messageBody, type: 'payment' } })).status, 400);
});
test('admin login returns a signed expiring JWT and no password hash', async () => {
  const result = await request('/api/admin/login', { method: 'POST', body: { email: 'ADMIN@example.test', password } });
  assert.equal(result.status, 200);
  assert.equal(jwt.verify(result.data.token, secret, { issuer: 'focinho-amigo', audience: 'focinho-admin' }).sub, adminId);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Object.keys(result.data.admin).sort(), ['email', 'id', 'name']);
});
test('unknown account, wrong password and malformed credentials have identical errors', async () => {
  const results = await Promise.all([
    { email: 'unknown@example.test', password },
    { email: 'admin@example.test', password: 'wrong' },
    { email: 'bad' }
  ].map(body => request('/api/admin/login', { method: 'POST', body })));
  for (const result of results) {
    assert.equal(result.status, 401);
    assert.deepEqual(result.data, results[0].data);
  }
});
test('every administrative endpoint rejects unauthenticated access', async () => {
  const endpoints = [
    ['GET', '/api/admin/animals'], ['POST', '/api/admin/animals'],
    ['PATCH', `/api/admin/animals/${animalId}`], ['DELETE', `/api/admin/animals/${animalId}`],
    ['POST', `/api/admin/animals/${animalId}/photo`], ['GET', '/api/admin/applications'],
    ['PATCH', `/api/admin/applications/${missingId}`], ['GET', '/api/admin/messages'],
    ['PATCH', `/api/admin/messages/${missingId}`]
  ];
  for (const [method, path] of endpoints) assert.equal((await request(path, { method })).status, 401, path);
});
test('tampered, expired and wrong-audience tokens are rejected', async () => {
  const expired = jwt.sign({}, secret, { subject: adminId, expiresIn: -1, issuer: 'focinho-amigo', audience: 'focinho-admin' });
  const wrongAudience = jwt.sign({}, secret, { subject: adminId, issuer: 'focinho-amigo', audience: 'public' });
  for (const value of [`${token}x`, expired, wrongAudience]) {
    assert.equal((await request('/api/admin/animals', { headers: { Authorization: ['Bearer', value].join(' ') } })).status, 401);
  }
});
test('deleted administrators lose access even with an unexpired token', async () => {
  await db('admins').where('id', adminId).delete();
  assert.equal((await request('/api/admin/animals', { auth: true })).status, 401);
});
test('admin creates animal with schema defaults', async () => {
  const result = await request('/api/admin/animals', { method: 'POST', body: animalBody, auth: true });
  assert.equal(result.status, 201);
  assert.equal(result.data.animal.breed, 'Sem raça definida');
  assert.equal(result.data.animal.status, 'available');
  assert.equal(result.data.animal.photoUrl, null);
});
test('admin creation rejects missing fields and externally supplied photo URL', async () => {
  assert.equal((await request('/api/admin/animals', { method: 'POST', body: { name: 'Incomplete' }, auth: true })).status, 400);
  assert.equal((await request('/api/admin/animals', { method: 'POST', body: { ...animalBody, photoUrl: 'https://evil.test/file.svg' }, auth: true })).status, 400);
});
test('admin partial update preserves omitted fields including defaults', async () => {
  for (const status of ['adopted', 'unavailable']) {
    const created = await request('/api/admin/animals', {
      method: 'POST', body: { ...animalBody, breed: 'Especial', featured: true, status }, auth: true
    });
    assert.equal(created.status, 201);
    const result = await request(`/api/admin/animals/${created.data.animal.id}`, {
      method: 'PATCH', body: { name: 'Nome Novo' }, auth: true
    });
    assert.equal(result.status, 200);
    assert.equal(result.data.animal.name, 'Nome Novo');
    assert.equal(result.data.animal.breed, 'Especial');
    assert.equal(result.data.animal.featured, true);
    assert.equal(result.data.animal.status, status);
  }
});
test('empty updates and unknown animal updates are rejected', async () => {
  assert.equal((await request(`/api/admin/animals/${animalId}`, { method: 'PATCH', body: {}, auth: true })).status, 400);
  assert.equal((await request(`/api/admin/animals/${missingId}`, { method: 'PATCH', body: { name: 'Novo' }, auth: true })).status, 404);
});
test('admin list includes unavailable animals while public list excludes them', async () => {
  await db('animals').where('id', animalId).update({ status: 'unavailable' });
  assert.equal((await request('/api/admin/animals', { auth: true })).data.total, 4);
  assert.equal((await request('/api/animals')).data.total, 3);
});
test('admin triages application with notes and filter', async () => {
  const created = await request('/api/applications', { method: 'POST', body: applicationBody });
  const id = created.data.application.id;
  const result = await request(`/api/admin/applications/${id}`, { method: 'PATCH', body: { status: 'approved', notes: 'Entrevista realizada.' }, auth: true });
  assert.equal(result.status, 200);
  assert.equal(result.data.application.notes, 'Entrevista realizada.');
  const listed = await request('/api/admin/applications?status=approved', { auth: true });
  assert.equal(listed.data.total, 1);
  assert.equal(listed.data.applications[0].email, applicationBody.email);
  assert.equal((await request('/api/admin/applications?status=pending', { auth: true })).data.total, 0);
});
test('application triage rejects invalid status and missing application', async () => {
  assert.equal((await request(`/api/admin/applications/${missingId}`, { method: 'PATCH', body: { status: 'bad' }, auth: true })).status, 400);
  assert.equal((await request(`/api/admin/applications/${missingId}`, { method: 'PATCH', body: { status: 'rejected' }, auth: true })).status, 404);
});
test('admin reads and archives received messages, filtering by type/status', async () => {
  const created = await request('/api/messages', { method: 'POST', body: messageBody });
  const id = created.data.message.id;
  const read = await request(`/api/admin/messages/${id}`, { method: 'PATCH', body: { status: 'read' }, auth: true });
  assert.equal(read.data.message.status, 'read');
  await request(`/api/admin/messages/${id}`, { method: 'PATCH', body: { status: 'archived' }, auth: true });
  const listed = await request('/api/admin/messages?type=contact&status=archived', { auth: true });
  assert.equal(listed.data.total, 1);
  assert.equal(listed.data.messages[0].email, messageBody.email);
  assert.equal((await request('/api/admin/messages?status=new', { auth: true })).data.total, 0);
});
test('message management rejects unknown statuses, IDs and query fields', async () => {
  assert.equal((await request(`/api/admin/messages/${missingId}`, { method: 'PATCH', body: { status: 'bad' }, auth: true })).status, 400);
  assert.equal((await request(`/api/admin/messages/${missingId}`, { method: 'PATCH', body: { status: 'read' }, auth: true })).status, 404);
  assert.equal((await request('/api/admin/messages?unexpected=1', { auth: true })).status, 400);
});
test('animal deletion retains adoption application with name snapshot', async () => {
  const created = await request('/api/applications', { method: 'POST', body: applicationBody });
  assert.equal((await request(`/api/admin/animals/${animalId}`, { method: 'DELETE', auth: true })).status, 204);
  const row = await db('applications').where('id', created.data.application.id).first();
  assert.equal(row.animal_id, null);
  assert.equal(row.animal_name, 'Luna');
  assert.equal((await request(`/api/admin/animals/${animalId}`, { method: 'DELETE', auth: true })).status, 404);
});
test('valid raster upload gets a server-generated safe URL and immutable bytes', async () => {
  const result = await photoUpload(png, 'image/png', '../../evil.html');
  assert.equal(result.status, 200);
  assert.match(result.data.animal.photoUrl, /^\/uploads\/[a-f0-9-]{36}\.png$/);
  const response = await fetch(`${base}${result.data.animal.photoUrl}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
});
test('replacement removes old uploaded image and deletion removes replacement', async () => {
  const first = await photoUpload(png);
  const second = await photoUpload(png);
  assert.notEqual(first.data.animal.photoUrl, second.data.animal.photoUrl);
  assert.equal((await fetch(`${base}${first.data.animal.photoUrl}`)).status, 404);
  await request(`/api/admin/animals/${animalId}`, { method: 'DELETE', auth: true });
  await assert.rejects(access(joinUpload(second.data.animal.photoUrl)));
});
function joinUpload(url) { return resolve(uploadDir, url.slice('/uploads/'.length)); }
test('SVG, executable content and spoofed raster MIME are rejected', async () => {
  assert.equal((await photoUpload('<svg onload="alert(1)"/>', 'image/svg+xml', 'bad.svg')).status, 400);
  assert.equal((await photoUpload('<script>alert(1)</script>', 'image/png')).status, 400);
  assert.equal((await photoUpload(png, 'image/jpeg')).status, 400);
});
test('oversized images return 413 and unexpected multipart fields return 400', async () => {
  assert.equal((await photoUpload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await photoUpload(png, 'image/png', 'safe.png', animalId, true, 'other')).status, 400);
});
test('missing photo and nonexistent animal uploads return clear errors', async () => {
  const form = new FormData();
  const response = await fetch(`${base}/api/admin/animals/${animalId}/photo`, { method: 'POST', headers: { Authorization: ['Bearer', token].join(' ') }, body: form });
  assert.equal(response.status, 400);
  assert.equal((await photoUpload(png, 'image/png', 'safe.png', missingId)).status, 404);
});
test('upload serving blocks dotfiles, path traversal and arbitrary file types', async () => {
  for (const path of ['/uploads/.env', '/uploads/..%2Fpackage.json', '/uploads/index.html', '/uploads/']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404);
  }
});
test('malformed JSON and excessive request payload are handled without details leakage', async () => {
  const malformed = await fetch(`${base}/api/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"oops":' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, 'JSON inválido.');
  assert.equal((await request('/api/messages', { method: 'POST', body: { ...messageBody, message: 'x'.repeat(40000) } })).status, 413);
});
test('CORS permits only the configured frontend origin', async () => {
  const good = await request('/api/animals', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(good.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const bad = await request('/api/animals', { headers: { Origin: 'https://evil.test' } });
  assert.notEqual(bad.headers.get('access-control-allow-origin'), 'https://evil.test');
});
test('login and public submission rate limits produce 429', async () => {
  const app = await createApp({ db, config, limits: { login: 2, submissions: 2 } });
  const limited = app.listen(0, '127.0.0.1');
  await new Promise(resolve => limited.once('listening', resolve));
  const url = `http://127.0.0.1:${limited.address().port}`;
  try {
    for (const path of ['/api/admin/login', '/api/messages']) {
      const body = path.endsWith('login') ? { email: 'admin@example.test', password } : messageBody;
      for (let i = 0; i < 2; i++) await fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const response = await fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      assert.equal(response.status, 429);
      assert.ok(response.headers.get('ratelimit'));
    }
  } finally { await new Promise(resolve => limited.close(resolve)); }
});
test('startup rejects absent, short and example JWT secrets', () => {
  for (const jwtSecret of [undefined, 'short', 'replace-with-a-random-secret-at-least-32-characters']) {
    assert.throws(() => readConfig({ DATABASE_URL: databaseUrl, JWT_SECRET: jwtSecret }), /JWT_SECRET/);
  }
});
test('runtime defaults to port 3000 and validates explicit overrides', () => {
  const env = { DATABASE_URL: databaseUrl, JWT_SECRET: secret };
  assert.equal(readConfig(env).port, 3000);
  assert.equal(readConfig({ ...env, PORT: '3099' }).port, 3099);
  for (const port of ['0', '65536', 'invalid', '3000.5']) {
    assert.throws(() => readConfig({ ...env, PORT: port }), /Invalid PORT/);
  }
});
test('proxy configuration defaults to disabled and only accepts a single trusted hop', () => {
  const env = { DATABASE_URL: databaseUrl, JWT_SECRET: secret };
  assert.equal(readConfig(env).trustProxy, false);
  assert.equal(readConfig({ ...env, TRUST_PROXY: '0' }).trustProxy, false);
  assert.equal(readConfig({ ...env, TRUST_PROXY: '1' }).trustProxy, 1);
  for (const value of ['true', '2', 'loopback']) {
    assert.throws(() => readConfig({ ...env, TRUST_PROXY: value }), /TRUST_PROXY/);
  }
});
test('direct deployment ignores spoofed forwarded IPs when enforcing rate limits', async t => {
  const warning = t.mock.method(console, 'error', () => {});
  const app = await createApp({ db, config, limits: { general: 2 } });
  const limited = app.listen(0, '127.0.0.1');
  await new Promise(resolve => limited.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${limited.address().port}/api/animals`;
    for (let i = 1; i <= 3; i++) {
      const response = await fetch(url, { headers: { 'X-Forwarded-For': `198.51.100.${i}` } });
      assert.equal(response.status, i < 3 ? 200 : 429);
    }
    assert.equal(warning.mock.calls[0].arguments[0].code, 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR');
  } finally { await new Promise(resolve => limited.close(resolve)); }
});
test('single trusted nginx hop separates client quotas using its forwarded address', async () => {
  const app = await createApp({ db, config: { ...config, trustProxy: 1 }, limits: { general: 2 } });
  const limited = app.listen(0, '127.0.0.1');
  await new Promise(resolve => limited.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${limited.address().port}/api/animals`;
    for (let i = 1; i <= 3; i++) {
      const response = await fetch(url, { headers: { 'X-Forwarded-For': '198.51.100.10' } });
      assert.equal(response.status, i < 3 ? 200 : 429);
    }
    assert.equal((await fetch(url, { headers: { 'X-Forwarded-For': '198.51.100.11' } })).status, 200);
  } finally { await new Promise(resolve => limited.close(resolve)); }
});
test('unknown endpoints return structured 404 errors', async () => {
  const result = await request('/api/no-such-route');
  assert.equal(result.status, 404);
  assert.deepEqual(result.data, { error: 'Rota não encontrada.' });
});
test('bootstrap CLI creates hashed credentials and refuses overwriting an existing admin', async () => {
  const run = promisify(execFile);
  const env = { ...process.env, DATABASE_URL: databaseUrl, ADMIN_EMAIL: 'bootstrap@example.test', ADMIN_NAME: 'Bootstrap Test', ADMIN_PASSWORD: password };
  const result = await run(process.execPath, ['scripts/bootstrap-admin.js'], { env });
  assert.match(result.stdout, /Administrator created/);
  assert.ok(!result.stdout.includes(password));
  const row = await db('admins').where('email', env.ADMIN_EMAIL).first();
  assert.notEqual(row.password_hash, password);
  assert.equal(await bcrypt.compare(password, row.password_hash), true);
  await assert.rejects(run(process.execPath, ['scripts/bootstrap-admin.js'], { env }), error => {
    assert.match(error.stderr, /already exists/);
    return true;
  });
  assert.equal((await db('admins').where('email', env.ADMIN_EMAIL).first()).password_hash, row.password_hash);
});
test('bootstrap CLI fails safely without explicit credentials', async () => {
  const env = { ...process.env, DATABASE_URL: databaseUrl, ADMIN_NAME: '', ADMIN_EMAIL: '', ADMIN_PASSWORD: '' };
  await assert.rejects(promisify(execFile)(process.execPath, ['scripts/bootstrap-admin.js'], { env }), error => {
    assert.match(error.stderr, /Set DATABASE_URL/);
    return true;
  });
  assert.equal(Number((await db('admins').count('* as count'))[0].count), 1);
});
test('migrations rollback and reapply cleanly against PostgreSQL', async () => {
  await db.migrate.rollback({ directory: resolve('migrations') }, true);
  assert.equal(await db.schema.hasTable('animals'), false);
  await db.migrate.latest({ directory: resolve('migrations') });
  await seed(db);
  await seed(db);
  assert.equal(Number((await db('animals').count('* as count'))[0].count), 4);
});
