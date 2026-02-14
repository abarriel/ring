import Expo, { type ExpoPushMessage } from 'expo-server-sdk'
import { logger } from './logger.js'

const expo = new Expo()

type PushPayload = {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Send push notifications to one or more Expo push tokens.
 * Silently skips invalid tokens and logs errors without throwing.
 */
export async function sendPushNotifications(payloads: PushPayload[]): Promise<void> {
  const messages: ExpoPushMessage[] = payloads
    .filter((p) => Expo.isExpoPushToken(p.token))
    .map((p) => ({
      to: p.token,
      sound: 'default' as const,
      title: p.title,
      body: p.body,
      data: p.data,
    }))

  if (messages.length === 0) return

  const chunks = expo.chunkPushNotifications(messages)

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk)
      for (const receipt of receipts) {
        if (receipt.status === 'error') {
          logger.error(`Push notification error: ${receipt.message}`)
        }
      }
    } catch (error) {
      logger.error(`Failed to send push notifications: ${error}`)
    }
  }
}

/**
 * Notify partner that someone joined their couple.
 */
export async function notifyPartnerJoined(
  inviterPushToken: string | null,
  partnerName: string,
): Promise<void> {
  if (!inviterPushToken) return

  await sendPushNotifications([
    {
      token: inviterPushToken,
      title: 'Couple forme !',
      body: `${partnerName} a rejoint ton couple !`,
      data: { screen: 'profile' },
    },
  ])
}

/**
 * Notify both partners about a new match.
 */
export async function notifyNewMatch(tokens: (string | null)[], ringName: string): Promise<void> {
  const payloads = tokens
    .filter((t): t is string => t !== null)
    .map((token) => ({
      token,
      title: "C'est un match !",
      body: `Vous aimez tous les deux ${ringName}`,
      data: { screen: 'matches' },
    }))

  if (payloads.length > 0) {
    await sendPushNotifications(payloads)
  }
}
