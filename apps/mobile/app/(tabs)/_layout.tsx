import { Heart, Home, Sparkles, theme, User } from '@ring/ui'
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
          title: 'Browse',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          tabBarAccessibilityLabel: 'Parcourir les bagues',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
          tabBarAccessibilityLabel: 'Voir les favoris',
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matchs',
          tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
          tabBarAccessibilityLabel: 'Voir les matchs',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          tabBarAccessibilityLabel: 'Voir le profil',
        }}
      />
    </Tabs>
  )
}
