import { Diamond, Heart, Sparkles, theme } from '@ring/ui'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80'

const FEATURES = [
  { icon: Sparkles, labelKey: 'welcome.features.curated' },
  { icon: Diamond, labelKey: 'welcome.features.certified' },
  { icon: Heart, labelKey: 'welcome.features.conflictFree' },
] as const

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.headerTitle} accessibilityRole="header">
        {t('common.appName')}
      </Text>

      {/* Hero image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: HERO_IMAGE }}
          style={styles.heroImage}
          contentFit="cover"
          transition={200}
          accessibilityLabel={t('welcome.heroA11y')}
        />
      </View>

      {/* Heading */}
      <Text style={styles.heading} accessibilityRole="header">
        {t('welcome.heading')}
      </Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>

      {/* CTA button */}
      <Pressable
        style={styles.ctaButton}
        onPress={() => router.push('/(auth)/signup')}
        accessibilityLabel={t('welcome.cta')}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>{t('welcome.cta')}</Text>
      </Pressable>

      {/* Log In link */}
      <Pressable
        onPress={() => router.push('/(auth)/login')}
        accessibilityLabel={t('welcome.login')}
        accessibilityRole="link"
      >
        <Text style={styles.loginLink}>{t('welcome.login')}</Text>
      </Pressable>

      {/* Feature badges */}
      <View style={styles.featuresSection}>
        {FEATURES.map(({ icon: Icon, labelKey }) => (
          <View key={labelKey} style={styles.featureBadge}>
            <View style={styles.featureIconContainer}>
              <Icon size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureLabel}>{t(labelKey)}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>{t('welcome.copyright')}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },
  content: {
    paddingHorizontal: theme.spacing.page,
    alignItems: 'center',
    gap: 24,
  },

  // Header
  headerTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
  },

  // Hero
  heroContainer: {
    width: '100%',
    height: 320,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // Heading
  heading: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    lineHeight: theme.lineHeights['4xl'],
  },

  // Subtitle
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.secondary,
    textAlign: 'center',
    lineHeight: 29,
  },

  // CTA
  ctaButton: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  ctaText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.inverse,
  },

  // Login link
  loginLink: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.muted,
    textDecorationLine: 'underline',
  },

  // Features
  featuresSection: {
    width: '100%',
    gap: 16,
    paddingTop: 16,
  },
  featureBadge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.cardTranslucent,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.xs,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.DEFAULT,
    marginLeft: 12,
  },

  // Footer
  footer: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.tertiary,
    textAlign: 'center',
  },
})
