import { call } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { db } from '../src/db.js'
import { router } from '../src/router.js'
import { testContext } from './setup.js'

const ctx = testContext()

async function loginUser(name: string) {
  return call(router.auth.login, { name }, ctx)
}

describe('authMiddleware', () => {
  it('rejects request without authorization header', async () => {
    await expect(call(router.ring.feed, { limit: 10 }, testContext())).rejects.toThrow(
      'Missing or invalid authorization header',
    )
  })

  it('rejects request with malformed authorization header', async () => {
    const headers = new Headers()
    headers.set('authorization', 'Basic abc123')
    await expect(call(router.ring.feed, { limit: 10 }, { context: { headers } })).rejects.toThrow(
      'Missing or invalid authorization header',
    )
  })

  it('rejects request with invalid token', async () => {
    await expect(
      call(router.ring.feed, { limit: 10 }, testContext('invalid-token')),
    ).rejects.toThrow('Invalid session token')
  })

  it('accepts request with valid token', async () => {
    const { sessionToken } = await loginUser('Alice')

    const result = await call(router.ring.feed, { limit: 10 }, testContext(sessionToken))
    expect(Array.isArray(result)).toBe(true)
  })

  it('rejects expired session token', async () => {
    const { sessionToken, user } = await loginUser('Alice')

    // Manually set expiry to the past
    await db.user.update({
      where: { id: user.id },
      data: { sessionExpiresAt: new Date(Date.now() - 1000) },
    })

    await expect(call(router.ring.feed, { limit: 10 }, testContext(sessionToken))).rejects.toThrow(
      'Session expired',
    )
  })

  it('rejects session with null expiry date', async () => {
    const { sessionToken, user } = await loginUser('Alice')

    // Manually set expiry to null
    await db.user.update({
      where: { id: user.id },
      data: { sessionExpiresAt: null },
    })

    await expect(call(router.ring.feed, { limit: 10 }, testContext(sessionToken))).rejects.toThrow(
      'Session expired',
    )
  })

  it('refreshes token expiry when less than 7 days remaining', async () => {
    const { sessionToken, user } = await loginUser('Alice')

    // Set expiry to 3 days from now (less than 7-day threshold)
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    await db.user.update({
      where: { id: user.id },
      data: { sessionExpiresAt: threeDaysFromNow },
    })

    // Make an authenticated request -- should trigger refresh
    await call(router.ring.feed, { limit: 10 }, testContext(sessionToken))

    // Check that expiry was refreshed to ~30 days
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    const remainingMs = updated.sessionExpiresAt?.getTime() - Date.now()
    const twentyNineDaysMs = 29 * 24 * 60 * 60 * 1000
    expect(remainingMs).toBeGreaterThan(twentyNineDaysMs)
  })

  it('does not refresh token expiry when more than 7 days remaining', async () => {
    const { sessionToken, user } = await loginUser('Alice')

    // Set expiry to 15 days from now (more than 7-day threshold)
    const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    await db.user.update({
      where: { id: user.id },
      data: { sessionExpiresAt: fifteenDaysFromNow },
    })

    await call(router.ring.feed, { limit: 10 }, testContext(sessionToken))

    // Expiry should not have changed significantly
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    const diff = Math.abs(updated.sessionExpiresAt?.getTime() - fifteenDaysFromNow.getTime())
    // Should be very close to the original (within 1 second tolerance)
    expect(diff).toBeLessThan(1000)
  })
})
