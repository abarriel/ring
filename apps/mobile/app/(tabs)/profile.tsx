import type { User } from '@ring/shared'
import { Copy, LogOut, Share2, theme, Users, useToast } from '@ring/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { clearUser, getUser } from '@/lib/auth'
import { client, orpc } from '@/lib/orpc'

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    getUser().then(setUser)
  }, [])

  // ── Couple query ──────────────────────────────────────────────────────
  const coupleQuery = useQuery(orpc.couple.get.queryOptions({ input: undefined }))
  const couple = coupleQuery.data ?? null

  // ── Create couple mutation ────────────────────────────────────────────
  const createCoupleMutation = useMutation({
    mutationFn: () => client.couple.create(undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple'] })
    },
    onError: (error: Error) => {
      if (error.message.includes('Already in a couple')) {
        toast.show({
          type: 'warning',
          title: 'Deja en couple',
          message: 'Tu es deja dans un couple',
        })
      } else {
        toast.show({
          type: 'error',
          title: 'Erreur',
          message: 'Erreur lors de la creation du couple',
        })
      }
    },
  })

  // ── Join couple mutation ──────────────────────────────────────────────
  const joinCoupleMutation = useMutation({
    mutationFn: (code: string) => client.couple.join({ code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple'] })
      setJoinCode('')
      toast.show({ type: 'success', title: 'Couple forme !' })
    },
    onError: (error: Error) => {
      if (error.message.includes('Code not found')) {
        toast.show({ type: 'error', title: 'Code introuvable', message: "Ce code n'existe pas" })
      } else if (error.message.includes('Already paired')) {
        toast.show({
          type: 'warning',
          title: 'Deja en couple',
          message: 'Tu es deja dans un couple',
        })
      } else if (error.message.includes('Couple already full')) {
        toast.show({
          type: 'error',
          title: 'Couple complet',
          message: 'Ce couple a deja un partenaire',
        })
      } else {
        toast.show({ type: 'error', title: 'Erreur', message: 'Erreur lors de la jonction' })
      }
    },
  })

  // ── Dissolve couple mutation ──────────────────────────────────────────
  const dissolveCoupleMutation = useMutation({
    mutationFn: () => client.couple.dissolve(undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple'] })
      toast.show({ type: 'info', title: 'Couple dissous' })
    },
    onError: () => {
      toast.show({ type: 'error', title: 'Erreur', message: 'Erreur lors de la dissolution' })
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleCreateCouple = () => {
    createCoupleMutation.mutate()
  }

  const handleJoinCouple = () => {
    const trimmed = joinCode.trim().toUpperCase()
    if (trimmed.length !== 6) {
      toast.show({
        type: 'warning',
        title: 'Code invalide',
        message: 'Le code doit faire 6 caracteres',
      })
      return
    }
    joinCoupleMutation.mutate(trimmed)
  }

  const handleDissolve = () => {
    Alert.alert('Dissoudre le couple', 'Es-tu sur de vouloir dissoudre le couple ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Dissoudre',
        style: 'destructive',
        onPress: () => dissolveCoupleMutation.mutate(),
      },
    ])
  }

  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Rejoins-moi sur Ring ! Mon code : ${code}`,
      })
    } catch {
      // User cancelled share
    }
  }

  const handleLogout = () => {
    Alert.alert('Deconnexion', 'Es-tu sur de vouloir te deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Deconnecter',
        style: 'destructive',
        onPress: async () => {
          await clearUser()
          queryClient.clear()
          router.replace('/login')
        },
      },
    ])
  }

  if (!user) return null

  const initials = getInitials(user.name)
  const isPaired = couple?.status === 'ACTIVE' && couple.partner !== null
  const isPending = couple?.status === 'PENDING'

  // Determine partner name
  const partnerName =
    isPaired && couple
      ? couple.inviter.id === user.id
        ? couple.partner?.name
        : couple.inviter.name
      : null

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      {/* Avatar + Username */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
      </View>

      {/* Couple Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={20} color={theme.colors.foreground.DEFAULT} />
          <Text style={styles.sectionTitle}>Couple</Text>
        </View>

        {coupleQuery.isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.ring.pink500} style={styles.loader} />
        ) : isPaired ? (
          /* ── Paired state ──────────────────────────────────────────── */
          <View style={styles.card}>
            <View style={styles.pairedStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Couple actif</Text>
            </View>
            <Text style={styles.partnerLabel}>Partenaire</Text>
            <Text style={styles.partnerName}>{partnerName}</Text>
            <Pressable
              style={styles.dissolveBtn}
              onPress={handleDissolve}
              disabled={dissolveCoupleMutation.isPending}
            >
              <Text style={styles.dissolveBtnText}>
                {dissolveCoupleMutation.isPending ? 'Dissolution...' : 'Dissoudre le couple'}
              </Text>
            </Pressable>
          </View>
        ) : isPending && couple ? (
          /* ── Pending state (code generated, waiting for partner) ──── */
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Ton code d'invitation</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{couple.code}</Text>
              <Pressable style={styles.iconBtn} onPress={() => handleShareCode(couple.code)}>
                <Share2 size={20} color={theme.colors.ring.pink500} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => {
                  // Copy to clipboard is handled by Share on RN
                  handleShareCode(couple.code)
                }}
              >
                <Copy size={20} color={theme.colors.foreground.secondary} />
              </Pressable>
            </View>
            <Text style={styles.codeHint}>Partage ce code avec ton partenaire</Text>

            <View style={styles.separator} />

            <Pressable
              style={styles.dissolveBtn}
              onPress={handleDissolve}
              disabled={dissolveCoupleMutation.isPending}
            >
              <Text style={styles.dissolveBtnText}>
                {dissolveCoupleMutation.isPending ? 'Annulation...' : "Annuler l'invitation"}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* ── Unpaired state ────────────────────────────────────────── */
          <View style={styles.card}>
            <Pressable
              style={styles.inviteBtn}
              onPress={handleCreateCouple}
              disabled={createCoupleMutation.isPending}
            >
              <Text style={styles.inviteBtnText}>
                {createCoupleMutation.isPending ? 'Creation...' : 'Invite ton partenaire'}
              </Text>
            </Pressable>

            <View style={styles.separator} />

            <Text style={styles.cardLabel}>Ou entre un code</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.joinInput}
                placeholder="ABC123"
                placeholderTextColor={theme.colors.foreground.muted}
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
              />
              <Pressable
                style={[
                  styles.joinBtn,
                  (joinCode.trim().length !== 6 || joinCoupleMutation.isPending) &&
                    styles.joinBtnDisabled,
                ]}
                onPress={handleJoinCouple}
                disabled={joinCode.trim().length !== 6 || joinCoupleMutation.isPending}
              >
                <Text style={styles.joinBtnText}>
                  {joinCoupleMutation.isPending ? '...' : 'Rejoindre'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color={theme.colors.feedback.error.text} />
        <Text style={styles.logoutText}>Deconnexion</Text>
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
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: theme.spacing.page,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.ui.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.ui.avatarText,
  },
  userName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.foreground.DEFAULT,
  },

  // Section
  section: {
    paddingHorizontal: theme.spacing.page,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground.DEFAULT,
  },

  // Card
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.cardX,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.foreground.secondary,
    marginBottom: 8,
  },

  // Loader
  loader: {
    paddingVertical: 20,
  },

  // Paired state
  pairedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.feedback.success.text,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.feedback.success.text,
  },
  partnerLabel: {
    fontSize: 13,
    color: theme.colors.foreground.secondary,
    marginBottom: 4,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 20,
  },

  // Code display
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: theme.colors.foreground.DEFAULT,
    fontFamily: 'Courier',
  },
  iconBtn: {
    padding: 8,
  },
  codeHint: {
    fontSize: 12,
    color: theme.colors.foreground.muted,
    marginBottom: 4,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: theme.colors.ui.border,
    marginVertical: 16,
  },

  // Invite button (unpaired)
  inviteBtn: {
    backgroundColor: theme.colors.ring.pink500,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inviteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Join row
  joinRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  joinInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Courier',
    letterSpacing: 3,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
  },
  joinBtn: {
    flexShrink: 0,
    backgroundColor: theme.colors.ring.pink500,
    borderRadius: theme.borderRadius.md,
    height: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnDisabled: {
    opacity: 0.5,
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Dissolve button
  dissolveBtn: {
    borderWidth: 1,
    borderColor: theme.colors.feedback.error.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.feedback.error.bg,
  },
  dissolveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.feedback.error.text,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    marginHorizontal: theme.spacing.page,
    borderWidth: 1,
    borderColor: theme.colors.feedback.error.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.feedback.error.bg,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.feedback.error.text,
  },
})
