import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { getToken } from '@/lib/auth'

/**
 * Hook that checks if the user is authenticated.
 * If not, redirects to the login screen.
 * Uses a module-level ref to prevent multiple tabs from racing to redirect.
 * Returns `true` when the user is confirmed authenticated.
 */
let isRedirecting = false

export function useAuthGuard(): boolean {
  const [isAuthed, setIsAuthed] = useState(false)
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return
    checked.current = true

    getToken().then((token) => {
      if (token) {
        setIsAuthed(true)
      } else if (!isRedirecting) {
        isRedirecting = true
        router.replace('/(auth)/welcome')
        // Reset after navigation settles
        setTimeout(() => {
          isRedirecting = false
        }, 500)
      }
    })
  }, [])

  return isAuthed
}
