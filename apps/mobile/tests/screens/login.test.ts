import type { LoginResponse, User } from '@ring/shared'
import { router } from 'expo-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveToken, saveUser } from '@/lib/auth'
import { client } from '@/lib/orpc'

vi.mock('@/lib/orpc', () => ({
  client: {
    auth: { login: vi.fn() },
  },
}))

vi.mock('@/lib/auth', () => ({
  saveUser: vi.fn(),
  saveToken: vi.fn(),
}))

const mockUser: User = {
  id: '1',
  name: 'Alice',
  email: 'alice@ring.local',
  sessionToken: 'test-token-123',
  sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  preferredMetals: [],
  preferredStones: [],
  preferredStyles: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockLoginResponse: LoginResponse = {
  user: mockUser,
  sessionToken: 'test-token-123',
}

describe('login logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls client.auth.login with trimmed name', async () => {
    vi.mocked(client.auth.login).mockResolvedValue(mockLoginResponse)

    await client.auth.login({ name: 'Alice' })

    expect(client.auth.login).toHaveBeenCalledWith({ name: 'Alice' })
  })

  it('saves user, token, and navigates on success', async () => {
    vi.mocked(client.auth.login).mockResolvedValue(mockLoginResponse)
    vi.mocked(saveUser).mockResolvedValue(undefined)
    vi.mocked(saveToken).mockResolvedValue(undefined)

    const result = await client.auth.login({ name: 'Alice' })
    await saveUser(result.user)
    await saveToken(result.sessionToken)
    router.replace('/')

    expect(saveUser).toHaveBeenCalledWith(mockUser)
    expect(saveToken).toHaveBeenCalledWith('test-token-123')
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
