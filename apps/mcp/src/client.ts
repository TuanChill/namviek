/**
 * Thin HTTP client that proxies requests to apps/api.
 * Automatically injects the x-api-key header on every call.
 */

const API_URL = process.env.API_URL || 'http://localhost:4001'
const API_KEY = process.env.API_KEY || 'namviek-mcp-dev-key'

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...extra,
  }
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: headers(),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GET ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export async function apiPost<T = unknown>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: headers(),
    body: data !== undefined ? JSON.stringify(data) : undefined,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`POST ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export async function apiPatch<T = unknown>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: data !== undefined ? JSON.stringify(data) : undefined,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PATCH ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export async function apiPut<T = unknown>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: headers(),
    body: data !== undefined ? JSON.stringify(data) : undefined,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PUT ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

export async function apiDelete<T = unknown>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: headers(),
    body: data !== undefined ? JSON.stringify(data) : undefined,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DELETE ${path} failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}
