import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

const isNative = Platform.OS === 'ios' || Platform.OS === 'android'

export async function hapticLight() {
  if (isNative) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

export async function hapticMedium() {
  if (isNative) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
}

export async function hapticHeavy() {
  if (isNative) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
}

export async function hapticSuccess() {
  if (isNative) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}
