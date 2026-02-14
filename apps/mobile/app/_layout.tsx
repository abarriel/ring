import { ToastProvider } from '@ring/ui'
import { QueryClientProvider } from '@tanstack/react-query'
import { router as expoRouter, Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ErrorBoundary } from '@/components/error-boundary'
import { getToken } from '@/lib/auth'
import {
  addNotificationResponseListener,
  getNotificationScreen,
  registerForPushNotifications,
} from '@/lib/notifications'
import { queryClient } from '@/lib/query-client'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after a short delay to allow first render
    const timer = setTimeout(() => {
      SplashScreen.hideAsync()
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Register for push notifications after login
  useEffect(() => {
    let cancelled = false

    async function setup() {
      const token = await getToken()
      if (token && !cancelled) {
        registerForPushNotifications()
      }
    }
    setup()

    return () => {
      cancelled = true
    }
  }, [])

  // Handle notification taps -> navigate to the correct screen
  useEffect(() => {
    return addNotificationResponseListener((response) => {
      const screen = getNotificationScreen(response)
      if (screen === 'matches') {
        expoRouter.push('/matches')
      } else if (screen === 'profile') {
        expoRouter.push('/profile')
      }
    })
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen
                name="ring/[id]"
                options={{ headerShown: false, presentation: 'card' }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ToastProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
