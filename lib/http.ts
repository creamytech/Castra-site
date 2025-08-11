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

export async function apiGET<T>(url: string): Promise<T> {
  const res = await apiFetch(url)
  if (!(res as any).ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}

export async function apiPOST<T>(url: string, body: unknown): Promise<T> {
  const res = await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!(res as any).ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}


