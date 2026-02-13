import { Heart, Star, theme } from '@ring/ui'
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.ring.pink500,
        tabBarInactiveTintColor: theme.colors.foreground.muted,
        tabBarStyle: {
          borderTopColor: theme.colors.ui.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Swipe',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ color, size }) => <Star size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
