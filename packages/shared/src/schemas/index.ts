import { z } from 'zod'

// ── Example schemas ─────────────────────────────────────────────────────────
// Add your shared Zod schemas here. These are used for validation on both
// the API (oRPC procedures) and the mobile client.

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateUserSchema = CreateUserSchema.partial()

// ── Inferred types ──────────────────────────────────────────────────────────
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
