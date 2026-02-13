import { type ChildProcess, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const PORT = 3_999
const BASE = `http://localhost:${PORT}`
const URL_FILE = resolve(import.meta.dirname, '../.test-db-url')

let server: ChildProcess

beforeAll(async () => {
  const databaseUrl = readFileSync(URL_FILE, 'utf-8')

  server = spawn('bun', ['src/index.ts'], {
    cwd: resolve(import.meta.dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(PORT) },
    stdio: 'pipe',
  })

  // Wait for server to be ready
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      const res = await fetch(`${BASE}/health`)
      if (res.ok) return
    } catch {}
  }
  server?.kill()
  throw new Error('Server did not start in time')
})

afterAll(() => {
  server?.kill()
})

describe('HTTP endpoints', () => {
  it('GET /health returns 200', async () => {
    const res = await fetch(`${BASE}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  it('GET /unknown returns 404', async () => {
    const res = await fetch(`${BASE}/unknown`)
    expect(res.status).toBe(404)
  })

  it('POST /rpc/user/create roundtrip', async () => {
    const res = await fetch(`${BASE}/rpc/user/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { name: 'HttpUser', email: 'http@ring.local' } }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.json).toMatchObject({ name: 'HttpUser', email: 'http@ring.local' })
    expect(body.json.id).toBeDefined()
  })

  it('CORS headers present on preflight', async () => {
    const res = await fetch(`${BASE}/rpc/user/list`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    })

    expect(res.headers.get('access-control-allow-origin')).toBeDefined()
    expect(res.headers.get('access-control-allow-methods')).toBeDefined()
  })
})
