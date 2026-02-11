import '../global.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { getUser } from '@/lib/auth'
import { queryClient } from '@/lib/query-client'

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    getUser().then((user) => {
      setIsLoggedIn(!!user)
      setIsReady(true)
    })
  }, [])

  useEffect(() => {
    if (!isReady) return
    if (!isLoggedIn) {
      router.replace('/login')
    }
  }, [isReady, isLoggedIn])

  if (!isReady) return null

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Ring' }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  )
}
