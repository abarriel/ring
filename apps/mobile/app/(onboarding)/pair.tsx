import { ChevronLeft, Clipboard, Heart, theme, useToast } from '@ring/ui'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as ExpoClipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TextInput as TextInputRef } from 'react-native'
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-context'
import { hapticSuccess } from '@/lib/haptics'
import { client, orpc } from '@/lib/orpc'

const CODE_LENGTH = 6

export default function PairScreen() {
  const insets = useSafeAreaInsets()
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const [joinCode, setJoinCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const inputRefs = useRef<(TextInputRef | null)[]>([])

  // Fetch existing couple
  const coupleQuery = useQuery({
    ...orpc.couple.get.queryOptions(),
    enabled: isAuthenticated,
  })

  // Create couple (generate code)
  const createMutation = useMutation({
    mutationFn: () => client.couple.create(),
    onSuccess: () => {
      coupleQuery.refetch()
      hapticSuccess()
    },
  })

  // Join couple
  const joinMutation = useMutation({
    mutationFn: (code: string) => client.couple.join({ code }),
    onSuccess: () => {
      hapticSuccess()
      router.replace('/(onboarding)/paired')
    },
    onError: (error) => {
      toast.show({
        type: 'error',
        title: t('pair.toast.joinErrorTitle'),
        message: error.message,
      })
    },
  })

  const couple = coupleQuery.data
  const code = couple?.code ?? ''
  const formattedCode = code ? `${code.slice(0, 2)} ${code.slice(2, 4)} ${code.slice(4, 6)}` : ''

  const handleCreateCode = () => {
    createMutation.mutate()
  }

  const handleCopy = async () => {
    if (!code) return
    await ExpoClipboard.setStringAsync(code)
    toast.show({ type: 'success', title: t('pair.toast.copied') })
  }

  const handleShare = async () => {
    if (!code) return
    await Share.share({
      message: t('pair.shareMessage', { code }),
    })
  }

  const handleJoinCodeChange = (text: string, index: number) => {
    const char = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const newCode = [...joinCode]
    newCode[index] = char
    setJoinCode(newCode)

    // Auto-advance to next input
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleJoinCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !joinCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleJoin = () => {
    const fullCode = joinCode.join('')
    if (fullCode.length !== CODE_LENGTH) {
      toast.show({
        type: 'error',
        title: t('pair.toast.codeLengthTitle'),
        message: t('pair.toast.codeLengthMessage'),
      })
      return
    }
    joinMutation.mutate(fullCode)
  }

  const handleSkip = () => {
    router.replace('/')
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <ChevronLeft size={14} color={theme.colors.foreground.DEFAULT} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('common.appName')}</Text>
      </View>

      {/* Illustration */}
      <View style={styles.illustration}>
        <View style={styles.phoneMock}>
          <View style={styles.phoneGradient} />
        </View>
        <View style={styles.heartCircle}>
          <Heart size={14} color={theme.colors.foreground.inverse} fill="#ffffff" />
        </View>
        <View style={styles.phoneMock}>
          <View style={styles.phoneGradient} />
        </View>
      </View>

      {/* Heading */}
      <View style={styles.headingSection}>
        <Text style={styles.heading} accessibilityRole="header">
          {t('pair.heading')}
        </Text>
        <Text style={styles.subtitle}>{t('pair.subtitle')}</Text>
      </View>

      {/* Pairing code card */}
      <View style={styles.codeCard}>
        {code ? (
          <>
            <Text style={styles.codeLabel}>{t('pair.codeLabel')}</Text>
            <Text style={styles.codeDisplay} accessibilityLabel={t('pair.codeA11y', { code })}>
              {formattedCode}
            </Text>
            <View style={styles.codeActions}>
              <Pressable
                style={styles.copyButton}
                onPress={handleCopy}
                accessibilityLabel={t('pair.copyA11y')}
                accessibilityRole="button"
              >
                <Clipboard size={14} color={theme.colors.foreground.inverse} />
                <Text style={styles.copyButtonText}>{t('pair.copy')}</Text>
              </Pressable>
              <Pressable
                style={styles.shareButton}
                onPress={handleShare}
                accessibilityLabel={t('pair.shareA11y')}
                accessibilityRole="button"
              >
                <Text style={styles.shareButtonText}>{t('pair.share')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            style={styles.generateButton}
            onPress={handleCreateCode}
            disabled={createMutation.isPending}
            accessibilityLabel={t('pair.generate')}
            accessibilityRole="button"
          >
            <Text style={styles.generateText}>
              {createMutation.isPending ? t('pair.generating') : t('pair.generate')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('pair.orJoin')}</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Join section */}
      <View style={styles.joinSection}>
        <Text style={styles.joinLabel}>{t('pair.enterCode')}</Text>

        <View style={styles.codeInputRow}>
          {['pos-1', 'pos-2', 'pos-3', 'pos-4', 'pos-5', 'pos-6'].map((posKey, i) => (
            <View key={posKey} style={styles.codeInputWrapper}>
              {i === 2 || i === 4 ? <View style={styles.codeDot} /> : null}
              <TextInput
                ref={(ref) => {
                  inputRefs.current[i] = ref
                }}
                style={styles.codeInput}
                value={joinCode[i]}
                onChangeText={(text) => handleJoinCodeChange(text, i)}
                onKeyPress={({ nativeEvent }) => handleJoinCodeKeyPress(nativeEvent.key, i)}
                maxLength={1}
                autoCapitalize="characters"
                keyboardType="default"
                accessibilityLabel={`${t('pair.codeDigitA11y')} ${i + 1}`}
              />
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.joinButton, joinMutation.isPending && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
          accessibilityLabel={t('pair.join')}
          accessibilityRole="button"
        >
          <Text style={styles.joinButtonText}>
            {joinMutation.isPending ? t('pair.joining') : t('pair.join')}
          </Text>
        </Pressable>
      </View>

      {/* Skip */}
      <Pressable
        onPress={handleSkip}
        accessibilityLabel={t('pair.skip')}
        accessibilityRole="button"
        style={styles.skipButton}
      >
        <Text style={styles.skipText}>{t('pair.skip')}</Text>
      </Pressable>
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
    gap: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.cardTranslucent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.fonts.heading,
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    marginRight: 40, // Balance the back button
  },

  // Illustration
  illustration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 128,
    gap: 16,
  },
  phoneMock: {
    width: 48,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.xs,
  },
  phoneGradient: {
    width: 32,
    height: 48,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryMuted,
  },
  heartCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Heading
  headingSection: {
    gap: 12,
    alignItems: 'center',
  },
  heading: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    lineHeight: theme.lineHeights['3xl'],
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.muted,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Code card
  codeCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primaryMuted,
    padding: 25,
    alignItems: 'center',
    gap: 12,
    ...theme.shadows.xs,
  },
  codeLabel: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.tertiary,
    textAlign: 'center',
  },
  codeDisplay: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSizes['2xl'],
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    letterSpacing: 2.4,
  },
  codeActions: {
    width: '100%',
    gap: 12,
    paddingTop: 12,
  },
  copyButton: {
    width: '100%',
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyButtonText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.inverse,
  },
  shareButton: {
    width: '100%',
    height: 52,
    backgroundColor: theme.colors.background.subtle,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.DEFAULT,
  },
  generateButton: {
    width: '100%',
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateText: {
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
    backgroundColor: theme.colors.ui.dividerSubtle,
  },
  dividerText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.tertiary,
    paddingHorizontal: 16,
  },

  // Join section
  joinSection: {
    gap: 16,
    alignItems: 'center',
  },
  joinLabel: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.muted,
    alignSelf: 'flex-start',
  },
  codeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: 'rgba(45, 41, 38, 0.1)',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.card,
    textAlign: 'center',
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.foreground.DEFAULT,
    marginHorizontal: 4,
  },
  codeDot: {
    width: 4,
    height: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.ui.dot,
    marginHorizontal: 4,
  },
  joinButton: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.foreground.DEFAULT,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.inverse,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Skip
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.muted,
    textDecorationLine: 'underline',
  },
})
