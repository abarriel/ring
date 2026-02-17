import { Diamond, theme } from '@ring/ui'
import { useMutation } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { clearAnonymousSwipes, getAnonymousSwipes } from '@/lib/anonymous-swipes'
import { useAuth } from '@/lib/auth-context'
import { registerForPushNotifications } from '@/lib/notifications'
import { client } from '@/lib/orpc'

async function replayAnonymousSwipes() {
  const swipes = await getAnonymousSwipes()
  for (const swipe of swipes) {
    try {
      await client.swipe.create({ ringId: swipe.ringId, direction: swipe.direction })
    } catch {
      // Skip failures (e.g., ring deleted, duplicate)
    }
  }
  await clearAnonymousSwipes()
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets()
  const { login } = useAuth()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  const signupMutation = useMutation({
    mutationFn: (input: { name: string }) => client.auth.login(input),
    onSuccess: async (result) => {
      await login(result.user, result.sessionToken)
      await replayAnonymousSwipes()
      registerForPushNotifications()
      router.replace('/(onboarding)/preferences')
    },
  })

  const disabled = signupMutation.isPending || !name.trim() || !termsAccepted

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed || !termsAccepted) return
    signupMutation.mutate({ name: trimmed })
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Diamond icon */}
        <View style={styles.iconRow}>
          <Diamond size={24} color={theme.colors.primary} />
        </View>

        {/* Heading */}
        <Text style={styles.heading} accessibilityRole="header">
          {t('signup.heading')}
        </Text>

        {/* OAuth buttons */}
        <View style={styles.oauthSection}>
          <Pressable
            style={styles.googleButton}
            accessibilityLabel={t('signup.google')}
            accessibilityRole="button"
          >
            <Text style={styles.googleText}>{t('signup.google')}</Text>
          </Pressable>

          <Pressable
            style={styles.appleButton}
            accessibilityLabel={t('signup.apple')}
            accessibilityRole="button"
          >
            <Text style={styles.appleText}>{t('signup.apple')}</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('signup.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Form fields */}
        <View style={styles.formSection}>
          <TextInput
            style={styles.input}
            placeholder={t('signup.namePlaceholder')}
            placeholderTextColor={theme.colors.foreground.placeholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel={t('signup.namePlaceholder')}
          />

          <TextInput
            style={styles.input}
            placeholder={t('signup.emailPlaceholder')}
            placeholderTextColor={theme.colors.foreground.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('signup.emailPlaceholder')}
          />

          {/* Terms checkbox */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            accessibilityLabel={t('signup.termsA11y')}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted }}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              {t('signup.termsPrefix')}{' '}
              <Text style={styles.termsLink}>{t('signup.termsLink')}</Text>
            </Text>
          </Pressable>
        </View>

        {/* Error */}
        {signupMutation.isError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {signupMutation.error?.message ?? t('signup.errorFallback')}
            </Text>
          </View>
        )}

        {/* Sign Up button */}
        <Pressable
          style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={disabled}
          accessibilityLabel={t('signup.submit')}
          accessibilityRole="button"
        >
          <Text style={styles.submitText}>
            {signupMutation.isPending ? t('signup.submitting') : t('signup.submit')}
          </Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('signup.hasAccount')} </Text>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            accessibilityLabel={t('signup.loginLink')}
            accessibilityRole="link"
          >
            <Text style={styles.footerLink}>{t('signup.loginLink')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },
  content: {
    paddingHorizontal: theme.spacing.page,
    gap: 24,
  },

  // Icon
  iconRow: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 8,
  },

  // Heading
  heading: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    lineHeight: theme.lineHeights['3xl'],
    marginBottom: 8,
  },

  // OAuth
  oauthSection: {
    gap: 16,
  },
  googleButton: {
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.xs,
  },
  googleText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.DEFAULT,
  },
  appleButton: {
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.ui.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.inverse,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.ui.divider,
  },
  dividerText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.tertiary,
    paddingHorizontal: 16,
  },

  // Form
  formSection: {
    gap: 24,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 17,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.DEFAULT,
    backgroundColor: theme.colors.background.card,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.colors.ui.checkbox,
    borderRadius: 2.5,
    backgroundColor: theme.colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    fontSize: 12,
    color: theme.colors.foreground.inverse,
    fontWeight: theme.fontWeights.bold,
  },
  termsText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.DEFAULT,
    lineHeight: 22.75,
  },
  termsLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },

  // Error
  errorContainer: {
    backgroundColor: theme.colors.feedback.error.bg,
    borderWidth: 1,
    borderColor: theme.colors.feedback.error.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
  },
  errorText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.feedback.error.text,
    textAlign: 'center',
  },

  // Submit
  submitButton: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.inverse,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.DEFAULT,
  },
  footerLink: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
})
