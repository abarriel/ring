import { call } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { router } from '../src/router.js'
import { testContext } from './setup.js'

const ctx = testContext()

async function loginUser(name: string) {
  return call(router.auth.login, { name }, ctx)
}

describe('couple.create', () => {
  it('creates a couple with a 6-char code and PENDING status', async () => {
    const { sessionToken } = await loginUser('Alice')
    const authedCtx = testContext(sessionToken)

    const couple = await call(router.couple.create, undefined, authedCtx)

    expect(couple.code).toHaveLength(6)
    expect(couple.status).toBe('PENDING')
    expect(couple.inviter.name).toBe('Alice')
    expect(couple.partner).toBeNull()
    expect(couple.dissolvedAt).toBeNull()
  })

  it('rejects if user is already in an active couple', async () => {
    const { sessionToken } = await loginUser('Alice')
    const authedCtx = testContext(sessionToken)

    await call(router.couple.create, undefined, authedCtx)

    await expect(call(router.couple.create, undefined, authedCtx)).rejects.toThrow(
      'Already in a couple',
    )
  })

  it('rejects if user is already in a pending couple', async () => {
    const { sessionToken } = await loginUser('Alice')
    const authedCtx = testContext(sessionToken)

    await call(router.couple.create, undefined, authedCtx)

    await expect(call(router.couple.create, undefined, authedCtx)).rejects.toThrow(
      'Already in a couple',
    )
  })

  it('requires authentication', async () => {
    await expect(call(router.couple.create, undefined, testContext())).rejects.toThrow()
  })
})

describe('couple.join', () => {
  it('pairs two users and sets status to ACTIVE', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')
    const { sessionToken: bobToken } = await loginUser('Bob')

    const couple = await call(router.couple.create, undefined, testContext(aliceToken))

    const joined = await call(router.couple.join, { code: couple.code }, testContext(bobToken))

    expect(joined.status).toBe('ACTIVE')
    expect(joined.inviter.name).toBe('Alice')
    expect(joined.partner).not.toBeNull()
    expect(joined.partner?.name).toBe('Bob')
  })

  it('throws CODE_NOT_FOUND for invalid code', async () => {
    const { sessionToken } = await loginUser('Alice')

    await expect(
      call(router.couple.join, { code: 'XXXXXX' }, testContext(sessionToken)),
    ).rejects.toThrow('Code not found')
  })

  it('throws ALREADY_PAIRED when user is already in a couple', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')
    const { sessionToken: bobToken } = await loginUser('Bob')
    const { sessionToken: charlieToken } = await loginUser('Charlie')

    // Alice creates a couple, Bob joins
    const couple1 = await call(router.couple.create, undefined, testContext(aliceToken))
    await call(router.couple.join, { code: couple1.code }, testContext(bobToken))

    // Charlie creates another couple
    const couple2 = await call(router.couple.create, undefined, testContext(charlieToken))

    // Bob tries to join Charlie's couple while already paired
    await expect(
      call(router.couple.join, { code: couple2.code }, testContext(bobToken)),
    ).rejects.toThrow('Already paired')
  })

  it('throws COUPLE_ALREADY_FULL when couple has a partner', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')
    const { sessionToken: bobToken } = await loginUser('Bob')
    const { sessionToken: charlieToken } = await loginUser('Charlie')

    const couple = await call(router.couple.create, undefined, testContext(aliceToken))
    await call(router.couple.join, { code: couple.code }, testContext(bobToken))

    await expect(
      call(router.couple.join, { code: couple.code }, testContext(charlieToken)),
    ).rejects.toThrow('Couple already full')
  })

  it('prevents joining your own couple', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')

    const couple = await call(router.couple.create, undefined, testContext(aliceToken))

    await expect(
      call(router.couple.join, { code: couple.code }, testContext(aliceToken)),
    ).rejects.toThrow('Cannot join your own couple')
  })

  it('requires authentication', async () => {
    await expect(call(router.couple.join, { code: 'ABC123' }, testContext())).rejects.toThrow()
  })
})

describe('couple.get', () => {
  it('returns the active couple with partner info', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')
    const { sessionToken: bobToken } = await loginUser('Bob')

    const created = await call(router.couple.create, undefined, testContext(aliceToken))
    await call(router.couple.join, { code: created.code }, testContext(bobToken))

    const couple = await call(router.couple.get, undefined, testContext(aliceToken))

    expect(couple).not.toBeNull()
    expect(couple?.status).toBe('ACTIVE')
    expect(couple?.inviter.name).toBe('Alice')
    expect(couple?.partner?.name).toBe('Bob')
  })

  it('returns pending couple for inviter', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')

    await call(router.couple.create, undefined, testContext(aliceToken))

    const couple = await call(router.couple.get, undefined, testContext(aliceToken))

    expect(couple).not.toBeNull()
    expect(couple?.status).toBe('PENDING')
    expect(couple?.partner).toBeNull()
  })

  it('returns null when user has no couple', async () => {
    const { sessionToken } = await loginUser('Alice')

    const couple = await call(router.couple.get, undefined, testContext(sessionToken))

    expect(couple).toBeNull()
  })

  it('returns couple for partner too', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')
    const { sessionToken: bobToken } = await loginUser('Bob')

    const created = await call(router.couple.create, undefined, testContext(aliceToken))
    await call(router.couple.join, { code: created.code }, testContext(bobToken))

    const couple = await call(router.couple.get, undefined, testContext(bobToken))

    expect(couple).not.toBeNull()
    expect(couple?.status).toBe('ACTIVE')
    expect(couple?.inviter.name).toBe('Alice')
    expect(couple?.partner?.name).toBe('Bob')
  })

  it('requires authentication', async () => {
    await expect(call(router.couple.get, undefined, testContext())).rejects.toThrow()
  })
})

describe('couple.dissolve', () => {
  it('sets status to DISSOLVED and dissolvedAt', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')
    const { sessionToken: bobToken } = await loginUser('Bob')

    const created = await call(router.couple.create, undefined, testContext(aliceToken))
    await call(router.couple.join, { code: created.code }, testContext(bobToken))

    const dissolved = await call(router.couple.dissolve, undefined, testContext(aliceToken))

    expect(dissolved.status).toBe('DISSOLVED')
    expect(dissolved.dissolvedAt).not.toBeNull()
  })

  it('allows partner to dissolve too', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')
    const { sessionToken: bobToken } = await loginUser('Bob')

    const created = await call(router.couple.create, undefined, testContext(aliceToken))
    await call(router.couple.join, { code: created.code }, testContext(bobToken))

    const dissolved = await call(router.couple.dissolve, undefined, testContext(bobToken))

    expect(dissolved.status).toBe('DISSOLVED')
  })

  it('allows dissolving a pending couple (cancel invite)', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')

    await call(router.couple.create, undefined, testContext(aliceToken))

    const dissolved = await call(router.couple.dissolve, undefined, testContext(aliceToken))

    expect(dissolved.status).toBe('DISSOLVED')
  })

  it('throws when user has no couple', async () => {
    const { sessionToken } = await loginUser('Alice')

    await expect(
      call(router.couple.dissolve, undefined, testContext(sessionToken)),
    ).rejects.toThrow('No active couple found')
  })

  it('user can create a new couple after dissolving', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')

    await call(router.couple.create, undefined, testContext(aliceToken))
    await call(router.couple.dissolve, undefined, testContext(aliceToken))

    const newCouple = await call(router.couple.create, undefined, testContext(aliceToken))

    expect(newCouple.status).toBe('PENDING')
    expect(newCouple.code).toHaveLength(6)
  })

  it('requires authentication', async () => {
    await expect(call(router.couple.dissolve, undefined, testContext())).rejects.toThrow()
  })
})
