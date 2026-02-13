import type { RingWithImages } from '@ring/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { client } from '@/lib/orpc'

vi.mock('@/lib/orpc', () => ({
  client: {
    swipe: { listLiked: vi.fn(), create: vi.fn() },
  },
  orpc: {
    swipe: {
      listLiked: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['swipe', 'listLiked'] }),
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

const mockRing2: RingWithImages = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  name: 'Rose Gold Halo',
  description: 'Elegant halo design',
  metalType: 'ROSE_GOLD',
  stoneType: 'SAPPHIRE',
  caratWeight: 2.0,
  style: 'HALO',
  rating: 4.5,
  reviewCount: 89,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [
    {
      id: 'img-2',
      ringId: '660e8400-e29b-41d4-a716-446655440001',
      url: 'https://example.com/ring2.jpg',
      position: 0,
    },
  ],
}

describe('favorites screen logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches liked rings via swipe.listLiked', async () => {
    vi.mocked(client.swipe.listLiked).mockResolvedValue([mockRing, mockRing2])

    const result = await client.swipe.listLiked({ limit: 50, offset: 0 })

    expect(client.swipe.listLiked).toHaveBeenCalledWith({ limit: 50, offset: 0 })
    expect(result).toHaveLength(2)
    expect(result[0]?.name).toBe('Classic Solitaire Diamond')
    expect(result[1]?.name).toBe('Rose Gold Halo')
  })

  it('returns empty array for user with no liked rings', async () => {
    vi.mocked(client.swipe.listLiked).mockResolvedValue([])

    const result = await client.swipe.listLiked({ limit: 50, offset: 0 })

    expect(result).toEqual([])
  })

  it('returns rings with image data for thumbnails', async () => {
    vi.mocked(client.swipe.listLiked).mockResolvedValue([mockRing])

    const result = await client.swipe.listLiked({ limit: 50, offset: 0 })

    expect(result[0]?.images).toHaveLength(1)
    expect(result[0]?.images[0]?.url).toBe('https://example.com/ring.jpg')
  })

  it('formats metal type for display', () => {
    const formatted = mockRing.metalType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
    expect(formatted).toBe('Yellow Gold')
  })

  it('handles fetch error gracefully', async () => {
    vi.mocked(client.swipe.listLiked).mockRejectedValue(new Error('Network error'))

    await expect(client.swipe.listLiked({ limit: 50, offset: 0 })).rejects.toThrow('Network error')
  })
})
