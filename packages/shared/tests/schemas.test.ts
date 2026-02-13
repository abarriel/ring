import { describe, expect, it } from 'vitest'
import {
  CoupleSchema,
  CoupleStatusSchema,
  CreateRingSchema,
  CreateSwipeSchema,
  CreateUserSchema,
  LoginResponseSchema,
  LoginSchema,
  MatchSchema,
  MetalTypeSchema,
  RingImageSchema,
  RingSchema,
  RingStyleSchema,
  RingWithImagesSchema,
  StoneTypeSchema,
  SwipeDirectionSchema,
  SwipeSchema,
  UpdateRingSchema,
  UpdateUserSchema,
  UserSchema,
} from '../src/schemas/index.js'

// ── Enum schemas ────────────────────────────────────────────────────────────

describe('MetalTypeSchema', () => {
  it('accepts all valid metal types', () => {
    for (const val of ['YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD', 'PLATINUM', 'SILVER']) {
      expect(MetalTypeSchema.safeParse(val).success).toBe(true)
    }
  })

  it('rejects invalid values', () => {
    expect(MetalTypeSchema.safeParse('COPPER').success).toBe(false)
    expect(MetalTypeSchema.safeParse('').success).toBe(false)
  })
})

describe('StoneTypeSchema', () => {
  it('accepts all valid stone types', () => {
    for (const val of [
      'DIAMOND',
      'SAPPHIRE',
      'EMERALD',
      'RUBY',
      'MOISSANITE',
      'MORGANITE',
      'NONE',
    ]) {
      expect(StoneTypeSchema.safeParse(val).success).toBe(true)
    }
  })

  it('rejects invalid values', () => {
    expect(StoneTypeSchema.safeParse('OPAL').success).toBe(false)
  })
})

describe('RingStyleSchema', () => {
  it('accepts all valid styles', () => {
    for (const val of [
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
    ]) {
      expect(RingStyleSchema.safeParse(val).success).toBe(true)
    }
  })

  it('rejects invalid values', () => {
    expect(RingStyleSchema.safeParse('MODERN').success).toBe(false)
  })
})

describe('SwipeDirectionSchema', () => {
  it('accepts LIKE, NOPE, SUPER', () => {
    for (const val of ['LIKE', 'NOPE', 'SUPER']) {
      expect(SwipeDirectionSchema.safeParse(val).success).toBe(true)
    }
  })

  it('rejects invalid values', () => {
    expect(SwipeDirectionSchema.safeParse('SKIP').success).toBe(false)
  })
})

describe('CoupleStatusSchema', () => {
  it('accepts PENDING, ACTIVE, DISSOLVED', () => {
    for (const val of ['PENDING', 'ACTIVE', 'DISSOLVED']) {
      expect(CoupleStatusSchema.safeParse(val).success).toBe(true)
    }
  })

  it('rejects invalid values', () => {
    expect(CoupleStatusSchema.safeParse('INACTIVE').success).toBe(false)
  })
})

// ── User schemas ────────────────────────────────────────────────────────────

describe('UserSchema', () => {
  const validUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'alice@ring.local',
    name: 'Alice',
    sessionToken: null,
    sessionExpiresAt: null,
    preferredMetals: [],
    preferredStones: [],
    preferredStyles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('accepts a valid user', () => {
    expect(UserSchema.safeParse(validUser).success).toBe(true)
  })

  it('accepts user with preferences', () => {
    const result = UserSchema.safeParse({
      ...validUser,
      preferredMetals: ['YELLOW_GOLD', 'ROSE_GOLD'],
      preferredStones: ['DIAMOND'],
      preferredStyles: ['SOLITAIRE', 'HALO'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts user with session token', () => {
    const result = UserSchema.safeParse({
      ...validUser,
      sessionToken: 'abc123-session-token',
    })
    expect(result.success).toBe(true)
  })

  it('accepts user with sessionExpiresAt date', () => {
    const result = UserSchema.safeParse({
      ...validUser,
      sessionExpiresAt: new Date('2025-03-15'),
    })
    expect(result.success).toBe(true)
  })

  it('accepts user with null sessionExpiresAt', () => {
    const result = UserSchema.safeParse({
      ...validUser,
      sessionExpiresAt: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing fields', () => {
    expect(UserSchema.safeParse({ id: validUser.id }).success).toBe(false)
  })

  it('rejects invalid uuid', () => {
    expect(UserSchema.safeParse({ ...validUser, id: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(UserSchema.safeParse({ ...validUser, email: 'not-email' }).success).toBe(false)
  })

  it('rejects empty name', () => {
    expect(UserSchema.safeParse({ ...validUser, name: '' }).success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    expect(UserSchema.safeParse({ ...validUser, name: 'a'.repeat(101) }).success).toBe(false)
  })

  it('rejects invalid preference values', () => {
    expect(UserSchema.safeParse({ ...validUser, preferredMetals: ['COPPER'] }).success).toBe(false)
  })
})

describe('CreateUserSchema', () => {
  it('accepts valid { email, name }', () => {
    expect(CreateUserSchema.safeParse({ email: 'bob@ring.local', name: 'Bob' }).success).toBe(true)
  })

  it('rejects missing email', () => {
    expect(CreateUserSchema.safeParse({ name: 'Bob' }).success).toBe(false)
  })

  it('rejects missing name', () => {
    expect(CreateUserSchema.safeParse({ email: 'bob@ring.local' }).success).toBe(false)
  })

  it('strips extra fields like id', () => {
    const result = CreateUserSchema.safeParse({
      email: 'bob@ring.local',
      name: 'Bob',
      id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('id')
    }
  })
})

describe('UpdateUserSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(UpdateUserSchema.safeParse({}).success).toBe(true)
  })

  it('accepts { name } only', () => {
    expect(UpdateUserSchema.safeParse({ name: 'NewName' }).success).toBe(true)
  })

  it('accepts { email } only', () => {
    expect(UpdateUserSchema.safeParse({ email: 'new@ring.local' }).success).toBe(true)
  })

  it('rejects invalid email format', () => {
    expect(UpdateUserSchema.safeParse({ email: 'bad-email' }).success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('accepts valid { name }', () => {
    expect(LoginSchema.safeParse({ name: 'Alice' }).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(LoginSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    expect(LoginSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })

  it('rejects missing name', () => {
    expect(LoginSchema.safeParse({}).success).toBe(false)
  })
})

describe('LoginResponseSchema', () => {
  const validUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'alice@ring.local',
    name: 'Alice',
    sessionToken: 'test-token-123',
    sessionExpiresAt: new Date(),
    preferredMetals: [],
    preferredStones: [],
    preferredStyles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('accepts valid login response', () => {
    const result = LoginResponseSchema.safeParse({
      user: validUser,
      sessionToken: 'test-token-123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing user', () => {
    expect(LoginResponseSchema.safeParse({ sessionToken: 'abc' }).success).toBe(false)
  })

  it('rejects missing sessionToken', () => {
    expect(LoginResponseSchema.safeParse({ user: validUser }).success).toBe(false)
  })
})

// ── Ring schemas ────────────────────────────────────────────────────────────

describe('RingSchema', () => {
  const validRing = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Classic Solitaire',
    description: 'A timeless ring',
    metalType: 'YELLOW_GOLD',
    stoneType: 'DIAMOND',
    caratWeight: 1.5,
    style: 'SOLITAIRE',
    rating: 4.8,
    reviewCount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('accepts a valid ring', () => {
    expect(RingSchema.safeParse(validRing).success).toBe(true)
  })

  it('accepts null description', () => {
    expect(RingSchema.safeParse({ ...validRing, description: null }).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(RingSchema.safeParse({ ...validRing, name: '' }).success).toBe(false)
  })

  it('rejects negative carat weight', () => {
    expect(RingSchema.safeParse({ ...validRing, caratWeight: -1 }).success).toBe(false)
  })

  it('rejects zero carat weight', () => {
    expect(RingSchema.safeParse({ ...validRing, caratWeight: 0 }).success).toBe(false)
  })

  it('rejects rating above 5', () => {
    expect(RingSchema.safeParse({ ...validRing, rating: 5.1 }).success).toBe(false)
  })

  it('rejects negative rating', () => {
    expect(RingSchema.safeParse({ ...validRing, rating: -0.1 }).success).toBe(false)
  })

  it('rejects negative review count', () => {
    expect(RingSchema.safeParse({ ...validRing, reviewCount: -1 }).success).toBe(false)
  })

  it('rejects non-integer review count', () => {
    expect(RingSchema.safeParse({ ...validRing, reviewCount: 1.5 }).success).toBe(false)
  })

  it('rejects invalid metal type', () => {
    expect(RingSchema.safeParse({ ...validRing, metalType: 'COPPER' }).success).toBe(false)
  })

  it('rejects invalid stone type', () => {
    expect(RingSchema.safeParse({ ...validRing, stoneType: 'OPAL' }).success).toBe(false)
  })

  it('rejects invalid style', () => {
    expect(RingSchema.safeParse({ ...validRing, style: 'MODERN' }).success).toBe(false)
  })
})

describe('RingImageSchema', () => {
  const validImage = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    ringId: '660e8400-e29b-41d4-a716-446655440000',
    url: 'https://images.unsplash.com/photo-123?w=800',
    position: 0,
  }

  it('accepts a valid ring image', () => {
    expect(RingImageSchema.safeParse(validImage).success).toBe(true)
  })

  it('rejects invalid url', () => {
    expect(RingImageSchema.safeParse({ ...validImage, url: 'not-a-url' }).success).toBe(false)
  })

  it('rejects negative position', () => {
    expect(RingImageSchema.safeParse({ ...validImage, position: -1 }).success).toBe(false)
  })

  it('rejects non-integer position', () => {
    expect(RingImageSchema.safeParse({ ...validImage, position: 0.5 }).success).toBe(false)
  })
})

describe('RingWithImagesSchema', () => {
  const validRingWithImages = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Classic Solitaire',
    description: null,
    metalType: 'YELLOW_GOLD',
    stoneType: 'DIAMOND',
    caratWeight: 1.5,
    style: 'SOLITAIRE',
    rating: 4.8,
    reviewCount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [
      {
        id: '660e8400-e29b-41d4-a716-446655440000',
        ringId: '550e8400-e29b-41d4-a716-446655440000',
        url: 'https://images.unsplash.com/photo-123?w=800',
        position: 0,
      },
    ],
  }

  it('accepts a ring with images', () => {
    expect(RingWithImagesSchema.safeParse(validRingWithImages).success).toBe(true)
  })

  it('accepts a ring with empty images array', () => {
    expect(RingWithImagesSchema.safeParse({ ...validRingWithImages, images: [] }).success).toBe(
      true,
    )
  })
})

describe('CreateRingSchema', () => {
  const validCreate = {
    name: 'New Ring',
    description: 'A new ring',
    metalType: 'PLATINUM',
    stoneType: 'EMERALD',
    caratWeight: 2.0,
    style: 'VINTAGE',
  }

  it('accepts valid create input', () => {
    expect(CreateRingSchema.safeParse(validCreate).success).toBe(true)
  })

  it('strips id, rating, reviewCount, timestamps', () => {
    const result = CreateRingSchema.safeParse({
      ...validCreate,
      id: '550e8400-e29b-41d4-a716-446655440000',
      rating: 5.0,
      reviewCount: 99,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('id')
      expect(result.data).not.toHaveProperty('rating')
      expect(result.data).not.toHaveProperty('reviewCount')
    }
  })

  it('rejects missing required fields', () => {
    expect(CreateRingSchema.safeParse({ name: 'Ring' }).success).toBe(false)
  })
})

describe('UpdateRingSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(UpdateRingSchema.safeParse({}).success).toBe(true)
  })

  it('accepts partial update', () => {
    expect(UpdateRingSchema.safeParse({ name: 'Updated Name' }).success).toBe(true)
  })

  it('rejects invalid enum values', () => {
    expect(UpdateRingSchema.safeParse({ metalType: 'COPPER' }).success).toBe(false)
  })
})

// ── Swipe schemas ───────────────────────────────────────────────────────────

describe('SwipeSchema', () => {
  const validSwipe = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '660e8400-e29b-41d4-a716-446655440000',
    ringId: '770e8400-e29b-41d4-a716-446655440000',
    direction: 'LIKE',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('accepts a valid swipe', () => {
    expect(SwipeSchema.safeParse(validSwipe).success).toBe(true)
  })

  it('accepts all directions', () => {
    for (const dir of ['LIKE', 'NOPE', 'SUPER']) {
      expect(SwipeSchema.safeParse({ ...validSwipe, direction: dir }).success).toBe(true)
    }
  })

  it('rejects invalid direction', () => {
    expect(SwipeSchema.safeParse({ ...validSwipe, direction: 'SKIP' }).success).toBe(false)
  })

  it('rejects invalid uuid for userId', () => {
    expect(SwipeSchema.safeParse({ ...validSwipe, userId: 'bad' }).success).toBe(false)
  })
})

describe('CreateSwipeSchema', () => {
  it('accepts valid create input', () => {
    const result = CreateSwipeSchema.safeParse({
      ringId: '770e8400-e29b-41d4-a716-446655440000',
      direction: 'LIKE',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing ringId', () => {
    expect(CreateSwipeSchema.safeParse({ direction: 'LIKE' }).success).toBe(false)
  })

  it('rejects missing direction', () => {
    expect(
      CreateSwipeSchema.safeParse({ ringId: '770e8400-e29b-41d4-a716-446655440000' }).success,
    ).toBe(false)
  })
})

// ── Couple schemas ──────────────────────────────────────────────────────────

describe('CoupleSchema', () => {
  const validCouple = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'ABC123',
    inviterId: '660e8400-e29b-41d4-a716-446655440000',
    partnerId: null,
    status: 'PENDING',
    createdAt: new Date(),
    dissolvedAt: null,
  }

  it('accepts a valid pending couple', () => {
    expect(CoupleSchema.safeParse(validCouple).success).toBe(true)
  })

  it('accepts an active couple with partner', () => {
    const result = CoupleSchema.safeParse({
      ...validCouple,
      partnerId: '770e8400-e29b-41d4-a716-446655440000',
      status: 'ACTIVE',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a dissolved couple with dissolvedAt', () => {
    const result = CoupleSchema.safeParse({
      ...validCouple,
      status: 'DISSOLVED',
      dissolvedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })

  it('rejects code not exactly 6 chars', () => {
    expect(CoupleSchema.safeParse({ ...validCouple, code: 'AB' }).success).toBe(false)
    expect(CoupleSchema.safeParse({ ...validCouple, code: 'ABCDEFG' }).success).toBe(false)
  })

  it('rejects invalid status', () => {
    expect(CoupleSchema.safeParse({ ...validCouple, status: 'INACTIVE' }).success).toBe(false)
  })
})

// ── Match schemas ───────────────────────────────────────────────────────────

describe('MatchSchema', () => {
  const validMatch = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    coupleId: '660e8400-e29b-41d4-a716-446655440000',
    ringId: '770e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date(),
  }

  it('accepts a valid match', () => {
    expect(MatchSchema.safeParse(validMatch).success).toBe(true)
  })

  it('rejects invalid uuid for coupleId', () => {
    expect(MatchSchema.safeParse({ ...validMatch, coupleId: 'bad' }).success).toBe(false)
  })

  it('rejects invalid uuid for ringId', () => {
    expect(MatchSchema.safeParse({ ...validMatch, ringId: 'bad' }).success).toBe(false)
  })

  it('rejects missing createdAt', () => {
    const { createdAt: _, ...noCreatedAt } = validMatch
    expect(MatchSchema.safeParse(noCreatedAt).success).toBe(false)
  })
})
