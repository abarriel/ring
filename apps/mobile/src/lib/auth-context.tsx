import type { User } from '@ring/shared'
import { router } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearUser, getToken, getUser, saveToken, saveUser } from '@/lib/auth'
import { queryClient } from '@/lib/query-client'

type AuthState = {
  /** True once the initial auth check has completed */
  isReady: boolean
  /** True when the user has a valid session token */
  isAuthenticated: boolean
  /** The current user (null when anonymous or loading) */
  user: User | null
  /** Store user + token then update context state */
  login: (user: User, token: string) => Promise<void>
  /** Clear credentials, reset queries, and navigate to login */
  logout: () => Promise<void>
  /** Refresh the user object from storage (e.g. after profile update) */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Boot: check AsyncStorage for existing session
  useEffect(() => {
    async function boot() {
      try {
        const [token, storedUser] = await Promise.all([getToken(), getUser()])
        if (token && storedUser) {
          setIsAuthenticated(true)
          setUser(storedUser)
        }
      } finally {
        setIsReady(true)
        await SplashScreen.hideAsync()
      }
    }
    boot()
  }, [])

  const login = useCallback(async (u: User, token: string) => {
    await saveUser(u)
    await saveToken(token)
    setUser(u)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(async () => {
    await clearUser()
    queryClient.clear()
    setUser(null)
    setIsAuthenticated(false)
    router.replace('/(auth)/welcome')
  }, [])

  const refreshUser = useCallback(async () => {
    const storedUser = await getUser()
    if (storedUser) setUser(storedUser)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ isReady, isAuthenticated, user, login, logout, refreshUser }),
    [isReady, isAuthenticated, user, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Access auth state from any component.
 * Must be used inside `<AuthProvider>`.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
