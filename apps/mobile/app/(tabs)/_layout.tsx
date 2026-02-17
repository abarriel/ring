import { Gem, Heart, theme, User } from '@ring/ui'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function TabLayout() {
  const { t } = useTranslation()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.ui.navActive,
        tabBarInactiveTintColor: theme.colors.ui.navInactive,
        tabBarStyle: {
          borderTopColor: theme.colors.ui.tabBarBorder,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.rings'),
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
          tabBarAccessibilityLabel: t('tabs.ringsA11y'),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t('tabs.matches'),
          tabBarIcon: ({ color, size }) => <Gem size={size} color={color} />,
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
      {/* Hide favorites from tab bar - route file still exists for backward compat */}
      <Tabs.Screen
        name="favorites"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}
