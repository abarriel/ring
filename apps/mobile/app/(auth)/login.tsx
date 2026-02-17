import { ChevronLeft, theme } from '@ring/ui'
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
      // Skip failures
    }
  }
  await clearAnonymousSwipes()
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { login } = useAuth()
  const { t } = useTranslation()
  const [name, setName] = useState('')

  const loginMutation = useMutation({
    mutationFn: (input: { name: string }) => client.auth.login(input),
    onSuccess: async (result) => {
      await login(result.user, result.sessionToken)
      await replayAnonymousSwipes()
      registerForPushNotifications()
      router.replace('/')
    },
  })

  const disabled = loginMutation.isPending || !name.trim()

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    loginMutation.mutate({ name: trimmed })
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
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={theme.colors.foreground.DEFAULT} />
        </Pressable>

        {/* Heading */}
        <View style={styles.headingSection}>
          <Text style={styles.heading} accessibilityRole="header">
            {t('login.heading')}
          </Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('login.nameLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('login.namePlaceholder')}
              placeholderTextColor={theme.colors.foreground.placeholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              accessibilityLabel={t('login.nameLabel')}
            />
          </View>
        </View>

        {/* Error */}
        {loginMutation.isError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {loginMutation.error?.message ?? t('login.errorFallback')}
            </Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={disabled}
          accessibilityLabel={t('login.submit')}
          accessibilityRole="button"
        >
          <Text style={styles.submitText}>
            {loginMutation.isPending ? t('login.submitting') : t('login.submit')}
          </Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('login.noAccount')} </Text>
          <Pressable
            onPress={() => router.push('/(auth)/signup')}
            accessibilityLabel={t('login.signupLink')}
            accessibilityRole="link"
          >
            <Text style={styles.footerLink}>{t('login.signupLink')}</Text>
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

  // Back
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.cardTranslucent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Heading
  headingSection: {
    gap: 8,
    paddingTop: 16,
  },
  heading: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.DEFAULT,
    lineHeight: theme.lineHeights['3xl'],
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.muted,
    lineHeight: theme.lineHeights.md,
  },

  // Form
  formCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    gap: 24,
    ...theme.shadows.sm,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.DEFAULT,
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
