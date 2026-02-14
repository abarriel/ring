import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { getToken } from '@/lib/auth'
import { client } from '@/lib/orpc'

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Request push notification permissions and register the Expo push token
 * with the API. Should be called after the user logs in.
 *
 * Returns the push token string or null if unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ec4899',
    })
  }

  const tokenData = await Notifications.getExpoPushTokenAsync()
  const pushToken = tokenData.data

  // Register with the API if authenticated
  const authToken = await getToken()
  if (authToken && pushToken) {
    try {
      await client.user.registerPushToken({ token: pushToken })
    } catch {
      // Silently fail — token registration is best-effort
    }
  }

  return pushToken
}

/**
 * Add a listener for when the user taps a notification.
 * Returns a cleanup function to remove the listener.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler)
  return () => subscription.remove()
}

/**
 * Extract the target screen from a notification's data payload.
 */
export function getNotificationScreen(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data
  return (data?.screen as string) ?? null
}
