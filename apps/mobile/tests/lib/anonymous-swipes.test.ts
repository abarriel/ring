import AsyncStorage from '@react-native-async-storage/async-storage'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import {
  ANONYMOUS_SWIPE_LIMIT,
  clearAnonymousSwipes,
  getAnonymousSwipeCount,
  getAnonymousSwipes,
  saveAnonymousSwipe,
} from '@/lib/anonymous-swipes'

describe('anonymous-swipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ANONYMOUS_SWIPE_LIMIT', () => {
    it('is set to 5', () => {
      expect(ANONYMOUS_SWIPE_LIMIT).toBe(5)
    })
  })

  describe('getAnonymousSwipes', () => {
    it('returns empty array when nothing stored', async () => {
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(null)

      const swipes = await getAnonymousSwipes()

      expect(swipes).toEqual([])
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('ring:anonymous-swipes')
    })

    it('returns parsed swipes when stored', async () => {
      const stored = [
        { ringId: 'ring-1', direction: 'LIKE' },
        { ringId: 'ring-2', direction: 'NOPE' },
      ]
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(JSON.stringify(stored))

      const swipes = await getAnonymousSwipes()

      expect(swipes).toEqual(stored)
    })
  })

  describe('saveAnonymousSwipe', () => {
    it('appends swipe to empty storage', async () => {
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(null)

      const result = await saveAnonymousSwipe({ ringId: 'ring-1', direction: 'LIKE' })

      expect(result).toEqual([{ ringId: 'ring-1', direction: 'LIKE' }])
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'ring:anonymous-swipes',
        JSON.stringify([{ ringId: 'ring-1', direction: 'LIKE' }]),
      )
    })

    it('appends swipe to existing swipes', async () => {
      const existing = [{ ringId: 'ring-1', direction: 'LIKE' }]
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(JSON.stringify(existing))

      const result = await saveAnonymousSwipe({ ringId: 'ring-2', direction: 'NOPE' })

      expect(result).toHaveLength(2)
      expect(result[1]).toEqual({ ringId: 'ring-2', direction: 'NOPE' })
    })

    it('returns updated swipes array', async () => {
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(null)

      const result = await saveAnonymousSwipe({ ringId: 'ring-1', direction: 'SUPER' })

      expect(result).toHaveLength(1)
      expect(result[0]?.direction).toBe('SUPER')
    })
  })

  describe('getAnonymousSwipeCount', () => {
    it('returns 0 when nothing stored', async () => {
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(null)

      const count = await getAnonymousSwipeCount()

      expect(count).toBe(0)
    })

    it('returns correct count for stored swipes', async () => {
      const stored = [
        { ringId: 'ring-1', direction: 'LIKE' },
        { ringId: 'ring-2', direction: 'NOPE' },
        { ringId: 'ring-3', direction: 'SUPER' },
      ]
      ;(AsyncStorage.getItem as Mock).mockResolvedValue(JSON.stringify(stored))

      const count = await getAnonymousSwipeCount()

      expect(count).toBe(3)
    })
  })

  describe('clearAnonymousSwipes', () => {
    it('removes the storage key', async () => {
      await clearAnonymousSwipes()

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('ring:anonymous-swipes')
    })
  })
})
