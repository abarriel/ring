import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@ring/shared'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { clearUser, getToken, getUser, saveToken, saveUser } from '@/lib/auth'

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

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveUser', () => {
    it('stores serialized user', async () => {
      await saveUser(mockUser)

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('ring:user', JSON.stringify(mockUser))
    })
  })

  describe('saveToken', () => {
    it('stores token string', async () => {
      await saveToken('test-token-123')

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('ring:token', 'test-token-123')
    })
  })

  describe('getUser', () => {
    it('returns parsed user when stored', async () => {
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(JSON.stringify(mockUser))

      const user = await getUser()

      // JSON.parse returns date strings, not Date objects
      expect(user).toEqual({
        ...mockUser,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      })
    })

    it('returns null when nothing stored', async () => {
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(null)

      const user = await getUser()

      expect(user).toBeNull()
    })
  })

  describe('getToken', () => {
    it('returns token when stored', async () => {
      ;(AsyncStorage.getItem as Mock).mockResolvedValue('test-token-123')

      const token = await getToken()

      expect(token).toBe('test-token-123')
    })

    it('returns null when no token stored', async () => {
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(null)

      const token = await getToken()

      expect(token).toBeNull()
    })
  })

  describe('clearUser', () => {
    it('removes user and token keys', async () => {
      await clearUser()

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['ring:user', 'ring:token'])
    })
  })
})
