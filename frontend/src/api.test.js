import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { getToken, listFrom, request, safeImage, saveToken } from './api.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch; delete globalThis.sessionStorage })

test('requests use relative API URLs and authorization headers, never token URLs', async () => {
  let captured
  globalThis.fetch = async (url, options) => {
    captured = { url, options }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
  assert.deepEqual(await request('/admin/animals', { token: 'test-session', method: 'POST', body: { name: 'Luna' } }), { ok: true })
  assert.equal(captured.url, '/api/admin/animals')
  assert.equal(captured.options.headers.Authorization, ['Bearer', 'test-session'].join(' '))
  assert.equal(captured.options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(captured.options.body), { name: 'Luna' })
})

test('uploads preserve FormData without overriding multipart boundary', async () => {
  const body = new FormData()
  body.append('photo', new Blob(['image'], { type: 'image/png' }), 'animal.png')
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/admin/animals/1/photo')
    assert.equal(options.body, body)
    assert.equal(options.headers['Content-Type'], undefined)
    return new Response(JSON.stringify({ animal: { photoUrl: '/uploads/animal.png' } }), { status: 200 })
  }
  assert.equal((await request('/admin/animals/1/photo', { method: 'POST', body })).animal.photoUrl, '/uploads/animal.png')
})

test('failed HTTP responses retain status for session expiration handling', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Sessão expirada.' }), { status: 401 })
  await assert.rejects(request('/admin/animals'), error => error.status === 401 && error.message === 'Sessão expirada.')
})

test('unavailable server and malformed successful responses produce useful errors', async () => {
  globalThis.fetch = async () => { throw new TypeError('Network error') }
  await assert.rejects(request('/animals'), /Não foi possível conectar/)
  globalThis.fetch = async () => new Response('<html>fallback</html>', { status: 200 })
  await assert.rejects(request('/animals'), /serviço está indisponível/)
})

test('204 responses are accepted and aborted requests stay aborted', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await request('/admin/animals/1', { method: 'DELETE' }), null)
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError') }
  await assert.rejects(request('/animals'), { name: 'AbortError' })
})

test('unsafe image URLs are replaced with a local illustration', () => {
  for (const input of ['', null, 123, {}, 'javascript:alert(1)', 'data:text/html,test', '//external.test/a', '/private/file']) {
    assert.equal(safeImage(input), '/animal-placeholder.svg')
  }
  assert.equal(safeImage('/uploads/friend.webp'), '/uploads/friend.webp')
  assert.equal(safeImage('https://example.test/friend.jpg'), 'https://example.test/friend.jpg')
})

test('collection helpers accept standard API response envelopes', () => {
  const animals = [{ id: 1, name: 'Luna' }]
  assert.deepEqual(listFrom(animals, 'animals'), animals)
  assert.deepEqual(listFrom({ animals }, 'animals'), animals)
  assert.deepEqual(listFrom({ data: animals }, 'animals'), animals)
  assert.deepEqual(listFrom(null, 'animals'), [])
  assert.deepEqual(listFrom({ data: {} }, 'animals'), [])
})

test('sessions use sessionStorage and tolerate unavailable storage', () => {
  const values = new Map()
  globalThis.sessionStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  saveToken('test-session')
  assert.equal(getToken(), 'test-session')
  saveToken('')
  assert.equal(getToken(), '')
  globalThis.sessionStorage = { getItem() { throw new Error('Storage blocked') }, setItem() { throw new Error('Storage blocked') } }
  assert.doesNotThrow(() => saveToken('test-session'))
  assert.equal(getToken(), '')
})
