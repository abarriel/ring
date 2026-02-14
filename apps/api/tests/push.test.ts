import { call } from '@orpc/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../src/db.js'
import { router } from '../src/router.js'
import { testContext } from './setup.js'

// Mock the push module to intercept notification calls without hitting Expo's servers
vi.mock('../src/push.js', () => ({
  sendPushNotifications: vi.fn(),
  notifyPartnerJoined: vi.fn(),
  notifyNewMatch: vi.fn(),
}))

// Import the mocked functions for assertions
const { notifyPartnerJoined, notifyNewMatch } = await import('../src/push.js')

const ctx = testContext()

async function loginUser(name: string) {
  return call(router.auth.login, { name }, ctx)
}

async function seedRing(name = 'Test Ring') {
  return db.ring.create({
    data: {
      name,
      metalType: 'YELLOW_GOLD',
      stoneType: 'DIAMOND',
      caratWeight: 1.5,
      style: 'SOLITAIRE',
      rating: 4.5,
      reviewCount: 10,
      images: {
        create: [{ url: 'https://example.com/ring.jpg', position: 0 }],
      },
    },
    include: { images: true },
  })
}

async function createActiveCouple(aliceName: string, bobName: string) {
  const { sessionToken: aliceToken } = await loginUser(aliceName)
  const { sessionToken: bobToken } = await loginUser(bobName)
  const couple = await call(router.couple.create, undefined, testContext(aliceToken))
  await call(router.couple.join, { code: couple.code }, testContext(bobToken))
  return { aliceToken, bobToken, couple }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('user.registerPushToken', () => {
  it('saves a valid Expo push token to the user', async () => {
    const { sessionToken } = await loginUser('Alice')

    const result = await call(
      router.user.registerPushToken,
      { token: 'ExponentPushToken[abc123]' },
      testContext(sessionToken),
    )

    expect(result.success).toBe(true)
    expect(result.pushToken).toBe('ExponentPushToken[abc123]')

    // Verify it's in the DB
    const user = await db.user.findFirst({ where: { name: 'Alice' } })
    expect(user?.pushToken).toBe('ExponentPushToken[abc123]')
  })

  it('rejects invalid push token format', async () => {
    const { sessionToken } = await loginUser('Alice')

    await expect(
      call(router.user.registerPushToken, { token: 'invalid-token' }, testContext(sessionToken)),
    ).rejects.toThrow()
  })

  it('overwrites a previous push token', async () => {
    const { sessionToken } = await loginUser('Alice')

    await call(
      router.user.registerPushToken,
      { token: 'ExponentPushToken[old]' },
      testContext(sessionToken),
    )

    const result = await call(
      router.user.registerPushToken,
      { token: 'ExponentPushToken[new]' },
      testContext(sessionToken),
    )

    expect(result.pushToken).toBe('ExponentPushToken[new]')
  })

  it('requires authentication', async () => {
    await expect(
      call(router.user.registerPushToken, { token: 'ExponentPushToken[abc]' }, testContext()),
    ).rejects.toThrow()
  })
})

describe('push notification on couple.join', () => {
  it('notifies the inviter when partner joins', async () => {
    vi.useFakeTimers()
    const { sessionToken: aliceToken } = await loginUser('Alice')

    // Alice registers a push token
    await call(
      router.user.registerPushToken,
      { token: 'ExponentPushToken[alice]' },
      testContext(aliceToken),
    )

    // Alice creates a couple
    const couple = await call(router.couple.create, undefined, testContext(aliceToken))

    // Bob joins
    const { sessionToken: bobToken } = await loginUser('Bob')
    await call(router.couple.join, { code: couple.code }, testContext(bobToken))

    // The notification is scheduled via setTimeout, flush it
    vi.runAllTimers()

    expect(notifyPartnerJoined).toHaveBeenCalledWith('ExponentPushToken[alice]', 'Bob')
  })

  it('does not notify when inviter has no push token', async () => {
    vi.useFakeTimers()
    const { sessionToken: aliceToken } = await loginUser('Alice')

    // Alice creates couple WITHOUT registering a push token
    const couple = await call(router.couple.create, undefined, testContext(aliceToken))

    const { sessionToken: bobToken } = await loginUser('Bob')
    await call(router.couple.join, { code: couple.code }, testContext(bobToken))

    vi.runAllTimers()

    // notifyPartnerJoined should not be called because inviter has no push token
    expect(notifyPartnerJoined).not.toHaveBeenCalled()
  })
})

describe('push notification on match creation', () => {
  it('notifies both partners when a match is created', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')

    // Both register push tokens
    await call(
      router.user.registerPushToken,
      { token: 'ExponentPushToken[alice]' },
      testContext(aliceToken),
    )
    await call(
      router.user.registerPushToken,
      { token: 'ExponentPushToken[bob]' },
      testContext(bobToken),
    )

    const ring = await seedRing('Dream Ring')

    // Alice likes
    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))
    expect(notifyNewMatch).not.toHaveBeenCalled()

    // Bob likes -> match
    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(bobToken))

    expect(notifyNewMatch).toHaveBeenCalledWith(
      ['ExponentPushToken[bob]', 'ExponentPushToken[alice]'],
      'Dream Ring',
    )
  })

  it('sends notification with null tokens when partners have no push tokens', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('No Token Ring')

    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))
    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(bobToken))

    expect(notifyNewMatch).toHaveBeenCalledWith([null, null], 'No Token Ring')
  })

  it('does not notify on NOPE swipe (no match)', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('Nope Ring')

    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))
    await call(router.swipe.create, { ringId: ring.id, direction: 'NOPE' }, testContext(bobToken))

    expect(notifyNewMatch).not.toHaveBeenCalled()
  })
})
