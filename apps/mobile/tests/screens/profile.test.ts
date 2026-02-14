import type { User } from '@ring/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearUser, getUser } from '@/lib/auth'
import { client } from '@/lib/orpc'
import { getInitials } from '@/lib/utils'

vi.mock('@/lib/orpc', () => ({
  client: {
    couple: {
      create: vi.fn(),
      join: vi.fn(),
      get: vi.fn(),
      dissolve: vi.fn(),
    },
  },
  orpc: {
    couple: {
      get: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['couple', 'get'] }),
      },
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getUser: vi.fn(),
  clearUser: vi.fn(),
  saveUser: vi.fn(),
  saveToken: vi.fn(),
  getToken: vi.fn(),
}))

const mockUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'alice@ring.local',
  name: 'Alice',
  sessionToken: 'token-123',
  sessionExpiresAt: new Date(),
  pushToken: null,
  preferredMetals: [],
  preferredStones: [],
  preferredStyles: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('profile screen logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue(mockUser)
  })

  it('loads user from AsyncStorage', async () => {
    const user = await getUser()

    expect(getUser).toHaveBeenCalled()
    expect(user?.name).toBe('Alice')
  })

  it('derives initials from user name via shared utility', () => {
    expect(getInitials('Alice')).toBe('A')
    expect(getInitials('Alice Bob')).toBe('AB')
    expect(getInitials('Jean Pierre Martin')).toBe('JP')
  })

  it('creates a couple and receives a code', async () => {
    vi.mocked(client.couple.create).mockResolvedValue({
      id: 'couple-1',
      code: 'ABC123',
      inviterId: mockUser.id,
      partnerId: null,
      status: 'PENDING',
      createdAt: new Date(),
      dissolvedAt: null,
      inviter: { id: mockUser.id, name: 'Alice' },
      partner: null,
    })

    const result = await client.couple.create(undefined)

    expect(result.code).toBe('ABC123')
    expect(result.status).toBe('PENDING')
    expect(result.inviter.name).toBe('Alice')
  })

  it('joins a couple with a code', async () => {
    vi.mocked(client.couple.join).mockResolvedValue({
      id: 'couple-1',
      code: 'ABC123',
      inviterId: '550e8400-e29b-41d4-a716-446655440001',
      partnerId: mockUser.id,
      status: 'ACTIVE',
      createdAt: new Date(),
      dissolvedAt: null,
      inviter: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Bob' },
      partner: { id: mockUser.id, name: 'Alice' },
    })

    const result = await client.couple.join({ code: 'ABC123' })

    expect(client.couple.join).toHaveBeenCalledWith({ code: 'ABC123' })
    expect(result.status).toBe('ACTIVE')
    expect(result.partner?.name).toBe('Alice')
  })

  it('handles join error for invalid code', async () => {
    vi.mocked(client.couple.join).mockRejectedValue(new Error('Code not found'))

    await expect(client.couple.join({ code: 'XXXXXX' })).rejects.toThrow('Code not found')
  })

  it('handles join error for already paired user', async () => {
    vi.mocked(client.couple.join).mockRejectedValue(new Error('Already paired'))

    await expect(client.couple.join({ code: 'ABC123' })).rejects.toThrow('Already paired')
  })

  it('handles join error for full couple', async () => {
    vi.mocked(client.couple.join).mockRejectedValue(new Error('Couple already full'))

    await expect(client.couple.join({ code: 'ABC123' })).rejects.toThrow('Couple already full')
  })

  it('handles join error for own couple', async () => {
    vi.mocked(client.couple.join).mockRejectedValue(new Error('Cannot join your own couple'))

    await expect(client.couple.join({ code: 'ABC123' })).rejects.toThrow(
      'Cannot join your own couple',
    )
  })

  it('fetches couple status', async () => {
    vi.mocked(client.couple.get).mockResolvedValue({
      id: 'couple-1',
      code: 'ABC123',
      inviterId: mockUser.id,
      partnerId: '550e8400-e29b-41d4-a716-446655440001',
      status: 'ACTIVE',
      createdAt: new Date(),
      dissolvedAt: null,
      inviter: { id: mockUser.id, name: 'Alice' },
      partner: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Bob' },
    })

    const result = await client.couple.get(undefined)

    expect(result?.status).toBe('ACTIVE')
    expect(result?.partner?.name).toBe('Bob')
  })

  it('dissolves a couple', async () => {
    vi.mocked(client.couple.dissolve).mockResolvedValue({
      id: 'couple-1',
      code: 'ABC123',
      inviterId: mockUser.id,
      partnerId: '550e8400-e29b-41d4-a716-446655440001',
      status: 'DISSOLVED',
      createdAt: new Date(),
      dissolvedAt: new Date(),
      inviter: { id: mockUser.id, name: 'Alice' },
      partner: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Bob' },
    })

    const result = await client.couple.dissolve(undefined)

    expect(result.status).toBe('DISSOLVED')
    expect(result.dissolvedAt).not.toBeNull()
  })

  it('clears user on logout', async () => {
    vi.mocked(clearUser).mockResolvedValue(undefined)

    await clearUser()

    expect(clearUser).toHaveBeenCalled()
  })
})
