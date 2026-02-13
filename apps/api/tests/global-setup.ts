import { execSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

const URL_FILE = resolve(import.meta.dirname, '../.test-db-url')
let container: StartedPostgreSqlContainer

export async function setup() {
  container = await new PostgreSqlContainer('postgres:17').start()
  const url = container.getConnectionUri()
  writeFileSync(URL_FILE, url)

  execSync(`bunx --bun prisma db push --url "${url}"`, {
    cwd: resolve(import.meta.dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })
}

export async function teardown() {
  await container?.stop()
  try {
    rmSync(URL_FILE)
  } catch {}
}
