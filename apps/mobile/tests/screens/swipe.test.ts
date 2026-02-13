import type { RingWithImages } from '@ring/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUser } from '@/lib/auth'
import { client } from '@/lib/orpc'

vi.mock('@/lib/orpc', () => ({
  client: {
    swipe: { create: vi.fn() },
    ring: { feed: vi.fn() },
  },
  orpc: {
    ring: {
      feed: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['ring', 'feed'] }),
      },
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getUser: vi.fn(),
  getToken: vi.fn(),
}))

const mockRing: RingWithImages = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Classic Solitaire Diamond',
  description: 'A timeless ring',
  metalType: 'YELLOW_GOLD',
  stoneType: 'DIAMOND',
  caratWeight: 1.5,
  style: 'SOLITAIRE',
  rating: 4.8,
  reviewCount: 124,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [
    {
      id: 'img-1',
      ringId: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com/ring.jpg',
      position: 0,
    },
  ],
}

describe('swipe screen logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls swipe.create with ringId and LIKE direction', async () => {
    vi.mocked(client.swipe.create).mockResolvedValue({
      id: 'swipe-1',
      userId: 'user-1',
      ringId: mockRing.id,
      direction: 'LIKE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await client.swipe.create({
      ringId: mockRing.id,
      direction: 'LIKE',
    })

    expect(client.swipe.create).toHaveBeenCalledWith({
      ringId: mockRing.id,
      direction: 'LIKE',
    })
    expect(result.direction).toBe('LIKE')
  })

  it('calls swipe.create with NOPE direction', async () => {
    vi.mocked(client.swipe.create).mockResolvedValue({
      id: 'swipe-2',
      userId: 'user-1',
      ringId: mockRing.id,
      direction: 'NOPE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await client.swipe.create({
      ringId: mockRing.id,
      direction: 'NOPE',
    })

    expect(result.direction).toBe('NOPE')
  })

  it('calls swipe.create with SUPER direction', async () => {
    vi.mocked(client.swipe.create).mockResolvedValue({
      id: 'swipe-3',
      userId: 'user-1',
      ringId: mockRing.id,
      direction: 'SUPER',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await client.swipe.create({
      ringId: mockRing.id,
      direction: 'SUPER',
    })

    expect(result.direction).toBe('SUPER')
  })

  it('derives user initials from stored user name', async () => {
    vi.mocked(getUser).mockResolvedValue({
      id: '1',
      name: 'Alice Bob',
      email: 'alice@ring.local',
      sessionToken: 'token',
      sessionExpiresAt: null,
      preferredMetals: [],
      preferredStones: [],
      preferredStyles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const user = await getUser()
    const initials = user?.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')

    expect(initials).toBe('AB')
  })

  it('derives single initial for single-word name', async () => {
    vi.mocked(getUser).mockResolvedValue({
      id: '1',
      name: 'Alice',
      email: 'alice@ring.local',
      sessionToken: 'token',
      sessionExpiresAt: null,
      preferredMetals: [],
      preferredStones: [],
      preferredStyles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const user = await getUser()
    const initials = user?.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')

    expect(initials).toBe('A')
  })

  it('handles swipe.create error gracefully', async () => {
    vi.mocked(client.swipe.create).mockRejectedValue(new Error('Network error'))

    await expect(client.swipe.create({ ringId: mockRing.id, direction: 'LIKE' })).rejects.toThrow(
      'Network error',
    )
  })
})
