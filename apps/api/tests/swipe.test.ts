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

describe('swipe.create', () => {
  it('creates a swipe', async () => {
    const { sessionToken } = await loginUser('Alice')
    const ring = await seedRing()
    const authedCtx = testContext(sessionToken)

    const swipe = await call(
      router.swipe.create,
      {
        ringId: ring.id,
        direction: 'LIKE',
      },
      authedCtx,
    )

    expect(swipe).toMatchObject({
      ringId: ring.id,
      direction: 'LIKE',
    })
    expect(swipe.id).toBeDefined()
    expect(swipe.userId).toBeDefined()
  })

  it('upserts on duplicate (userId, ringId)', async () => {
    const { sessionToken } = await loginUser('Alice')
    const ring = await seedRing()
    const authedCtx = testContext(sessionToken)

    const first = await call(
      router.swipe.create,
      {
        ringId: ring.id,
        direction: 'LIKE',
      },
      authedCtx,
    )

    const second = await call(
      router.swipe.create,
      {
        ringId: ring.id,
        direction: 'NOPE',
      },
      authedCtx,
    )

    // Same swipe record, updated direction
    expect(second.id).toBe(first.id)
    expect(second.direction).toBe('NOPE')
  })

  it('throws NOT_FOUND for non-existent ring', async () => {
    const { sessionToken } = await loginUser('Alice')
    const authedCtx = testContext(sessionToken)

    await expect(
      call(
        router.swipe.create,
        {
          ringId: '00000000-0000-0000-0000-000000000000',
          direction: 'LIKE',
        },
        authedCtx,
      ),
    ).rejects.toThrow('Ring not found')
  })

  it('requires authentication', async () => {
    const ring = await seedRing()

    await expect(
      call(
        router.swipe.create,
        {
          ringId: ring.id,
          direction: 'LIKE',
        },
        testContext(),
      ),
    ).rejects.toThrow()
  })

  it('supports all swipe directions', async () => {
    const { sessionToken } = await loginUser('Alice')
    const authedCtx = testContext(sessionToken)

    const ring1 = await seedRing('Ring 1')
    const ring2 = await seedRing('Ring 2')
    const ring3 = await seedRing('Ring 3')

    const like = await call(router.swipe.create, { ringId: ring1.id, direction: 'LIKE' }, authedCtx)
    const nope = await call(router.swipe.create, { ringId: ring2.id, direction: 'NOPE' }, authedCtx)
    const superSwipe = await call(
      router.swipe.create,
      { ringId: ring3.id, direction: 'SUPER' },
      authedCtx,
    )

    expect(like.direction).toBe('LIKE')
    expect(nope.direction).toBe('NOPE')
    expect(superSwipe.direction).toBe('SUPER')
  })
})
