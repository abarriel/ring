import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@ring/shared'

const USER_KEY = 'ring:user'

export async function saveUser(user: User) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
}

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_KEY)
  if (!raw) return null
  return JSON.parse(raw)
}

export async function clearUser() {
  await AsyncStorage.removeItem(USER_KEY)
}
