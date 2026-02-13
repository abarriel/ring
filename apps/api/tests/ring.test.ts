import { call } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { db } from '../src/db.js'
import { router } from '../src/router.js'
import { testContext } from './setup.js'

const ctx = testContext()

async function seedRings(count = 3) {
  const rings: Awaited<ReturnType<typeof db.ring.create>>[] = []
  for (let i = 0; i < count; i++) {
    const ring = await db.ring.create({
      data: {
        name: `Ring ${i + 1}`,
        metalType: 'YELLOW_GOLD',
        stoneType: 'DIAMOND',
        caratWeight: 1.0 + i * 0.5,
        style: 'SOLITAIRE',
        rating: 4.5,
        reviewCount: 10 + i,
        images: {
          create: [
            { url: `https://example.com/ring-${i + 1}-a.jpg`, position: 0 },
            { url: `https://example.com/ring-${i + 1}-b.jpg`, position: 1 },
          ],
        },
      },
      include: { images: true },
    })
    rings.push(ring)
  }
  return rings
}

async function loginUser(name: string) {
  return call(router.auth.login, { name }, ctx)
}

describe('ring.list', () => {
  it('returns rings with images ordered by createdAt asc', async () => {
    const seeded = await seedRings(3)

    const rings = await call(router.ring.list, { limit: 10, offset: 0 }, ctx)

    expect(rings).toHaveLength(3)
    expect(rings[0]?.name).toBe(seeded[0]?.name)
    expect(rings[0]?.images).toHaveLength(2)
    expect(rings[0]?.images[0]?.position).toBe(0)
  })

  it('respects limit and offset', async () => {
    await seedRings(5)

    const page1 = await call(router.ring.list, { limit: 2, offset: 0 }, ctx)
    const page2 = await call(router.ring.list, { limit: 2, offset: 2 }, ctx)

    expect(page1).toHaveLength(2)
    expect(page2).toHaveLength(2)
    expect(page1[0]?.id).not.toBe(page2[0]?.id)
  })

  it('returns empty list when no rings', async () => {
    const rings = await call(router.ring.list, { limit: 10, offset: 0 }, ctx)
    expect(rings).toEqual([])
  })
})

describe('ring.get', () => {
  it('returns a ring with images', async () => {
    const rings = await seedRings(1)
    const ring = rings[0]

    const result = await call(router.ring.get, { id: ring?.id ?? '' }, ctx)

    expect(result.id).toBe(ring?.id)
    expect(result.name).toBe(ring?.name)
    expect(result.images).toHaveLength(2)
    expect(result.images[0]?.position).toBe(0)
  })

  it('throws NOT_FOUND for non-existent ring', async () => {
    await expect(
      call(router.ring.get, { id: '00000000-0000-0000-0000-000000000000' }, ctx),
    ).rejects.toThrow('Ring not found')
  })
})

describe('ring.feed', () => {
  it('returns unswiped rings for authenticated user', async () => {
    await seedRings(3)
    const { sessionToken } = await loginUser('Alice')

    const feed = await call(router.ring.feed, { limit: 10 }, testContext(sessionToken))

    expect(feed).toHaveLength(3)
    expect(feed[0]?.images).toBeDefined()
  })

  it('excludes already swiped rings', async () => {
    const rings = await seedRings(3)
    const { sessionToken } = await loginUser('Alice')
    const authedCtx = testContext(sessionToken)

    // Swipe on the first ring
    await call(
      router.swipe.create,
      {
        ringId: rings[0]?.id,
        direction: 'LIKE',
      },
      authedCtx,
    )

    const feed = await call(router.ring.feed, { limit: 10 }, authedCtx)

    expect(feed).toHaveLength(2)
    const feedIds = feed.map((r) => r.id)
    expect(feedIds).not.toContain(rings[0]?.id)
  })

  it('returns empty feed when all rings swiped', async () => {
    const rings = await seedRings(2)
    const { sessionToken } = await loginUser('Alice')
    const authedCtx = testContext(sessionToken)

    for (const ring of rings) {
      await call(
        router.swipe.create,
        {
          ringId: ring.id,
          direction: 'LIKE',
        },
        authedCtx,
      )
    }

    const feed = await call(router.ring.feed, { limit: 10 }, authedCtx)
    expect(feed).toHaveLength(0)
  })

  it('requires authentication', async () => {
    await expect(call(router.ring.feed, { limit: 10 }, testContext())).rejects.toThrow()
  })
})
