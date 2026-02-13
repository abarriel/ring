import { describe, expect, it, vi } from 'vitest'
import { client } from '@/lib/orpc'

vi.mock('@/lib/orpc', () => ({
  client: {
    user: { list: vi.fn() },
  },
  orpc: {
    user: {
      list: {
        queryOptions: vi.fn(),
      },
    },
  },
}))

describe('home screen data', () => {
  it('fetches user list with limit and offset', async () => {
    const now = new Date()
    const mockUsers = [
      {
        id: '1',
        name: 'Alice',
        email: 'alice@ring.local',
        sessionToken: null,
        preferredMetals: [],
        preferredStones: [],
        preferredStyles: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '2',
        name: 'Bob',
        email: 'bob@ring.local',
        sessionToken: null,
        preferredMetals: [],
        preferredStones: [],
        preferredStyles: [],
        createdAt: now,
        updatedAt: now,
      },
    ]
    vi.mocked(client.user.list).mockResolvedValue(mockUsers)

    const users = await client.user.list({ limit: 10, offset: 0 })

    expect(users).toHaveLength(2)
    expect(users[0]?.name).toBe('Alice')
    expect(users[1]?.name).toBe('Bob')
  })

  it('returns empty list when no users', async () => {
    vi.mocked(client.user.list).mockResolvedValue([])

    const users = await client.user.list({ limit: 10, offset: 0 })

    expect(users).toEqual([])
  })

  it('propagates errors', async () => {
    vi.mocked(client.user.list).mockRejectedValue(new Error('Network error'))

    await expect(client.user.list({ limit: 10, offset: 0 })).rejects.toThrow('Network error')
  })
})
