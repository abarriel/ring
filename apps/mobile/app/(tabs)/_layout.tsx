import { Heart, Home, Sparkles, theme, User } from '@ring/ui'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function TabLayout() {
  const { t } = useTranslation()

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
          title: t('tabs.browse'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          tabBarAccessibilityLabel: t('tabs.browseA11y'),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
          tabBarAccessibilityLabel: t('tabs.favoritesA11y'),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t('tabs.matches'),
          tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
          tabBarAccessibilityLabel: t('tabs.matchesA11y'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          tabBarAccessibilityLabel: t('tabs.profileA11y'),
        }}
      />
    </Tabs>
  )
}
