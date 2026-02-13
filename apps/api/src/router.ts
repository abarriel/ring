import { ORPCError, os } from '@orpc/server'
import {
  CreateSwipeSchema,
  CreateUserSchema,
  LoginSchema,
  type UpdateUser,
  UpdateUserSchema,
} from '@ring/shared'
import { z } from 'zod'
import { Prisma } from '../prisma/generated/prisma/client.js'
import { db } from './db.js'

// ── Auth helpers ────────────────────────────────────────────────────────────

const SESSION_DURATION_DAYS = 30
const SESSION_REFRESH_THRESHOLD_DAYS = 7

function generateSessionToken(): string {
  return crypto.randomUUID()
}

function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
}

// ── Base builder with request context ───────────────────────────────────────

type BaseContext = { headers: Headers }

const base = os.$context<BaseContext>()

// ── Auth middleware ─────────────────────────────────────────────────────────

const authed = base.use(async ({ context, next }, _input, _output) => {
  const authHeader = context.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.slice(7)

  const user = await db.user.findUnique({ where: { sessionToken: token } })
  if (!user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Invalid session token' })
  }

  if (!user.sessionExpiresAt || user.sessionExpiresAt < new Date()) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Session expired' })
  }

  // Refresh token expiry if less than 7 days remaining
  if (user.sessionExpiresAt) {
    const remainingMs = user.sessionExpiresAt.getTime() - Date.now()
    const thresholdMs = SESSION_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
    if (remainingMs < thresholdMs) {
      await db.user.update({
        where: { id: user.id },
        data: { sessionExpiresAt: sessionExpiresAt() },
      })
    }
  }

  return next({ context: { user } })
})

// ── Auth ─────────────────────────────────────────────────────────────────────

const login = base.input(LoginSchema).handler(async ({ input }) => {
  const email = `${input.name.toLowerCase().replace(/\s+/g, '_')}@ring.local`
  const token = generateSessionToken()
  const expiresAt = sessionExpiresAt()

  const user = await db.user.upsert({
    where: { email },
    create: {
      name: input.name,
      email,
      sessionToken: token,
      sessionExpiresAt: expiresAt,
    },
    update: {
      sessionToken: token,
      sessionExpiresAt: expiresAt,
    },
  })

  return { user, sessionToken: token }
})

// ── User procedures ─────────────────────────────────────────────────────────

const listUsers = base
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ input }) => {
    const users = await db.user.findMany({
      take: input.limit,
      skip: input.offset,
      orderBy: { createdAt: 'desc' },
    })
    return users
  })

const getUser = base.input(z.object({ id: z.string().uuid() })).handler(async ({ input }) => {
  const user = await db.user.findUniqueOrThrow({ where: { id: input.id } })
  return user
})

const createUser = base.input(CreateUserSchema).handler(async ({ input }) => {
  const user = await db.user.create({ data: input })
  return user
})

const updateUser = base
  .input(z.object({ id: z.string().uuid(), data: UpdateUserSchema }))
  .handler(async ({ input }) => {
    const user = await db.user.update({
      where: { id: input.id },
      data: input.data as UpdateUser,
    })
    return user
  })

const deleteUser = base.input(z.object({ id: z.string().uuid() })).handler(async ({ input }) => {
  await db.user.delete({ where: { id: input.id } })
  return { success: true }
})

// ── Ring procedures ─────────────────────────────────────────────────────────

const listRings = base
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ input }) => {
    const rings = await db.ring.findMany({
      take: input.limit,
      skip: input.offset,
      orderBy: { createdAt: 'asc' },
      include: { images: { orderBy: { position: 'asc' } } },
    })
    return rings
  })

const feedRings = authed
  .input(
    z.object({
      limit: z.number().int().min(1).max(50).default(10),
    }),
  )
  .handler(async ({ input, context }) => {
    const userId = context.user.id

    // Get IDs of rings the user has already swiped on
    const swipedRingIds = await db.swipe.findMany({
      where: { userId },
      select: { ringId: true },
    })
    const excludeIds = swipedRingIds.map((s) => s.ringId)

    // Use database-level random ordering with proper parameterization
    let rings: Array<{
      id: string
      name: string
      description: string | null
      caratWeight: number | null
      metalType: string | null
      style: string | null
      rating: number
      reviewCount: number
      createdAt: Date
      updatedAt: Date
    }>

    if (excludeIds.length > 0) {
      rings = await db.$queryRaw(
        Prisma.sql`
          SELECT id, name, description, "caratWeight", "metalType", style, rating, "reviewCount", "createdAt", "updatedAt"
          FROM rings
          WHERE id NOT IN (${Prisma.join(excludeIds)})
          ORDER BY RANDOM()
          LIMIT ${input.limit}
        `,
      )
    } else {
      rings = await db.$queryRaw(
        Prisma.sql`
          SELECT id, name, description, "caratWeight", "metalType", style, rating, "reviewCount", "createdAt", "updatedAt"
          FROM rings
          ORDER BY RANDOM()
          LIMIT ${input.limit}
        `,
      )
    }

    // Fetch images for the selected rings
    if (rings.length === 0) {
      return []
    }

    const ringIds = rings.map((r) => r.id)
    const images = await db.ringImage.findMany({
      where: { ringId: { in: ringIds } },
      orderBy: { position: 'asc' },
    })

    // Create a Map for O(n+m) complexity instead of O(n*m)
    const imagesByRingId = images.reduce(
      (acc, img) => {
        if (!acc[img.ringId]) {
          acc[img.ringId] = []
        }
        acc[img.ringId]?.push(img)
        return acc
      },
      {} as Record<string, typeof images>,
    )

    // Map images to rings
    const ringsWithImages = rings.map((ring) => ({
      ...ring,
      images: imagesByRingId[ring.id] || [],
    }))

    return ringsWithImages
  })

// ── Swipe procedures ────────────────────────────────────────────────────────

const createSwipe = authed.input(CreateSwipeSchema).handler(async ({ input, context }) => {
  const userId = context.user.id

  // Validate ring exists
  const ring = await db.ring.findUnique({ where: { id: input.ringId } })
  if (!ring) {
    throw new ORPCError('NOT_FOUND', { message: 'Ring not found' })
  }

  // Upsert swipe on (userId, ringId)
  const swipe = await db.swipe.upsert({
    where: { userId_ringId: { userId, ringId: input.ringId } },
    create: {
      userId,
      ringId: input.ringId,
      direction: input.direction,
    },
    update: {
      direction: input.direction,
    },
  })

  return swipe
})

// ── Router ──────────────────────────────────────────────────────────────────

export const router = {
  auth: {
    login,
  },
  user: {
    list: listUsers,
    get: getUser,
    create: createUser,
    update: updateUser,
    delete: deleteUser,
  },
  ring: {
    list: listRings,
    feed: feedRings,
  },
  swipe: {
    create: createSwipe,
  },
}

export type Router = typeof router
