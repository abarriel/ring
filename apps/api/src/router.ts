import { os } from '@orpc/server'
import {
  CreateUserSchema,
  LoginSchema,
  type UpdateUser,
  UpdateUserSchema,
  UserSchema,
} from '@ring/shared'
import { z } from 'zod'
import { db } from './db.js'

// ── Auth ─────────────────────────────────────────────────────────────────────

const login = os.input(LoginSchema).handler(async ({ input }) => {
  const email = `${input.name.toLowerCase().replace(/\s+/g, '_')}@ring.local`
  const user = await db.user.upsert({
    where: { email },
    create: {
      name: input.name,
      email,
    },
    update: {},
  })
  return user
})

// ── Procedures ──────────────────────────────────────────────────────────────

const listUsers = os
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

const getUser = os.input(z.object({ id: z.string().uuid() })).handler(async ({ input }) => {
  const user = await db.user.findUniqueOrThrow({ where: { id: input.id } })
  return user
})

const createUser = os
  .input(CreateUserSchema)
  .output(UserSchema)
  .handler(async ({ input }) => {
    const user = await db.user.create({ data: input })
    return user
  })

const updateUser = os
  .input(z.object({ id: z.string().uuid(), data: UpdateUserSchema }))
  .handler(async ({ input }) => {
    const user = await db.user.update({
      where: { id: input.id },
      data: input.data as UpdateUser,
    })
    return user
  })

const deleteUser = os.input(z.object({ id: z.string().uuid() })).handler(async ({ input }) => {
  await db.user.delete({ where: { id: input.id } })
  return { success: true }
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
}

export type Router = typeof router
