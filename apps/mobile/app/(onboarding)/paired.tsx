import { CheckCircle, Heart, theme } from '@ring/ui'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function PairedScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.centerContent}>
        {/* Success icon */}
        <View style={styles.iconCircle}>
          <Heart size={32} color={theme.colors.foreground.inverse} fill="#ffffff" />
        </View>

        {/* Checkmark badge */}
        <View style={styles.checkBadge}>
          <CheckCircle size={24} color={theme.colors.feedback.success.text} />
        </View>

        {/* Heading */}
        <Text style={styles.heading} accessibilityRole="header">
          {t('paired.heading')}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{t('paired.subtitle')}</Text>
      </View>

      {/* CTA */}
      <View style={styles.bottomSection}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.replace('/')}
          accessibilityLabel={t('paired.cta')}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{t('paired.cta')}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
    paddingHorizontal: theme.spacing.page,
  },

  // Center content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  // Icon
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkBadge: {
    marginTop: -24,
    marginLeft: 48,
  },

  // Heading
  heading: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    lineHeight: theme.lineHeights['3xl'],
    marginTop: 8,
  },

  // Subtitle
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.secondary,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 280,
  },

  // Bottom
  bottomSection: {
    paddingBottom: 16,
  },
  ctaButton: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.inverse,
  },
})
