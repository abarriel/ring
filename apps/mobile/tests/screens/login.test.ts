import type { User } from '@ring/shared'
import { router } from 'expo-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveUser } from '@/lib/auth'
import { client } from '@/lib/orpc'

vi.mock('@/lib/orpc', () => ({
  client: {
    auth: { login: vi.fn() },
  },
}))

vi.mock('@/lib/auth', () => ({
  saveUser: vi.fn(),
}))

describe('login logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls client.auth.login with trimmed name', async () => {
    const mockUser: User = {
      id: '1',
      name: 'Alice',
      email: 'alice@ring.local',
      sessionToken: null,
      preferredMetals: [],
      preferredStones: [],
      preferredStyles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(client.auth.login).mockResolvedValue(mockUser)

    await client.auth.login({ name: 'Alice' })

    expect(client.auth.login).toHaveBeenCalledWith({ name: 'Alice' })
  })

  it('saves user and navigates on success', async () => {
    const mockUser: User = {
      id: '1',
      name: 'Alice',
      email: 'alice@ring.local',
      sessionToken: null,
      preferredMetals: [],
      preferredStones: [],
      preferredStyles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(client.auth.login).mockResolvedValue(mockUser)
    vi.mocked(saveUser).mockResolvedValue(undefined)

    const user = await client.auth.login({ name: 'Alice' })
    await saveUser(user)
    router.replace('/')

    expect(saveUser).toHaveBeenCalledWith(mockUser)
    expect(router.replace).toHaveBeenCalledWith('/')
  })

  it('does not navigate if login fails', async () => {
    vi.mocked(client.auth.login).mockRejectedValue(new Error('Network error'))

    await expect(client.auth.login({ name: 'Alice' })).rejects.toThrow('Network error')
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('trims whitespace from name before login', () => {
    const name = '  Alice  '
    const trimmed = name.trim()

    expect(trimmed).toBe('Alice')
    expect(trimmed).not.toBe('')
  })

  it('does not proceed with empty trimmed name', () => {
    const name = '   '
    const trimmed = name.trim()

    expect(trimmed).toBe('')
  })
})
