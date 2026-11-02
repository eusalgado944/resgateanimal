const TOKEN_KEY = 'focinho-amigo-session'

export function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export function saveToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch { /* The current tab can still use an in-memory session. */ }
}

export async function request(path, { method = 'GET', body, token, signal } = {}) {
  const headers = {}
  if (token) headers.Authorization = ['Bearer', token].join(' ')
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  let response
  try {
    response = await fetch(`/api${path}`, {
      method, headers, signal,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Não foi possível conectar. Confira sua conexão e tente novamente.')
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(typeof data?.error === 'string' ? data.error : data?.error?.message || data?.message || 'Não foi possível concluir a solicitação. Tente novamente.')
    error.status = response.status
    throw error
  }
  if (response.status !== 204 && data === null) throw new Error('O serviço está indisponível. Tente novamente em alguns instantes.')
  return data
}

export function listFrom(data, key) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.[key])) return data[key]
  return Array.isArray(data?.data) ? data.data : []
}

export function safeImage(value) {
  if (typeof value !== 'string' || !value) return '/animal-placeholder.svg'
  if (value.startsWith('/uploads/')) return value
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href
  } catch { /* Unknown URLs use the local placeholder. */ }
  return '/animal-placeholder.svg'
}
