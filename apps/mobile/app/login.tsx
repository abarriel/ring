import { ArrowRight, Heart, theme } from '@ring/ui'
import { useMutation } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
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
import { saveToken, saveUser } from '@/lib/auth'
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

const STEPS = [
  {
    title: 'Parcours les bagues',
    subtitle: 'Swipe parmi une selection de bagues',
  },
  {
    title: 'Like tes favoris',
    subtitle: 'Sauvegarde les bagues qui te plaisent',
  },
  {
    title: 'Trouve des matchs',
    subtitle: 'Decouvre quand vous aimez la meme bague',
  },
]

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<'welcome' | 'details'>('welcome')
  const [name, setName] = useState('')
  const [partnerCode, setPartnerCode] = useState('')

  const loginMutation = useMutation({
    mutationFn: (input: { name: string }) => client.auth.login(input),
    onSuccess: async (result) => {
      await saveUser(result.user)
      await saveToken(result.sessionToken)
      await replayAnonymousSwipes()
      // Register for push notifications after login (best-effort, non-blocking)
      registerForPushNotifications()
      router.replace('/')
    },
  })

  const handleStart = () => {
    setStep('details')
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
          <LinearGradient
            colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
            style={styles.logo}
          >
            <Heart size={48} color="#ffffff" fill="#ffffff" />
          </LinearGradient>

          <Text style={styles.title}>Ring</Text>
          <Text style={styles.subtitle}>
            Swipe parmi de superbes bagues et trouve le match parfait avec ton partenaire
          </Text>

          {/* Feature steps */}
          <View style={styles.stepsContainer}>
            {STEPS.map((s, i) => (
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
            colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
            style={styles.ctaGradient}
          >
            <Pressable
              style={styles.ctaBtn}
              onPress={handleStart}
              accessibilityLabel="C'est parti"
              accessibilityRole="button"
            >
              <Text style={styles.ctaBtnText}>C'est parti</Text>
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
          {/* Header */}
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Faisons connaissance</Text>
            <Text style={styles.detailsSubtitle}>Parle-nous un peu de toi</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ton pseudo</Text>
              <TextInput
                style={styles.input}
                placeholder="Entre ton pseudo"
                placeholderTextColor={theme.colors.foreground.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Ton pseudo"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Code partenaire (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Entre le code de ton partenaire"
                placeholderTextColor={theme.colors.foreground.muted}
                value={partnerCode}
                onChangeText={(text) => setPartnerCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                accessibilityLabel="Code partenaire"
              />
              <Text style={styles.fieldHint}>
                Partage ton code avec ton partenaire pour matcher sur les memes bagues
              </Text>
            </View>
          </View>

          {/* Submit */}
          <LinearGradient
            colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
            style={styles.ctaGradient}
          >
            <Pressable
              style={[styles.ctaBtn, disabled && styles.ctaBtnDisabled]}
              onPress={handleSubmit}
              disabled={disabled}
              accessibilityLabel="Continuer"
              accessibilityRole="button"
            >
              <Text style={styles.ctaBtnText}>
                {loginMutation.isPending ? 'Connexion...' : 'Continuer'}
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
    color: theme.colors.ring.pink500,
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

  // Form
  formContainer: {
    flex: 1,
    gap: 24,
    marginBottom: 32,
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
})
