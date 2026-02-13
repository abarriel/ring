import { call } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { router } from '../src/router.js'

describe('auth.login', () => {
  it('creates a new user on first login', async () => {
    const user = await call(router.auth.login, { name: 'Alice' })

    expect(user).toMatchObject({
      name: 'Alice',
      email: 'alice@ring.local',
    })
    expect(user.id).toBeDefined()
    expect(user.createdAt).toBeInstanceOf(Date)
  })

  it('returns existing user on duplicate name', async () => {
    const first = await call(router.auth.login, { name: 'Bob' })
    const second = await call(router.auth.login, { name: 'Bob' })

    expect(second.id).toBe(first.id)
    expect(second.email).toBe(first.email)
  })

  it('derives email correctly from name with spaces', async () => {
    const user = await call(router.auth.login, { name: 'John Doe' })
    expect(user.email).toBe('john_doe@ring.local')
  })

  it('derives email from name with multiple spaces', async () => {
    const user = await call(router.auth.login, { name: 'Jane  Mary  Doe' })
    // \s+ replaces one or more spaces with a single underscore
    expect(user.email).toBe('jane_mary_doe@ring.local')
  })

  it('handles single character name', async () => {
    const user = await call(router.auth.login, { name: 'A' })
    expect(user.email).toBe('a@ring.local')
  })

  it('handles max length name (100 chars)', async () => {
    const longName = 'a'.repeat(100)
    const user = await call(router.auth.login, { name: longName })
    expect(user.name).toBe(longName)
  })
})
