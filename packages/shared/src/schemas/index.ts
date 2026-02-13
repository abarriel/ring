import { z } from 'zod'

// ── Enum schemas ────────────────────────────────────────────────────────────

export const MetalTypeSchema = z.enum([
  'YELLOW_GOLD',
  'WHITE_GOLD',
  'ROSE_GOLD',
  'PLATINUM',
  'SILVER',
])

export const StoneTypeSchema = z.enum([
  'DIAMOND',
  'SAPPHIRE',
  'EMERALD',
  'RUBY',
  'MOISSANITE',
  'MORGANITE',
  'NONE',
])

export const RingStyleSchema = z.enum([
  'SOLITAIRE',
  'HALO',
  'VINTAGE',
  'PAVE',
  'THREE_STONE',
  'CLUSTER',
  'ETERNITY',
  'TENSION',
  'CATHEDRAL',
  'BEZEL',
])

export const SwipeDirectionSchema = z.enum(['LIKE', 'NOPE', 'SUPER'])

export const CoupleStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DISSOLVED'])

// ── Enum types ──────────────────────────────────────────────────────────────

export type MetalType = z.infer<typeof MetalTypeSchema>
export type StoneType = z.infer<typeof StoneTypeSchema>
export type RingStyle = z.infer<typeof RingStyleSchema>
export type SwipeDirection = z.infer<typeof SwipeDirectionSchema>
export type CoupleStatus = z.infer<typeof CoupleStatusSchema>

// ── User schemas ────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  sessionToken: z.string().nullable(),
  preferredMetals: z.array(MetalTypeSchema),
  preferredStones: z.array(StoneTypeSchema),
  preferredStyles: z.array(RingStyleSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateUserSchema = UserSchema.pick({
  email: true,
  name: true,
})

export const UpdateUserSchema = CreateUserSchema.partial()

export const LoginSchema = z.object({
  name: z.string().min(1).max(100),
})

export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type Login = z.infer<typeof LoginSchema>

// ── Ring schemas ────────────────────────────────────────────────────────────

export const RingImageSchema = z.object({
  id: z.string().uuid(),
  ringId: z.string().uuid(),
  url: z.string().url(),
  position: z.number().int().min(0),
})

export const RingSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  metalType: MetalTypeSchema,
  stoneType: StoneTypeSchema,
  caratWeight: z.number().positive(),
  style: RingStyleSchema,
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const RingWithImagesSchema = RingSchema.extend({
  images: z.array(RingImageSchema),
})

export const CreateRingSchema = RingSchema.omit({
  id: true,
  rating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateRingSchema = CreateRingSchema.partial()

export type RingImage = z.infer<typeof RingImageSchema>
export type Ring = z.infer<typeof RingSchema>
export type RingWithImages = z.infer<typeof RingWithImagesSchema>
export type CreateRing = z.infer<typeof CreateRingSchema>
export type UpdateRing = z.infer<typeof UpdateRingSchema>

// ── Swipe schemas ───────────────────────────────────────────────────────────

export const SwipeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  ringId: z.string().uuid(),
  direction: SwipeDirectionSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateSwipeSchema = SwipeSchema.pick({
  ringId: true,
  direction: true,
})

export type Swipe = z.infer<typeof SwipeSchema>
export type CreateSwipe = z.infer<typeof CreateSwipeSchema>

// ── Couple schemas ──────────────────────────────────────────────────────────

export const CoupleSchema = z.object({
  id: z.string().uuid(),
  code: z.string().length(6),
  inviterId: z.string().uuid(),
  partnerId: z.string().uuid().nullable(),
  status: CoupleStatusSchema,
  createdAt: z.date(),
  dissolvedAt: z.date().nullable(),
})

export type Couple = z.infer<typeof CoupleSchema>

// ── Match schemas ───────────────────────────────────────────────────────────

export const MatchSchema = z.object({
  id: z.string().uuid(),
  coupleId: z.string().uuid(),
  ringId: z.string().uuid(),
  createdAt: z.date(),
})

export type Match = z.infer<typeof MatchSchema>
