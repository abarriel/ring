import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="preferences" />
      <Stack.Screen name="pair" />
      <Stack.Screen name="paired" />
    </Stack>
  )
}
