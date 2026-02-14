import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'ring:anonymous-swipes'

export const ANONYMOUS_SWIPE_LIMIT = 5

export type AnonymousSwipe = {
  ringId: string
  direction: 'LIKE' | 'NOPE' | 'SUPER'
}

export async function getAnonymousSwipes(): Promise<AnonymousSwipe[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as AnonymousSwipe[]
  } catch {
    return []
  }
}

export async function saveAnonymousSwipe(swipe: AnonymousSwipe): Promise<AnonymousSwipe[]> {
  const swipes = await getAnonymousSwipes()
  swipes.push(swipe)
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(swipes))
  return swipes
}

export async function getAnonymousSwipeCount(): Promise<number> {
  const swipes = await getAnonymousSwipes()
  return swipes.length
}

export async function clearAnonymousSwipes(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
