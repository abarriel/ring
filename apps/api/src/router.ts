import { ORPCError, os } from '@orpc/server'
import {
  CreateSwipeSchema,
  CreateUserSchema,
  JoinCoupleSchema,
  LoginSchema,
  type UpdateUser,
  UpdateUserSchema,
} from '@ring/shared'
import { z } from 'zod'
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

  if (user.sessionExpiresAt && user.sessionExpiresAt < new Date()) {
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

const getRing = base.input(z.object({ id: z.string().uuid() })).handler(async ({ input }) => {
  const ring = await db.ring.findUnique({
    where: { id: input.id },
    include: { images: { orderBy: { position: 'asc' } } },
  })
  if (!ring) {
    throw new ORPCError('NOT_FOUND', { message: 'Ring not found' })
  }
  return ring
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

    // Fetch unswiped rings in random order
    const rings = await db.ring.findMany({
      where: excludeIds.length > 0 ? { id: { notIn: excludeIds } } : undefined,
      include: { images: { orderBy: { position: 'asc' } } },
    })

    // Shuffle for random order (Fisher-Yates)
    for (let i = rings.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rings[i], rings[j]] = [rings[j], rings[i]] as [
        (typeof rings)[number],
        (typeof rings)[number],
      ]
    }

    return rings.slice(0, input.limit)
  })

// ── Swipe procedures ────────────────────────────────────────────────────────

const listLikedSwipes = authed
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ input, context }) => {
    const userId = context.user.id

    const swipes = await db.swipe.findMany({
      where: { userId, direction: { in: ['LIKE', 'SUPER'] } },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      skip: input.offset,
      include: {
        ring: { include: { images: { orderBy: { position: 'asc' } } } },
      },
    })

    return swipes.map((s) => s.ring)
  })

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

// ── Couple helpers ──────────────────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I ambiguity

function generateCoupleCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

// ── Couple procedures ──────────────────────────────────────────────────────

const coupleInclude = {
  inviter: { select: { id: true, name: true } },
  partner: { select: { id: true, name: true } },
} as const

const createCouple = authed.handler(async ({ context }) => {
  const userId = context.user.id

  // Check if user is already in an active/pending couple
  const existing = await db.couple.findFirst({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [{ inviterId: userId }, { partnerId: userId }],
    },
  })
  if (existing) {
    throw new ORPCError('CONFLICT', { message: 'Already in a couple' })
  }

  // Generate a unique 6-char code
  let code = generateCoupleCode()
  let attempts = 0
  while (await db.couple.findUnique({ where: { code } })) {
    code = generateCoupleCode()
    attempts++
    if (attempts > 10) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Failed to generate unique code' })
    }
  }

  const couple = await db.couple.create({
    data: { code, inviterId: userId, status: 'PENDING' },
    include: coupleInclude,
  })

  return couple
})

const joinCouple = authed.input(JoinCoupleSchema).handler(async ({ input, context }) => {
  const userId = context.user.id

  // Find the couple by code first
  const couple = await db.couple.findUnique({ where: { code: input.code } })
  if (!couple) {
    throw new ORPCError('NOT_FOUND', { message: 'Code not found' })
  }

  // Cannot join own couple
  if (couple.inviterId === userId) {
    throw new ORPCError('BAD_REQUEST', { message: 'Cannot join your own couple' })
  }

  // Check if couple already has a partner
  if (couple.partnerId) {
    throw new ORPCError('CONFLICT', { message: 'Couple already full' })
  }

  // Check if couple is still pending
  if (couple.status !== 'PENDING') {
    throw new ORPCError('BAD_REQUEST', { message: 'Couple is not available' })
  }

  // Check if user is already in an active/pending couple
  const existingCouple = await db.couple.findFirst({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [{ inviterId: userId }, { partnerId: userId }],
    },
  })
  if (existingCouple) {
    throw new ORPCError('CONFLICT', { message: 'Already paired' })
  }

  const updated = await db.couple.update({
    where: { id: couple.id },
    data: { partnerId: userId, status: 'ACTIVE' },
    include: coupleInclude,
  })

  return updated
})

const getCouple = authed.handler(async ({ context }) => {
  const userId = context.user.id

  const couple = await db.couple.findFirst({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [{ inviterId: userId }, { partnerId: userId }],
    },
    include: coupleInclude,
  })

  return couple
})

const dissolveCouple = authed.handler(async ({ context }) => {
  const userId = context.user.id

  const couple = await db.couple.findFirst({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [{ inviterId: userId }, { partnerId: userId }],
    },
  })
  if (!couple) {
    throw new ORPCError('NOT_FOUND', { message: 'No active couple found' })
  }

  const dissolved = await db.couple.update({
    where: { id: couple.id },
    data: { status: 'DISSOLVED', dissolvedAt: new Date() },
    include: coupleInclude,
  })

  return dissolved
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
    get: getRing,
    feed: feedRings,
  },
  swipe: {
    create: createSwipe,
    listLiked: listLikedSwipes,
  },
  couple: {
    create: createCouple,
    join: joinCouple,
    get: getCouple,
    dissolve: dissolveCouple,
  },
}

export type Router = typeof router
