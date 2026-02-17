import { theme, X } from '@ring/ui'
import { router as expoRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export function SwipeGate({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useTranslation()

  return (
    <View style={styles.overlay} accessibilityLabel={t('swipeGate.a11y')}>
      <View style={styles.card}>
        {onDismiss && (
          <Pressable
            style={styles.closeBtn}
            onPress={onDismiss}
            accessibilityLabel={t('common.close')}
            accessibilityRole="button"
          >
            <X size={20} color={theme.colors.foreground.muted} />
          </Pressable>
        )}
        <Text style={styles.title} accessibilityRole="header">
          {t('swipeGate.title')}
        </Text>
        <Text style={styles.subtitle}>{t('swipeGate.subtitle')}</Text>
        <Pressable
          style={styles.ctaBtn}
          onPress={() => expoRouter.push('/(auth)/signup')}
          accessibilityLabel={t('common.signUp')}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{t('common.signUp')}</Text>
        </Pressable>
        {onDismiss && (
          <Pressable
            style={styles.laterBtn}
            onPress={onDismiss}
            accessibilityLabel={t('swipeGate.later')}
            accessibilityRole="button"
          >
            <Text style={styles.laterText}>{t('swipeGate.later')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: theme.spacing.page,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.foreground.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  ctaBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  laterBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 14,
    color: theme.colors.foreground.muted,
  },
})
