import { call } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { db } from '../src/db.js'
import { router } from '../src/router.js'
import { testContext } from './setup.js'

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

describe('match detection in swipe.create', () => {
  it('creates a match when both partners LIKE the same ring', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('Matched Ring')

    // Alice likes the ring — no match yet
    const aliceResult = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'LIKE' },
      testContext(aliceToken),
    )
    expect(aliceResult.match).toBeNull()

    // Bob likes the same ring — match detected
    const bobResult = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'LIKE' },
      testContext(bobToken),
    )
    expect(bobResult.match).not.toBeNull()
    expect(bobResult.match?.ringId).toBe(ring.id)
  })

  it('creates a match when both partners SUPER the same ring', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('Super Ring')

    await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'SUPER' },
      testContext(aliceToken),
    )

    const bobResult = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'SUPER' },
      testContext(bobToken),
    )
    expect(bobResult.match).not.toBeNull()
    expect(bobResult.match?.ringId).toBe(ring.id)
  })

  it('creates a match when one LIKEs and one SUPERs', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('Mixed Ring')

    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))

    const bobResult = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'SUPER' },
      testContext(bobToken),
    )
    expect(bobResult.match).not.toBeNull()
  })

  it('does NOT create a match when one partner NOPEs', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('Nope Ring')

    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))

    const bobResult = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'NOPE' },
      testContext(bobToken),
    )
    expect(bobResult.match).toBeNull()
  })

  it('does NOT create a match when user is not in a couple', async () => {
    const { sessionToken } = await loginUser('Solo')
    const ring = await seedRing('Solo Ring')

    const result = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'LIKE' },
      testContext(sessionToken),
    )
    expect(result.match).toBeNull()
  })

  it('does NOT create a match when couple is PENDING (no partner yet)', async () => {
    const { sessionToken: aliceToken } = await loginUser('Alice')
    await call(router.couple.create, undefined, testContext(aliceToken))
    const ring = await seedRing('Pending Ring')

    const result = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'LIKE' },
      testContext(aliceToken),
    )
    expect(result.match).toBeNull()
  })

  it('does not create duplicate matches (upsert)', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('Dup Ring')

    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))
    const first = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'LIKE' },
      testContext(bobToken),
    )

    // Alice re-swipes LIKE on the same ring
    const second = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'LIKE' },
      testContext(aliceToken),
    )

    // Both return a match but it's the same match ID
    expect(first.match).not.toBeNull()
    expect(second.match).not.toBeNull()
    expect(second.match?.id).toBe(first.match?.id)

    // Only 1 match in DB
    const matchCount = await db.match.count()
    expect(matchCount).toBe(1)
  })

  it('the first LIKE partner also sees match on re-swipe', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('ReSwipe Ring')

    // Alice likes first
    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))

    // Bob likes — triggers match
    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(bobToken))

    // Alice re-swipes — should still return match
    const aliceRe = await call(
      router.swipe.create,
      { ringId: ring.id, direction: 'LIKE' },
      testContext(aliceToken),
    )
    expect(aliceRe.match).not.toBeNull()
  })
})

describe('match.list', () => {
  it('returns matches for the couple with ring + images', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('Listed Ring')

    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))
    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(bobToken))

    const matches = await call(router.match.list, { limit: 20, offset: 0 }, testContext(aliceToken))

    expect(matches).toHaveLength(1)
    expect(matches[0]?.ring.name).toBe('Listed Ring')
    expect(matches[0]?.ring.images).toHaveLength(1)
  })

  it('both partners see the same matches', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring = await seedRing('Shared Ring')

    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(aliceToken))
    await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(bobToken))

    const aliceMatches = await call(
      router.match.list,
      { limit: 20, offset: 0 },
      testContext(aliceToken),
    )
    const bobMatches = await call(
      router.match.list,
      { limit: 20, offset: 0 },
      testContext(bobToken),
    )

    expect(aliceMatches).toHaveLength(1)
    expect(bobMatches).toHaveLength(1)
    expect(aliceMatches[0]?.id).toBe(bobMatches[0]?.id)
  })

  it('returns empty array when no matches', async () => {
    const { aliceToken } = await createActiveCouple('Alice', 'Bob')

    const matches = await call(router.match.list, { limit: 20, offset: 0 }, testContext(aliceToken))

    expect(matches).toEqual([])
  })

  it('returns empty array when user has no couple', async () => {
    const { sessionToken } = await loginUser('Solo')

    const matches = await call(
      router.match.list,
      { limit: 20, offset: 0 },
      testContext(sessionToken),
    )

    expect(matches).toEqual([])
  })

  it('orders by createdAt descending', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring1 = await seedRing('First Ring')
    const ring2 = await seedRing('Second Ring')

    // First match
    await call(
      router.swipe.create,
      { ringId: ring1.id, direction: 'LIKE' },
      testContext(aliceToken),
    )
    await call(router.swipe.create, { ringId: ring1.id, direction: 'LIKE' }, testContext(bobToken))

    // Second match
    await call(
      router.swipe.create,
      { ringId: ring2.id, direction: 'LIKE' },
      testContext(aliceToken),
    )
    await call(router.swipe.create, { ringId: ring2.id, direction: 'LIKE' }, testContext(bobToken))

    const matches = await call(router.match.list, { limit: 20, offset: 0 }, testContext(aliceToken))

    expect(matches).toHaveLength(2)
    expect(matches[0]?.ring.name).toBe('Second Ring')
    expect(matches[1]?.ring.name).toBe('First Ring')
  })

  it('respects pagination', async () => {
    const { aliceToken, bobToken } = await createActiveCouple('Alice', 'Bob')
    const ring1 = await seedRing('Ring A')
    const ring2 = await seedRing('Ring B')
    const ring3 = await seedRing('Ring C')

    for (const ring of [ring1, ring2, ring3]) {
      await call(
        router.swipe.create,
        { ringId: ring.id, direction: 'LIKE' },
        testContext(aliceToken),
      )
      await call(router.swipe.create, { ringId: ring.id, direction: 'LIKE' }, testContext(bobToken))
    }

    const page1 = await call(router.match.list, { limit: 2, offset: 0 }, testContext(aliceToken))
    const page2 = await call(router.match.list, { limit: 2, offset: 2 }, testContext(aliceToken))

    expect(page1).toHaveLength(2)
    expect(page2).toHaveLength(1)
    expect(page1[0]?.id).not.toBe(page2[0]?.id)
  })

  it('requires authentication', async () => {
    await expect(call(router.match.list, { limit: 20, offset: 0 }, testContext())).rejects.toThrow()
  })
})
