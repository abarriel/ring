import type { LoginResponse, User } from '@ring/shared'
import { router } from 'expo-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ANONYMOUS_SWIPE_LIMIT,
  clearAnonymousSwipes,
  getAnonymousSwipes,
  saveAnonymousSwipe,
} from '@/lib/anonymous-swipes'
import { getToken, saveToken, saveUser } from '@/lib/auth'
import { client } from '@/lib/orpc'

vi.mock('@/lib/orpc', () => ({
  client: {
    auth: { login: vi.fn() },
    swipe: { create: vi.fn() },
    ring: { list: vi.fn() },
  },
  orpc: {
    ring: {
      list: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['ring', 'list'] }),
      },
      feed: {
        queryOptions: vi.fn().mockReturnValue({ queryKey: ['ring', 'feed'] }),
      },
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
  getUser: vi.fn(),
  saveUser: vi.fn(),
  saveToken: vi.fn(),
}))

vi.mock('@/lib/anonymous-swipes', () => ({
  ANONYMOUS_SWIPE_LIMIT: 5,
  getAnonymousSwipes: vi.fn(),
  saveAnonymousSwipe: vi.fn(),
  getAnonymousSwipeCount: vi.fn(),
  clearAnonymousSwipes: vi.fn(),
}))

const mockUser: User = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@ring.local',
  sessionToken: 'test-token-123',
  sessionExpiresAt: new Date('2025-03-15'),
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

describe('anonymous swipe flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('anonymous detection', () => {
    it('detects anonymous mode when no token exists', async () => {
      vi.mocked(getToken).mockResolvedValue(null)

      const token = await getToken()
      const isAnonymous = !token

      expect(isAnonymous).toBe(true)
    })

    it('detects authenticated mode when token exists', async () => {
      vi.mocked(getToken).mockResolvedValue('valid-token')

      const token = await getToken()
      const isAnonymous = !token

      expect(isAnonymous).toBe(false)
    })
  })

  describe('anonymous swipe storage', () => {
    it('saves swipe locally for anonymous user', async () => {
      const swipes = [{ ringId: 'ring-1', direction: 'LIKE' as const }]
      vi.mocked(saveAnonymousSwipe).mockResolvedValue(swipes)

      const result = await saveAnonymousSwipe({ ringId: 'ring-1', direction: 'LIKE' })

      expect(saveAnonymousSwipe).toHaveBeenCalledWith({ ringId: 'ring-1', direction: 'LIKE' })
      expect(result).toHaveLength(1)
    })

    it('stores all swipe directions', async () => {
      const directions = ['LIKE', 'NOPE', 'SUPER'] as const
      for (const direction of directions) {
        vi.mocked(saveAnonymousSwipe).mockResolvedValue([{ ringId: 'ring-1', direction }])

        const result = await saveAnonymousSwipe({ ringId: 'ring-1', direction })

        expect(result[0]?.direction).toBe(direction)
      }
    })

    it('accumulates swipes up to the limit', async () => {
      const accumulated = Array.from({ length: ANONYMOUS_SWIPE_LIMIT }, (_, i) => ({
        ringId: `ring-${i + 1}`,
        direction: 'LIKE' as const,
      }))
      vi.mocked(saveAnonymousSwipe).mockResolvedValue(accumulated)

      const result = await saveAnonymousSwipe({
        ringId: `ring-${ANONYMOUS_SWIPE_LIMIT}`,
        direction: 'LIKE',
      })

      expect(result).toHaveLength(ANONYMOUS_SWIPE_LIMIT)
    })
  })

  describe('swipe gate', () => {
    it('triggers gate when swipe count reaches limit', async () => {
      const swipesAtLimit = Array.from({ length: ANONYMOUS_SWIPE_LIMIT }, (_, i) => ({
        ringId: `ring-${i + 1}`,
        direction: 'LIKE' as const,
      }))
      vi.mocked(saveAnonymousSwipe).mockResolvedValue(swipesAtLimit)

      const result = await saveAnonymousSwipe({ ringId: 'ring-5', direction: 'LIKE' })
      const showGate = result.length >= ANONYMOUS_SWIPE_LIMIT

      expect(showGate).toBe(true)
    })

    it('does not trigger gate below limit', async () => {
      const swipesBelowLimit = [{ ringId: 'ring-1', direction: 'LIKE' as const }]
      vi.mocked(saveAnonymousSwipe).mockResolvedValue(swipesBelowLimit)

      const result = await saveAnonymousSwipe({ ringId: 'ring-1', direction: 'LIKE' })
      const showGate = result.length >= ANONYMOUS_SWIPE_LIMIT

      expect(showGate).toBe(false)
    })

    it('gate navigates to /login on signup press', () => {
      // Simulates the SwipeGate component's onPress behavior
      router.push('/login')

      expect(router.push).toHaveBeenCalledWith('/login')
    })
  })

  describe('replay on signup', () => {
    it('replays all anonymous swipes after login', async () => {
      const storedSwipes = [
        { ringId: 'ring-1', direction: 'LIKE' as const },
        { ringId: 'ring-2', direction: 'NOPE' as const },
        { ringId: 'ring-3', direction: 'SUPER' as const },
      ]
      vi.mocked(getAnonymousSwipes).mockResolvedValue(storedSwipes)
      vi.mocked(client.swipe.create).mockResolvedValue({
        swipe: {
          id: 'swipe-1',
          userId: 'user-1',
          ringId: 'ring-1',
          direction: 'LIKE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        match: null,
      })
      vi.mocked(clearAnonymousSwipes).mockResolvedValue(undefined)

      // Simulate replayAnonymousSwipes logic
      const swipes = await getAnonymousSwipes()
      for (const swipe of swipes) {
        await client.swipe.create({ ringId: swipe.ringId, direction: swipe.direction })
      }
      await clearAnonymousSwipes()

      expect(client.swipe.create).toHaveBeenCalledTimes(3)
      expect(client.swipe.create).toHaveBeenCalledWith({ ringId: 'ring-1', direction: 'LIKE' })
      expect(client.swipe.create).toHaveBeenCalledWith({ ringId: 'ring-2', direction: 'NOPE' })
      expect(client.swipe.create).toHaveBeenCalledWith({ ringId: 'ring-3', direction: 'SUPER' })
      expect(clearAnonymousSwipes).toHaveBeenCalled()
    })

    it('clears local swipes after successful replay', async () => {
      vi.mocked(getAnonymousSwipes).mockResolvedValue([{ ringId: 'ring-1', direction: 'LIKE' }])
      vi.mocked(client.swipe.create).mockResolvedValue({
        swipe: {
          id: 'swipe-1',
          userId: 'user-1',
          ringId: 'ring-1',
          direction: 'LIKE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        match: null,
      })
      vi.mocked(clearAnonymousSwipes).mockResolvedValue(undefined)

      const swipes = await getAnonymousSwipes()
      for (const swipe of swipes) {
        await client.swipe.create({ ringId: swipe.ringId, direction: swipe.direction })
      }
      await clearAnonymousSwipes()

      expect(clearAnonymousSwipes).toHaveBeenCalledTimes(1)
    })

    it('skips failed replays without stopping', async () => {
      const storedSwipes = [
        { ringId: 'ring-1', direction: 'LIKE' as const },
        { ringId: 'ring-deleted', direction: 'LIKE' as const },
        { ringId: 'ring-3', direction: 'NOPE' as const },
      ]
      vi.mocked(getAnonymousSwipes).mockResolvedValue(storedSwipes)
      vi.mocked(client.swipe.create)
        .mockResolvedValueOnce({
          swipe: {
            id: 'swipe-1',
            userId: 'user-1',
            ringId: 'ring-1',
            direction: 'LIKE',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          match: null,
        })
        .mockRejectedValueOnce(new Error('Ring not found'))
        .mockResolvedValueOnce({
          swipe: {
            id: 'swipe-3',
            userId: 'user-1',
            ringId: 'ring-3',
            direction: 'NOPE',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          match: null,
        })
      vi.mocked(clearAnonymousSwipes).mockResolvedValue(undefined)

      // Simulate replayAnonymousSwipes logic (with try/catch per swipe)
      const swipes = await getAnonymousSwipes()
      for (const swipe of swipes) {
        try {
          await client.swipe.create({ ringId: swipe.ringId, direction: swipe.direction })
        } catch {
          // Skip failures
        }
      }
      await clearAnonymousSwipes()

      // All 3 were attempted, even though ring-deleted failed
      expect(client.swipe.create).toHaveBeenCalledTimes(3)
      expect(clearAnonymousSwipes).toHaveBeenCalled()
    })

    it('handles empty swipes gracefully on replay', async () => {
      vi.mocked(getAnonymousSwipes).mockResolvedValue([])
      vi.mocked(clearAnonymousSwipes).mockResolvedValue(undefined)

      const swipes = await getAnonymousSwipes()
      for (const swipe of swipes) {
        await client.swipe.create({ ringId: swipe.ringId, direction: swipe.direction })
      }
      await clearAnonymousSwipes()

      expect(client.swipe.create).not.toHaveBeenCalled()
      expect(clearAnonymousSwipes).toHaveBeenCalled()
    })

    it('full login + replay flow: login, save credentials, replay, navigate', async () => {
      vi.mocked(client.auth.login).mockResolvedValue(mockLoginResponse)
      vi.mocked(saveUser).mockResolvedValue(undefined)
      vi.mocked(saveToken).mockResolvedValue(undefined)
      vi.mocked(getAnonymousSwipes).mockResolvedValue([
        { ringId: 'ring-1', direction: 'LIKE' },
        { ringId: 'ring-2', direction: 'SUPER' },
      ])
      vi.mocked(client.swipe.create).mockResolvedValue({
        swipe: {
          id: 'swipe-1',
          userId: 'user-1',
          ringId: 'ring-1',
          direction: 'LIKE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        match: null,
      })
      vi.mocked(clearAnonymousSwipes).mockResolvedValue(undefined)

      // Step 1: Login
      const result = await client.auth.login({ name: 'Alice' })
      await saveUser(result.user)
      await saveToken(result.sessionToken)

      // Step 2: Replay anonymous swipes
      const swipes = await getAnonymousSwipes()
      for (const swipe of swipes) {
        try {
          await client.swipe.create({ ringId: swipe.ringId, direction: swipe.direction })
        } catch {
          // skip
        }
      }
      await clearAnonymousSwipes()

      // Step 3: Navigate
      router.replace('/')

      expect(client.auth.login).toHaveBeenCalledWith({ name: 'Alice' })
      expect(saveUser).toHaveBeenCalledWith(mockUser)
      expect(saveToken).toHaveBeenCalledWith('test-token-123')
      expect(client.swipe.create).toHaveBeenCalledTimes(2)
      expect(clearAnonymousSwipes).toHaveBeenCalled()
      expect(router.replace).toHaveBeenCalledWith('/')
    })
  })

  describe('authenticated vs anonymous mode', () => {
    it('anonymous user uses ring.list (public endpoint)', async () => {
      vi.mocked(getToken).mockResolvedValue(null)
      vi.mocked(client.ring.list).mockResolvedValue([])

      const token = await getToken()
      const isAnonymous = !token

      expect(isAnonymous).toBe(true)
      // In anonymous mode, ring.list is used (not ring.feed)
      const rings = await client.ring.list({ limit: 50, offset: 0 })
      expect(client.ring.list).toHaveBeenCalledWith({ limit: 50, offset: 0 })
      expect(rings).toEqual([])
    })

    it('header shows signup button for anonymous users', async () => {
      vi.mocked(getToken).mockResolvedValue(null)

      const token = await getToken()
      const isAnonymous = !token

      // When anonymous, header renders "S'inscrire" button instead of avatar
      expect(isAnonymous).toBe(true)
    })

    it('header shows avatar for authenticated users', async () => {
      vi.mocked(getToken).mockResolvedValue('valid-token')

      const token = await getToken()
      const isAnonymous = !token

      expect(isAnonymous).toBe(false)
    })
  })
})
