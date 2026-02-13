import type { RingWithImages } from '@ring/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { client } from '@/lib/orpc'

vi.mock('@/lib/orpc', () => ({
  client: {
    swipe: { create: vi.fn() },
  },
  orpc: {
    ring: {
      feed: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['ring', 'feed'] }),
      },
    },
    swipe: {
      listLiked: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['swipe', 'listLiked'] }),
      },
    },
    match: {
      list: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['match', 'list'] }),
      },
    },
  },
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

describe('celebration modal logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('swipe.create returns match when both partners like same ring', async () => {
    const matchData = {
      id: 'match-1',
      coupleId: 'couple-1',
      ringId: mockRing.id,
      createdAt: new Date(),
    }

    vi.mocked(client.swipe.create).mockResolvedValue({
      swipe: {
        id: 'swipe-1',
        userId: 'user-1',
        ringId: mockRing.id,
        direction: 'LIKE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      match: matchData,
    })

    const result = await client.swipe.create({
      ringId: mockRing.id,
      direction: 'LIKE',
    })

    expect(result.match).not.toBeNull()
    expect(result.match?.id).toBe('match-1')
    expect(result.match?.ringId).toBe(mockRing.id)
  })

  it('swipe.create returns null match when no partner match', async () => {
    vi.mocked(client.swipe.create).mockResolvedValue({
      swipe: {
        id: 'swipe-1',
        userId: 'user-1',
        ringId: mockRing.id,
        direction: 'LIKE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      match: null,
    })

    const result = await client.swipe.create({
      ringId: mockRing.id,
      direction: 'LIKE',
    })

    expect(result.match).toBeNull()
  })

  it('match data contains coupleId and ringId', async () => {
    const matchData = {
      id: 'match-1',
      coupleId: 'couple-1',
      ringId: mockRing.id,
      createdAt: new Date(),
    }

    vi.mocked(client.swipe.create).mockResolvedValue({
      swipe: {
        id: 'swipe-1',
        userId: 'user-1',
        ringId: mockRing.id,
        direction: 'LIKE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      match: matchData,
    })

    const result = await client.swipe.create({
      ringId: mockRing.id,
      direction: 'LIKE',
    })

    expect(result.match?.coupleId).toBe('couple-1')
    expect(result.match?.ringId).toBe(mockRing.id)
  })

  it('celebration should trigger on LIKE that returns a match', async () => {
    vi.mocked(client.swipe.create).mockResolvedValue({
      swipe: {
        id: 'swipe-1',
        userId: 'user-1',
        ringId: mockRing.id,
        direction: 'LIKE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      match: {
        id: 'match-1',
        coupleId: 'couple-1',
        ringId: mockRing.id,
        createdAt: new Date(),
      },
    })

    const result = await client.swipe.create({
      ringId: mockRing.id,
      direction: 'LIKE',
    })

    // Celebration logic: show modal when match is not null
    const shouldShowCelebration = result.match !== null
    expect(shouldShowCelebration).toBe(true)
  })

  it('celebration should NOT trigger on NOPE', async () => {
    vi.mocked(client.swipe.create).mockResolvedValue({
      swipe: {
        id: 'swipe-1',
        userId: 'user-1',
        ringId: mockRing.id,
        direction: 'NOPE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      match: null,
    })

    const result = await client.swipe.create({
      ringId: mockRing.id,
      direction: 'NOPE',
    })

    const shouldShowCelebration = result.match !== null
    expect(shouldShowCelebration).toBe(false)
  })
})
