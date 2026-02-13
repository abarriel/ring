import { theme } from '@ring/ui'
import { useMutation } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { clearAnonymousSwipes, getAnonymousSwipes } from '@/lib/anonymous-swipes'
import { saveToken, saveUser } from '@/lib/auth'
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

export default function LoginScreen() {
  const [name, setName] = useState('')

  const loginMutation = useMutation({
    mutationFn: (input: { name: string }) => client.auth.login(input),
    onSuccess: async (result) => {
      await saveUser(result.user)
      await saveToken(result.sessionToken)
      // Replay anonymous swipes to the API before navigating
      await replayAnonymousSwipes()
      router.replace('/')
    },
  })

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    loginMutation.mutate({ name: trimmed })
  }

  const disabled = loginMutation.isPending || !name.trim()

  return (
    <LinearGradient colors={['#fff1f2', '#fce7f3']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.center}>
          {/* Logo */}
          <LinearGradient
            colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
            style={styles.logo}
          >
            <Text style={styles.logoText}>R</Text>
          </LinearGradient>

          {/* Title */}
          <Text style={styles.title}>Ring</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Trouve ton match parfait</Text>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Pseudo</Text>
            <TextInput
              style={styles.input}
              placeholder="ton_pseudo"
              placeholderTextColor={theme.colors.foreground.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <LinearGradient
              colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
              style={styles.buttonGradient}
            >
              <Pressable
                style={[styles.button, disabled && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={disabled}
              >
                <Text style={styles.buttonText}>
                  {loginMutation.isPending ? 'Connexion...' : "C'est parti"}
                </Text>
              </Pressable>
            </LinearGradient>
          </View>

          {/* Footer hint */}
          <Text style={styles.footer}>Pas de mot de passe, juste un pseudo.</Text>
        </View>
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
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 32,
    fontSize: 14,
    color: theme.colors.foreground.muted,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.cardX,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 8,
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
    marginBottom: 20,
  },
  buttonGradient: {
    borderRadius: theme.borderRadius.md,
  },
  button: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: theme.colors.foreground.muted,
  },
})
