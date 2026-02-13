import { theme } from '@ring/ui'
import { router as expoRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export function SwipeGate() {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Tu aimes ce que tu vois ?</Text>
        <Text style={styles.subtitle}>
          Inscris-toi pour sauvegarder tes favoris et te coupler !
        </Text>
        <Pressable style={styles.ctaBtn} onPress={() => expoRouter.push('/login')}>
          <Text style={styles.ctaText}>S'inscrire</Text>
        </Pressable>
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
    backgroundColor: theme.colors.ring.pink500,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})
