export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export async function apiFetch(input: string | URL | Request, init: RequestInit = {}) {
  const headers = new Headers(init.headers as any)
  const csrf = getCsrfTokenFromCookie()
  if (csrf) headers.set('x-csrf', csrf)
  return fetch(input, { ...init, headers, cache: 'no-store' })
}


