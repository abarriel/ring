import { ToastProvider } from '@ring/ui'
import { QueryClientProvider } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ErrorBoundary } from '@/components/error-boundary'
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <Stack>
              <Stack.Screen name="index" options={{ title: 'Ring' }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="swipe" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
          </ToastProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
