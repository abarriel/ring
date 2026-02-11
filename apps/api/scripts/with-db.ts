import { execSync } from 'node:child_process'
import { PostgreSqlContainer } from '@testcontainers/postgresql'

const HEALTH_URL = 'http://localhost:3000/health'
const MAX_RETRIES = 10
const RETRY_DELAY_MS = 500

console.log('Starting PostgreSQL container...')
const container = await new PostgreSqlContainer('postgres:17').start()
const databaseUrl = container.getConnectionUri()
console.log('PostgreSQL container started')

const env = { ...process.env, DATABASE_URL: databaseUrl, PORT: '3000' }

try {
  console.log('Running prisma db push...')
  execSync('pnpm prisma db push --skip-generate', {
    cwd: `${import.meta.dir}/..`,
    env,
    stdio: 'inherit',
  })
  console.log('Schema pushed successfully')

  console.log('Starting API server...')
  const server = Bun.spawn(['bun', 'src/index.ts'], {
    cwd: `${import.meta.dir}/..`,
    env,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  let healthy = false
  for (let i = 0; i < MAX_RETRIES; i++) {
    await Bun.sleep(RETRY_DELAY_MS)
    try {
      const res = await fetch(HEALTH_URL)
      const body = await res.json()
      if (body.status === 'ok') {
        healthy = true
        break
      }
    } catch {
      // server not ready yet
    }
  }

  server.kill()
  await server.exited

  if (!healthy) {
    throw new Error(`Health check failed after ${MAX_RETRIES} retries`)
  }

  console.log('Health check passed')
} finally {
  console.log('Stopping PostgreSQL container...')
  await container.stop()
  console.log('Done')
}
