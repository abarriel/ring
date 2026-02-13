import { execSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

const URL_FILE = resolve(import.meta.dirname, '../.test-db-url')
let container: StartedPostgreSqlContainer
let cleanupHandlers: Array<() => void> = []

function cleanupUrlFile() {
  try {
    if (existsSync(URL_FILE)) {
      rmSync(URL_FILE)
    }
  } catch (error) {
    console.error('Failed to clean up .test-db-url file:', error)
  }
}

function registerCleanupHandlers() {
  const sigintHandler = () => {
    console.log('\nReceived SIGINT, cleaning up...')
    cleanupUrlFile()
    process.exit(130)
  }

  const sigtermHandler = () => {
    console.log('\nReceived SIGTERM, cleaning up...')
    cleanupUrlFile()
    process.exit(143)
  }

  process.once('SIGINT', sigintHandler)
  process.once('SIGTERM', sigtermHandler)

  cleanupHandlers = [
    () => process.removeListener('SIGINT', sigintHandler),
    () => process.removeListener('SIGTERM', sigtermHandler),
  ]
}

function removeCleanupHandlers() {
  for (const removeHandler of cleanupHandlers) {
    removeHandler()
  }
  cleanupHandlers = []
}

export async function setup() {
  container = await new PostgreSqlContainer('postgres:17').start()
  const url = container.getConnectionUri()
  writeFileSync(URL_FILE, url)

  registerCleanupHandlers()

  execSync(`bunx --bun prisma db push --url "${url}"`, {
    cwd: resolve(import.meta.dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })
}

export async function teardown() {
  removeCleanupHandlers()

  try {
    await container?.stop()
  } catch (error) {
    console.error('Failed to stop container:', error)
  } finally {
    cleanupUrlFile()
  }
}
