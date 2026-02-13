import type { RingWithImages } from '@ring/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { client } from '@/lib/orpc'

vi.mock('@/lib/orpc', () => ({
  client: {
    match: { list: vi.fn() },
    couple: { get: vi.fn() },
  },
  orpc: {
    match: {
      list: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['match', 'list'] }),
      },
    },
    couple: {
      get: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['couple', 'get'] }),
      },
    },
  },
}))

vi.mock('expo-router', () => ({
  router: { push: vi.fn() },
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

const mockMatch = {
  id: 'match-1',
  coupleId: 'couple-1',
  ringId: mockRing.id,
  createdAt: new Date(),
  ring: mockRing,
}

const mockActiveCouple = {
  id: 'couple-1',
  code: 'ABC123',
  inviterId: 'user-1',
  partnerId: 'user-2',
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  dissolvedAt: null,
  inviter: { id: 'user-1', name: 'Alice' },
  partner: { id: 'user-2', name: 'Bob' },
}

describe('matches screen logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches matches via match.list', async () => {
    vi.mocked(client.match.list).mockResolvedValue([mockMatch])

    const result = await client.match.list({ limit: 50, offset: 0 })

    expect(client.match.list).toHaveBeenCalledWith({ limit: 50, offset: 0 })
    expect(result).toHaveLength(1)
    expect(result[0]?.ring.name).toBe('Classic Solitaire Diamond')
  })

  it('returns matches with ring images', async () => {
    vi.mocked(client.match.list).mockResolvedValue([mockMatch])

    const result = await client.match.list({ limit: 50, offset: 0 })

    expect(result[0]?.ring.images).toHaveLength(1)
    expect(result[0]?.ring.images[0]?.url).toBe('https://example.com/ring.jpg')
  })

  it('returns empty array when no matches', async () => {
    vi.mocked(client.match.list).mockResolvedValue([])

    const result = await client.match.list({ limit: 50, offset: 0 })

    expect(result).toEqual([])
  })

  it('fetches couple status for empty state logic', async () => {
    vi.mocked(client.couple.get).mockResolvedValue(mockActiveCouple)

    const couple = await client.couple.get()

    expect(couple).not.toBeNull()
    expect(couple?.status).toBe('ACTIVE')
  })

  it('handles unpaired user (couple returns null)', async () => {
    vi.mocked(client.couple.get).mockResolvedValue(null)

    const couple = await client.couple.get()

    expect(couple).toBeNull()
  })

  it('handles error when fetching matches', async () => {
    vi.mocked(client.match.list).mockRejectedValue(new Error('Network error'))

    await expect(client.match.list({ limit: 50, offset: 0 })).rejects.toThrow('Network error')
  })
})
