import type { RingWithImages } from '@ring/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { client } from '@/lib/orpc'
import { formatEnum } from '@/lib/utils'

vi.mock('@/lib/orpc', () => ({
  client: {
    ring: { get: vi.fn() },
    swipe: { create: vi.fn() },
  },
  orpc: {
    ring: {
      get: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['ring', 'get'] }),
      },
      feed: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['ring', 'feed'] }),
      },
    },
    swipe: {
      listLiked: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['swipe', 'listLiked'] }),
      },
    },
  },
}))

vi.mock('expo-router', () => ({
  router: { back: vi.fn() },
  useLocalSearchParams: vi.fn().mockReturnValue({ id: '550e8400-e29b-41d4-a716-446655440000' }),
}))

const mockRing: RingWithImages = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Classic Solitaire Diamond',
  description: 'A stunning solitaire diamond ring with a timeless design.',
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
      url: 'https://example.com/ring-front.jpg',
      position: 0,
    },
    {
      id: 'img-2',
      ringId: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com/ring-side.jpg',
      position: 1,
    },
  ],
}

describe('ring detail screen logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches ring by id via ring.get', async () => {
    vi.mocked(client.ring.get).mockResolvedValue(mockRing)

    const result = await client.ring.get({ id: mockRing.id })

    expect(client.ring.get).toHaveBeenCalledWith({ id: mockRing.id })
    expect(result.name).toBe('Classic Solitaire Diamond')
    expect(result.images).toHaveLength(2)
  })

  it('returns ring with all spec fields', async () => {
    vi.mocked(client.ring.get).mockResolvedValue(mockRing)

    const result = await client.ring.get({ id: mockRing.id })

    expect(result.metalType).toBe('YELLOW_GOLD')
    expect(result.stoneType).toBe('DIAMOND')
    expect(result.caratWeight).toBe(1.5)
    expect(result.style).toBe('SOLITAIRE')
    expect(result.rating).toBe(4.8)
    expect(result.reviewCount).toBe(124)
    expect(result.description).toBe('A stunning solitaire diamond ring with a timeless design.')
  })

  it('calls swipe.create with LIKE direction', async () => {
    vi.mocked(client.swipe.create).mockResolvedValue({
      id: 'swipe-1',
      userId: 'user-1',
      ringId: mockRing.id,
      direction: 'LIKE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await client.swipe.create({ ringId: mockRing.id, direction: 'LIKE' })

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

    const result = await client.swipe.create({ ringId: mockRing.id, direction: 'NOPE' })

    expect(client.swipe.create).toHaveBeenCalledWith({
      ringId: mockRing.id,
      direction: 'NOPE',
    })
    expect(result.direction).toBe('NOPE')
  })

  it('handles ring not found error', async () => {
    vi.mocked(client.ring.get).mockRejectedValue(new Error('Ring not found'))

    await expect(client.ring.get({ id: '00000000-0000-0000-0000-000000000000' })).rejects.toThrow(
      'Ring not found',
    )
  })

  it('builds specs from ring data', () => {
    const specs: { label: string; value: string }[] = []
    specs.push({ label: 'Metal', value: formatEnum(mockRing.metalType) })
    specs.push({ label: 'Pierre', value: formatEnum(mockRing.stoneType) })
    if (mockRing.caratWeight) specs.push({ label: 'Carats', value: `${mockRing.caratWeight}` })
    specs.push({ label: 'Style', value: formatEnum(mockRing.style) })

    expect(specs).toEqual([
      { label: 'Metal', value: 'Yellow Gold' },
      { label: 'Pierre', value: 'Diamond' },
      { label: 'Carats', value: '1.5' },
      { label: 'Style', value: 'Solitaire' },
    ])
  })
})
