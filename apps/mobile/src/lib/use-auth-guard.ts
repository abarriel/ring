import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { getToken } from '@/lib/auth'

/**
 * Hook that checks if the user is authenticated.
 * If not, redirects to the login screen.
 * Returns `true` when the user is confirmed authenticated.
 */
export function useAuthGuard(): boolean {
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        setIsAuthed(true)
      } else {
        router.replace('/login')
      }
    })
  }, [])

  return isAuthed
}
