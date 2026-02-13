import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@ring/shared'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { clearUser, getUser, saveUser } from '@/lib/auth'

const mockUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'alice@ring.local',
  name: 'Alice',
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

  describe('clearUser', () => {
    it('removes the key', async () => {
      await clearUser()

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('ring:user')
    })
  })
})
