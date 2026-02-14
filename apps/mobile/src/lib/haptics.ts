import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

const isNative = Platform.OS === 'ios' || Platform.OS === 'android'

export function hapticLight() {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

export function hapticMedium() {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
}

export function hapticHeavy() {
  if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
}

export function hapticSuccess() {
  if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}
