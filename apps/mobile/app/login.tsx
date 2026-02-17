import { ArrowRight, ChevronLeft, Heart, theme } from '@ring/ui'
import { useMutation } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import type { TFunction } from 'i18next'
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
      // Skip failures (e.g., ring deleted, duplicate) — continue with remaining
    }
  }
  await clearAnonymousSwipes()
}

function getSteps(t: TFunction) {
  return [
    {
      title: t('login.onboarding.step1.title'),
      subtitle: t('login.onboarding.step1.subtitle'),
    },
    {
      title: t('login.onboarding.step2.title'),
      subtitle: t('login.onboarding.step2.subtitle'),
    },
    {
      title: t('login.onboarding.step3.title'),
      subtitle: t('login.onboarding.step3.subtitle'),
    },
  ]
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { login } = useAuth()
  const { t } = useTranslation()
  const steps = getSteps(t)
  const [step, setStep] = useState<'welcome' | 'details'>('welcome')
  const [name, setName] = useState('')
  const [partnerCode, setPartnerCode] = useState('')

  const loginMutation = useMutation({
    mutationFn: (input: { name: string; partnerCode?: string }) => client.auth.login(input),
    onSuccess: async (result) => {
      await login(result.user, result.sessionToken)
      await replayAnonymousSwipes()

      // Auto-join couple if partner code was provided
      const code = partnerCode.trim().toUpperCase()
      if (code.length === 6) {
        try {
          await client.couple.join({ code })
        } catch {
          // Silently fail — user can join later from profile
        }
      }

      // Register for push notifications after login (best-effort, non-blocking)
      registerForPushNotifications()
      router.replace('/')
    },
  })

  const handleStart = () => {
    setStep('details')
  }

  const handleBack = () => {
    setStep('welcome')
    loginMutation.reset()
  }

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    loginMutation.mutate({ name: trimmed })
  }

  const disabled = loginMutation.isPending || !name.trim()

  if (step === 'welcome') {
    return (
      <LinearGradient colors={['#fff1f2', '#fce7f3']} style={styles.gradient}>
        <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Animated logo */}
          <LinearGradient colors={[theme.colors.primary, theme.colors.primary]} style={styles.logo}>
            <Heart size={48} color="#ffffff" fill="#ffffff" />
          </LinearGradient>

          <Text style={styles.title}>{t('common.appName')}</Text>
          <Text style={styles.subtitle}>{t('login.welcome.subtitle')}</Text>

          {/* Feature steps */}
          <View style={styles.stepsContainer}>
            {steps.map((s, i) => (
              <View key={s.title} style={styles.stepRow}>
                <LinearGradient colors={['#fce7f3', '#fce7f3']} style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                </LinearGradient>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepSubtitle}>{s.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primary]}
            style={styles.ctaGradient}
          >
            <Pressable
              style={styles.ctaBtn}
              onPress={handleStart}
              accessibilityLabel={t('login.welcome.cta')}
              accessibilityRole="button"
            >
              <Text style={styles.ctaBtnText}>{t('login.welcome.cta')}</Text>
              <ArrowRight size={20} color="#ffffff" />
            </Pressable>
          </LinearGradient>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={['#fff1f2', '#fce7f3']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.detailsContent,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back + Header */}
          <Pressable
            style={styles.backBtn}
            onPress={handleBack}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
          >
            <ChevronLeft size={24} color={theme.colors.foreground.DEFAULT} />
            <Text style={styles.backBtnText}>{t('common.back')}</Text>
          </Pressable>

          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>{t('login.details.title')}</Text>
            <Text style={styles.detailsSubtitle}>{t('login.details.subtitle')}</Text>
          </View>

          {/* Form card (matching mockup white card container) */}
          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('login.details.nameLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('login.details.namePlaceholder')}
                placeholderTextColor={theme.colors.foreground.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t('login.details.nameLabel')}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('login.details.partnerCodeLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('login.details.partnerCodePlaceholder')}
                placeholderTextColor={theme.colors.foreground.muted}
                value={partnerCode}
                onChangeText={(text) => setPartnerCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                accessibilityLabel={t('login.details.partnerCodeA11y')}
              />
              <Text style={styles.fieldHint}>{t('login.details.partnerCodeHint')}</Text>
            </View>
          </View>

          {/* Error message */}
          {loginMutation.isError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {loginMutation.error?.message ?? t('login.details.errorFallback')}
              </Text>
            </View>
          )}

          {/* Submit */}
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primary]}
            style={styles.ctaGradient}
          >
            <Pressable
              style={[styles.ctaBtn, disabled && styles.ctaBtnDisabled]}
              onPress={handleSubmit}
              disabled={disabled}
              accessibilityLabel={t('login.details.submit')}
              accessibilityRole="button"
            >
              <Text style={styles.ctaBtnText}>
                {loginMutation.isPending
                  ? t('login.details.submitting')
                  : t('login.details.submit')}
              </Text>
              <ArrowRight size={20} color="#ffffff" />
            </Pressable>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.page,
  },

  // Welcome step
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.foreground.secondary,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 320,
    lineHeight: 22,
  },

  // Feature steps
  stepsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 13,
    color: theme.colors.foreground.secondary,
  },

  // CTA button
  ctaGradient: {
    width: '100%',
    borderRadius: theme.borderRadius.md,
  },
  ctaBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: theme.borderRadius.md,
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Details step
  detailsContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.page,
  },
  detailsHeader: {
    marginBottom: 32,
  },
  detailsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 4,
  },
  detailsSubtitle: {
    fontSize: 15,
    color: theme.colors.foreground.secondary,
  },

  // Form card
  formCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    gap: 24,
    marginBottom: 32,
    ...theme.shadows.lg,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground.DEFAULT,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.colors.foreground.DEFAULT,
    backgroundColor: theme.colors.background.card,
  },
  fieldHint: {
    fontSize: 12,
    color: theme.colors.foreground.muted,
  },

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 15,
    color: theme.colors.foreground.DEFAULT,
  },

  // Error
  errorContainer: {
    backgroundColor: theme.colors.feedback.error.bg,
    borderWidth: 1,
    borderColor: theme.colors.feedback.error.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.feedback.error.text,
    textAlign: 'center',
  },
})
