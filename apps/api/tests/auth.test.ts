import { call } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { router } from '../src/router.js'
import { testContext } from './setup.js'

const ctx = testContext()

describe('auth.login', () => {
  it('creates a new user on first login', async () => {
    const result = await call(router.auth.login, { name: 'Alice' }, ctx)

    expect(result.user).toMatchObject({
      name: 'Alice',
      email: 'alice@ring.local',
    })
    expect(result.user.id).toBeDefined()
    expect(result.user.createdAt).toBeInstanceOf(Date)
    expect(result.sessionToken).toBeDefined()
    expect(typeof result.sessionToken).toBe('string')
  })

  it('returns a session token and expiry on login', async () => {
    const result = await call(router.auth.login, { name: 'Alice' }, ctx)

    expect(result.sessionToken).toBeDefined()
    expect(result.user.sessionToken).toBe(result.sessionToken)
    expect(result.user.sessionExpiresAt).toBeInstanceOf(Date)

    // Expiry should be ~30 days in the future
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const expiryMs = result.user.sessionExpiresAt?.getTime() - Date.now()
    expect(expiryMs).toBeGreaterThan(thirtyDaysMs - 5000)
    expect(expiryMs).toBeLessThanOrEqual(thirtyDaysMs)
  })

  it('returns existing user on duplicate name with new token', async () => {
    const first = await call(router.auth.login, { name: 'Bob' }, ctx)
    const second = await call(router.auth.login, { name: 'Bob' }, ctx)

    expect(second.user.id).toBe(first.user.id)
    expect(second.user.email).toBe(first.user.email)
    // New login generates a new token
    expect(second.sessionToken).not.toBe(first.sessionToken)
  })

  it('derives email correctly from name with spaces', async () => {
    const result = await call(router.auth.login, { name: 'John Doe' }, ctx)
    expect(result.user.email).toBe('john_doe@ring.local')
  })

  it('derives email from name with multiple spaces', async () => {
    const result = await call(router.auth.login, { name: 'Jane  Mary  Doe' }, ctx)
    expect(result.user.email).toBe('jane_mary_doe@ring.local')
  })

  it('handles single character name', async () => {
    const result = await call(router.auth.login, { name: 'A' }, ctx)
    expect(result.user.email).toBe('a@ring.local')
  })

  it('handles max length name (100 chars)', async () => {
    const longName = 'a'.repeat(100)
    const result = await call(router.auth.login, { name: longName }, ctx)
    expect(result.user.name).toBe(longName)
  })
})
