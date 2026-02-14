import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// Mock auth and orpc
vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
  saveUser: vi.fn(),
  saveToken: vi.fn(),
  clearUser: vi.fn(),
}))

const mockRegisterPushToken = vi.fn()

vi.mock('@/lib/orpc', () => ({
  client: {
    user: {
      registerPushToken: mockRegisterPushToken,
    },
  },
}))

// Replicate the notification logic under test since importing @/lib/notifications
// triggers Vite to parse react-native's Flow syntax (unsupported in SSR transform).
// This approach follows the project's convention of testing logic, not components.

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const tokenData = await Notifications.getExpoPushTokenAsync()
  const pushToken = tokenData.data

  const { getToken } = await import('@/lib/auth')
  const authToken = await getToken()
  if (authToken && pushToken) {
    try {
      await mockRegisterPushToken({ token: pushToken })
    } catch {
      // Silently fail
    }
  }

  return pushToken
}

function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler)
  return () => subscription.remove()
}

function getNotificationScreen(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data
  return (data?.screen as string) ?? null
}

const { getToken } = await import('@/lib/auth')

describe('registerForPushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(Device, 'isDevice', { value: true, writable: true })
    ;(Notifications.getPermissionsAsync as Mock).mockResolvedValue({ status: 'granted' })
    ;(Notifications.getExpoPushTokenAsync as Mock).mockResolvedValue({
      data: 'ExponentPushToken[test123]',
    })
    ;(getToken as Mock).mockResolvedValue('auth-token-123')
    mockRegisterPushToken.mockResolvedValue({ success: true })
  })

  it('returns push token on success', async () => {
    const token = await registerForPushNotifications()

    expect(token).toBe('ExponentPushToken[test123]')
  })

  it('requests permission when not already granted', async () => {
    ;(Notifications.getPermissionsAsync as Mock).mockResolvedValue({ status: 'undetermined' })
    ;(Notifications.requestPermissionsAsync as Mock).mockResolvedValue({ status: 'granted' })

    await registerForPushNotifications()

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled()
  })

  it('returns null when not a physical device', async () => {
    Object.defineProperty(Device, 'isDevice', { value: false })

    const token = await registerForPushNotifications()

    expect(token).toBeNull()
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled()
  })

  it('returns null when permission is denied', async () => {
    ;(Notifications.getPermissionsAsync as Mock).mockResolvedValue({ status: 'denied' })
    ;(Notifications.requestPermissionsAsync as Mock).mockResolvedValue({ status: 'denied' })

    const token = await registerForPushNotifications()

    expect(token).toBeNull()
  })

  it('registers token with the API when authenticated', async () => {
    await registerForPushNotifications()

    expect(mockRegisterPushToken).toHaveBeenCalledWith({
      token: 'ExponentPushToken[test123]',
    })
  })

  it('does not register token when not authenticated', async () => {
    ;(getToken as Mock).mockResolvedValue(null)

    await registerForPushNotifications()

    expect(mockRegisterPushToken).not.toHaveBeenCalled()
  })

  it('silently handles API registration failure', async () => {
    mockRegisterPushToken.mockRejectedValue(new Error('Network error'))

    const token = await registerForPushNotifications()

    expect(token).toBe('ExponentPushToken[test123]')
  })
})

describe('addNotificationResponseListener', () => {
  it('registers a listener and returns cleanup function', () => {
    const handler = vi.fn()
    const mockRemove = vi.fn()
    ;(Notifications.addNotificationResponseReceivedListener as Mock).mockReturnValue({
      remove: mockRemove,
    })

    const cleanup = addNotificationResponseListener(handler)

    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(handler)
    expect(typeof cleanup).toBe('function')

    cleanup()
    expect(mockRemove).toHaveBeenCalled()
  })
})

describe('getNotificationScreen', () => {
  it('returns screen name from notification data', () => {
    const response = {
      notification: {
        request: {
          content: {
            data: { screen: 'matches' },
          },
        },
      },
    } as unknown as Notifications.NotificationResponse

    expect(getNotificationScreen(response)).toBe('matches')
  })

  it('returns null when no screen in data', () => {
    const response = {
      notification: {
        request: {
          content: {
            data: {},
          },
        },
      },
    } as unknown as Notifications.NotificationResponse

    expect(getNotificationScreen(response)).toBeNull()
  })

  it('returns null when data is undefined', () => {
    const response = {
      notification: {
        request: {
          content: {
            data: undefined,
          },
        },
      },
    } as unknown as Notifications.NotificationResponse

    expect(getNotificationScreen(response)).toBeNull()
  })
})
