import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach } from 'vitest'

const URL_FILE = resolve(import.meta.dirname, '../.test-db-url')
process.env.DATABASE_URL = readFileSync(URL_FILE, 'utf-8')

// Dynamic import after env is set so PrismaClient connects to the test DB
const { db } = await import('../src/db.js')

// Helper to create a Headers object for test calls
export function testContext(token?: string) {
  const headers = new Headers()
  if (token) {
    headers.set('authorization', `Bearer ${token}`)
  }
  return { context: { headers } }
}

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE TABLE users CASCADE')
  await db.$executeRawUnsafe('TRUNCATE TABLE rings CASCADE')
  await db.$executeRawUnsafe('TRUNCATE TABLE swipes CASCADE')
})
