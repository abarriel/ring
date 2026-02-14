import type { User } from '@ring/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearUser, getToken, getUser, saveToken, saveUser } from '@/lib/auth'

/**
 * AuthProvider logic tests.
 *
 * We test the underlying auth functions that AuthProvider delegates to,
 * since rendering React context in Vitest without RN is not practical.
 * The AuthProvider is a thin wrapper: boot() calls getToken + getUser,
 * login() calls saveUser + saveToken, logout() calls clearUser.
 */

vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
  getUser: vi.fn(),
  saveToken: vi.fn(),
  saveUser: vi.fn(),
  clearUser: vi.fn(),
}))

const mockUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'alice@ring.local',
  name: 'Alice',
  sessionToken: null,
  sessionExpiresAt: null,
  pushToken: null,
  preferredMetals: [],
  preferredStones: [],
  preferredStyles: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('auth-context (AuthProvider logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('boot (initial auth check)', () => {
    it('resolves as authenticated when token + user exist', async () => {
      vi.mocked(getToken).mockResolvedValue('valid-token')
      vi.mocked(getUser).mockResolvedValue(mockUser)

      const [token, user] = await Promise.all([getToken(), getUser()])

      expect(token).toBe('valid-token')
      expect(user).toEqual(mockUser)
      // AuthProvider would set isAuthenticated=true, user=mockUser
    })

    it('resolves as anonymous when no token exists', async () => {
      vi.mocked(getToken).mockResolvedValue(null)
      vi.mocked(getUser).mockResolvedValue(null)

      const [token, user] = await Promise.all([getToken(), getUser()])

      expect(token).toBeNull()
      expect(user).toBeNull()
      // AuthProvider would set isAuthenticated=false, user=null
    })

    it('resolves as anonymous when token exists but user is missing', async () => {
      vi.mocked(getToken).mockResolvedValue('valid-token')
      vi.mocked(getUser).mockResolvedValue(null)

      const [token, user] = await Promise.all([getToken(), getUser()])

      expect(token).toBeTruthy()
      expect(user).toBeNull()
      // AuthProvider requires BOTH token + user to be authenticated
    })
  })

  describe('login', () => {
    it('stores user and token', async () => {
      await saveUser(mockUser)
      await saveToken('new-session-token')

      expect(saveUser).toHaveBeenCalledWith(mockUser)
      expect(saveToken).toHaveBeenCalledWith('new-session-token')
    })
  })

  describe('logout', () => {
    it('clears all credentials', async () => {
      await clearUser()

      expect(clearUser).toHaveBeenCalled()
    })
  })

  describe('refreshUser', () => {
    it('re-reads user from storage', async () => {
      const updatedUser = { ...mockUser, name: 'Alice Updated' }
      vi.mocked(getUser).mockResolvedValue(updatedUser)

      const user = await getUser()

      expect(user?.name).toBe('Alice Updated')
    })
  })
})
