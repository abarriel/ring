import type { User } from '@ring/shared'
import { Check, Copy, Heart, LogOut, Settings, Share2, theme, useToast } from '@ring/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import { LinearGradient } from 'expo-linear-gradient'
import { router as expoRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProfileSkeleton } from '@/components/skeleton'
import { clearUser, getUser } from '@/lib/auth'
import { hapticSuccess } from '@/lib/haptics'
import { client, orpc } from '@/lib/orpc'
import { useAuthGuard } from '@/lib/use-auth-guard'
import { getInitials } from '@/lib/utils'

export default function ProfileScreen() {
  const isAuthed = useAuthGuard()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getUser().then(setUser)
  }, [])

  // ── Liked count query ─────────────────────────────────────────────────
  const likedQuery = useQuery({
    ...orpc.swipe.listLiked.queryOptions({ input: { limit: 1, offset: 0 } }),
    enabled: isAuthed,
    select: (data) => (data as unknown[]).length,
  })

  // ── Couple query ──────────────────────────────────────────────────────
  const coupleQueryOptions = orpc.couple.get.queryOptions({ input: undefined })
  const coupleQuery = useQuery({
    ...coupleQueryOptions,
    enabled: isAuthed,
  })
  const couple = coupleQuery.data ?? null
  const coupleQueryKey = coupleQueryOptions.queryKey

  // ── Create couple mutation ────────────────────────────────────────────
  const createCoupleMutation = useMutation({
    mutationFn: () => client.couple.create(undefined),
    onSuccess: () => {
      hapticSuccess()
      queryClient.invalidateQueries({ queryKey: coupleQueryKey })
    },
    onError: (error: Error) => {
      if (error.message.includes('Already in a couple')) {
        queryClient.invalidateQueries({ queryKey: coupleQueryKey })
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
      hapticSuccess()
      queryClient.invalidateQueries({ queryKey: coupleQueryKey })
      setJoinCode('')
      toast.show({ type: 'success', title: 'Couple forme !' })
    },
    onError: (error: Error) => {
      if (error.message.includes('Code not found')) {
        toast.show({ type: 'error', title: 'Code introuvable', message: "Ce code n'existe pas" })
      } else if (error.message.includes('Cannot join your own couple')) {
        toast.show({
          type: 'warning',
          title: 'Code invalide',
          message: 'Tu ne peux pas rejoindre ton propre couple',
        })
      } else if (error.message.includes('Already paired')) {
        queryClient.invalidateQueries({ queryKey: coupleQueryKey })
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
      queryClient.invalidateQueries({ queryKey: coupleQueryKey })
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
    if (Platform.OS === 'web') {
      if (window.confirm('Es-tu sur de vouloir dissoudre le couple ?')) {
        dissolveCoupleMutation.mutate()
      }
      return
    }
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

  const handleCopyUserId = async () => {
    if (!user) return
    await Clipboard.setStringAsync(user.id)
    setCopied(true)
    toast.show({ type: 'success', title: 'Copie !' })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code)
    toast.show({ type: 'success', title: 'Copie !' })
  }

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Es-tu sur de vouloir te deconnecter ?')) {
        await clearUser()
        queryClient.clear()
        expoRouter.replace('/login')
      }
      return
    }
    Alert.alert('Deconnexion', 'Es-tu sur de vouloir te deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Deconnecter',
        style: 'destructive',
        onPress: async () => {
          await clearUser()
          queryClient.clear()
          expoRouter.replace('/login')
        },
      },
    ])
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ProfileSkeleton />
      </View>
    )
  }

  const initials = getInitials(user.name)
  const isPaired = couple?.status === 'ACTIVE' && couple.partner !== null
  const isPending = couple?.status === 'PENDING'
  const isPartnerConnected = isPaired || isPending

  const partnerName =
    isPaired && couple
      ? couple.inviter.id === user.id
        ? couple.partner?.name
        : couple.inviter.name
      : null

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
    >
      {/* ── Gradient header with avatar + stats ── */}
      <LinearGradient colors={['#fce7f3', '#ffffff']} style={styles.profileHeader}>
        <View style={styles.profileRow}>
          <LinearGradient
            colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText} accessibilityLabel={`Avatar de ${user.name}`}>
              {initials}
            </Text>
          </LinearGradient>
          <View>
            <Text style={styles.userName} accessibilityRole="header">
              {user.name}
            </Text>
            <Text style={styles.userSubtitle}>Ring Explorer</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid} accessibilityLabel="Statistiques">
          <View style={styles.statCard} accessibilityLabel="Bagues likees">
            <View style={styles.statRow}>
              <Heart size={16} color={theme.colors.ring.pink500} fill={theme.colors.ring.pink500} />
              <Text style={styles.statValue}>
                {likedQuery.isLoading ? '-' : (likedQuery.data ?? 0)}
              </Text>
            </View>
            <Text style={styles.statLabel}>Bagues likees</Text>
          </View>
          <View
            style={styles.statCard}
            accessibilityLabel={`Partenaire ${isPartnerConnected ? 'connecte' : 'non connecte'}`}
          >
            <Text style={styles.statValue}>{isPartnerConnected ? '\u2713' : '\u2014'}</Text>
            <Text style={styles.statLabel}>
              Partenaire {isPartnerConnected ? 'connecte' : 'non connecte'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Body cards ── */}
      <View style={styles.body}>
        {/* User ID card */}
        <View style={styles.card} accessibilityLabel="Ton identifiant utilisateur">
          <Text style={styles.cardUpperLabel}>TON ID UTILISATEUR</Text>
          <View style={styles.idRow}>
            <TextInput
              style={styles.idInput}
              value={user.id}
              editable={false}
              selectTextOnFocus
              accessibilityLabel="Identifiant utilisateur"
            />
            <Pressable
              style={styles.idCopyBtn}
              onPress={handleCopyUserId}
              accessibilityLabel="Copier l'identifiant"
              accessibilityRole="button"
            >
              {copied ? (
                <Check size={16} color={theme.colors.foreground.secondary} />
              ) : (
                <Copy size={16} color={theme.colors.foreground.secondary} />
              )}
            </Pressable>
          </View>
          <Text style={styles.cardHint}>Partage ce code avec ton partenaire</Text>
        </View>

        {/* Partner code display (when paired) */}
        {isPaired && couple && (
          <View style={styles.partnerCodeCard} accessibilityLabel={`Partenaire: ${partnerName}`}>
            <Text style={styles.partnerCodeLabel}>PARTENAIRE</Text>
            <Text style={styles.partnerCodeValue}>{partnerName}</Text>
          </View>
        )}

        {/* Couple section */}
        {coupleQuery.isLoading ? (
          <View style={styles.loader} accessibilityLabel="Chargement du couple">
            <View style={{ opacity: 0.5 }}>
              <Text style={styles.cardUpperLabel}>COUPLE</Text>
            </View>
          </View>
        ) : isPaired ? (
          <Pressable
            style={styles.dissolveBtn}
            onPress={handleDissolve}
            disabled={dissolveCoupleMutation.isPending}
            accessibilityLabel="Dissoudre le couple"
            accessibilityRole="button"
          >
            <Text style={styles.dissolveBtnText}>
              {dissolveCoupleMutation.isPending ? 'Dissolution...' : 'Dissoudre le couple'}
            </Text>
          </Pressable>
        ) : isPending && couple ? (
          <View style={styles.card}>
            <Text style={styles.cardUpperLabel}>TON CODE D'INVITATION</Text>
            <View style={styles.codeRow}>
              <Text
                style={styles.codeText}
                accessibilityLabel={`Code d'invitation: ${couple.code}`}
              >
                {couple.code}
              </Text>
              <Pressable
                style={styles.iconBtn}
                onPress={() => handleShareCode(couple.code)}
                accessibilityLabel="Partager le code"
                accessibilityRole="button"
              >
                <Share2 size={20} color={theme.colors.ring.pink500} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => handleCopyCode(couple.code)}
                accessibilityLabel="Copier le code"
                accessibilityRole="button"
              >
                <Copy size={20} color={theme.colors.foreground.secondary} />
              </Pressable>
            </View>
            <Text style={styles.cardHint}>Partage ce code avec ton partenaire</Text>

            <View style={styles.separator} />

            <Pressable
              style={styles.dissolveBtn}
              onPress={handleDissolve}
              disabled={dissolveCoupleMutation.isPending}
              accessibilityLabel="Annuler l'invitation"
              accessibilityRole="button"
            >
              <Text style={styles.dissolveBtnText}>
                {dissolveCoupleMutation.isPending ? 'Annulation...' : "Annuler l'invitation"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Pressable
              style={styles.inviteBtn}
              onPress={handleCreateCouple}
              disabled={createCoupleMutation.isPending}
              accessibilityLabel="Invite ton partenaire"
              accessibilityRole="button"
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
                accessibilityLabel="Code d'invitation du partenaire"
              />
              <Pressable
                style={[
                  styles.joinBtn,
                  (joinCode.trim().length !== 6 || joinCoupleMutation.isPending) &&
                    styles.joinBtnDisabled,
                ]}
                onPress={handleJoinCouple}
                disabled={joinCode.trim().length !== 6 || joinCoupleMutation.isPending}
                accessibilityLabel="Rejoindre le couple"
                accessibilityRole="button"
              >
                <Text style={styles.joinBtnText}>
                  {joinCoupleMutation.isPending ? '...' : 'Rejoindre'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Preferences button */}
        <Pressable
          style={styles.menuBtn}
          onPress={() => toast.show({ type: 'info', title: 'Bientot disponible !' })}
          accessibilityLabel="Preferences de bagues"
          accessibilityRole="button"
        >
          <Settings size={20} color={theme.colors.foreground.secondary} />
          <View style={styles.menuBtnContent}>
            <Text style={styles.menuBtnTitle}>Preferences</Text>
            <Text style={styles.menuBtnSubtitle}>Personnalise tes preferences de bagues</Text>
          </View>
        </Pressable>

        {/* Logout button */}
        <Pressable
          style={styles.menuBtnDanger}
          onPress={handleLogout}
          accessibilityLabel="Se deconnecter"
          accessibilityRole="button"
        >
          <LogOut size={20} color={theme.colors.feedback.error.text} />
          <View style={styles.menuBtnContent}>
            <Text style={styles.menuBtnTitleDanger}>Deconnexion</Text>
            <Text style={styles.menuBtnSubtitleDanger}>
              Efface toutes les donnees et recommence
            </Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },
  content: {},

  // Profile header
  profileHeader: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ui.border,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
  },
  userSubtitle: {
    fontSize: 13,
    color: theme.colors.foreground.secondary,
    marginTop: 2,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.foreground.secondary,
  },

  // Body
  body: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 20,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
  },
  cardUpperLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.foreground.muted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.foreground.secondary,
    marginBottom: 8,
  },
  cardHint: {
    fontSize: 12,
    color: theme.colors.foreground.muted,
    marginTop: 8,
  },

  // User ID row
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    fontSize: 12,
    fontFamily: 'Courier',
    color: theme.colors.foreground.DEFAULT,
    backgroundColor: theme.colors.background.surface,
  },
  idCopyBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.card,
  },

  // Partner code card
  partnerCodeCard: {
    backgroundColor: '#fce7f3',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f9a8d4',
  },
  partnerCodeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.ring.pink500,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partnerCodeValue: {
    fontSize: 14,
    fontFamily: 'Courier',
    color: theme.colors.foreground.DEFAULT,
  },

  // Loader
  loader: {
    paddingVertical: 20,
  },

  // Code display
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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

  // Menu buttons
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
  },
  menuBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
  },
  menuBtnContent: {
    flex: 1,
  },
  menuBtnTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.foreground.DEFAULT,
  },
  menuBtnSubtitle: {
    fontSize: 12,
    color: theme.colors.foreground.muted,
    marginTop: 2,
  },
  menuBtnTitleDanger: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.feedback.error.text,
  },
  menuBtnSubtitleDanger: {
    fontSize: 12,
    color: theme.colors.feedback.error.text,
    opacity: 0.7,
    marginTop: 2,
  },
})
