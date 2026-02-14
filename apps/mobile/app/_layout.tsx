import { ToastProvider } from '@ring/ui'
import { QueryClientProvider } from '@tanstack/react-query'
import { router as expoRouter, Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ErrorBoundary } from '@/components/error-boundary'
import '@/i18n'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import {
  addNotificationResponseListener,
  getNotificationScreen,
  registerForPushNotifications,
} from '@/lib/notifications'
import { queryClient } from '@/lib/query-client'

SplashScreen.preventAutoHideAsync()

function AppContent() {
  const { isReady, isAuthenticated } = useAuth()

  // Register for push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications()
    }
  }, [isAuthenticated])

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

  // Don't render routes until auth state is resolved
  if (!isReady) return null

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="ring/[id]" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
