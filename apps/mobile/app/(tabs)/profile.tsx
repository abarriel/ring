import { Copy, Heart, LogOut, Settings, Share2, Sparkles, theme, useToast } from '@ring/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useAuth } from '@/lib/auth-context'
import { hapticSuccess } from '@/lib/haptics'
import { client, orpc } from '@/lib/orpc'
import { getInitials } from '@/lib/utils'

export default function ProfileScreen() {
  const { isAuthenticated: isAuthed, user, logout } = useAuth()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [joinCode, setJoinCode] = useState('')

  // ── Liked count query ─────────────────────────────────────────────────
  const likedQuery = useQuery({
    ...orpc.swipe.listLiked.queryOptions({ input: { limit: 1, offset: 0 } }),
    enabled: isAuthed,
    select: (data) => (data as unknown[]).length,
  })

  // ── Matches count query ────────────────────────────────────────────────
  const matchesQuery = useQuery({
    ...orpc.match.list.queryOptions({ input: { limit: 1, offset: 0 } }),
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
    onSuccess: async (data) => {
      await hapticSuccess()
      queryClient.invalidateQueries({ queryKey: coupleQueryKey })
      // Auto-copy the invitation code to clipboard
      if (data?.code) {
        await Clipboard.setStringAsync(data.code)
        toast.show({ type: 'success', title: t('profile.toast.codeCopied'), message: data.code })
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('Already in a couple')) {
        queryClient.invalidateQueries({ queryKey: coupleQueryKey })
        toast.show({
          type: 'warning',
          title: t('profile.toast.alreadyCoupledTitle'),
          message: t('profile.toast.alreadyCoupledMessage'),
        })
      } else {
        toast.show({
          type: 'error',
          title: t('common.toast.errorTitle'),
          message: t('profile.toast.createCoupleError'),
        })
      }
    },
  })

  // ── Join couple mutation ──────────────────────────────────────────────
  const joinCoupleMutation = useMutation({
    mutationFn: (code: string) => client.couple.join({ code }),
    onSuccess: async () => {
      await hapticSuccess()
      queryClient.invalidateQueries({ queryKey: coupleQueryKey })
      setJoinCode('')
      toast.show({ type: 'success', title: t('profile.toast.coupleFormed') })
    },
    onError: (error: Error) => {
      if (error.message.includes('Code not found')) {
        toast.show({
          type: 'error',
          title: t('profile.toast.codeNotFoundTitle'),
          message: t('profile.toast.codeNotFoundMessage'),
        })
      } else if (error.message.includes('Cannot join your own couple')) {
        toast.show({
          type: 'warning',
          title: t('profile.toast.codeInvalidTitle'),
          message: t('profile.toast.codeInvalidOwnCouple'),
        })
      } else if (error.message.includes('Already paired')) {
        queryClient.invalidateQueries({ queryKey: coupleQueryKey })
        toast.show({
          type: 'warning',
          title: t('profile.toast.alreadyPairedTitle'),
          message: t('profile.toast.alreadyPairedMessage'),
        })
      } else if (error.message.includes('Couple already full')) {
        toast.show({
          type: 'error',
          title: t('profile.toast.coupleFullTitle'),
          message: t('profile.toast.coupleFullMessage'),
        })
      } else {
        toast.show({
          type: 'error',
          title: t('common.toast.errorTitle'),
          message: t('profile.toast.joinError'),
        })
      }
    },
  })

  // ── Dissolve couple mutation ──────────────────────────────────────────
  const dissolveCoupleMutation = useMutation({
    mutationFn: () => client.couple.dissolve(undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coupleQueryKey })
      toast.show({ type: 'info', title: t('profile.toast.coupleDissolvedTitle') })
    },
    onError: () => {
      toast.show({
        type: 'error',
        title: t('common.toast.errorTitle'),
        message: t('profile.toast.dissolveError'),
      })
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
        title: t('profile.toast.codeLengthTitle'),
        message: t('profile.toast.codeLengthMessage'),
      })
      return
    }
    joinCoupleMutation.mutate(trimmed)
  }

  const handleDissolve = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.alert.dissolveMessage'))) {
        dissolveCoupleMutation.mutate()
      }
      return
    }
    Alert.alert(t('profile.alert.dissolveTitle'), t('profile.alert.dissolveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.alert.dissolveConfirm'),
        style: 'destructive',
        onPress: () => dissolveCoupleMutation.mutate(),
      },
    ])
  }

  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: t('profile.share.inviteMessage', { code }),
      })
    } catch {
      // User cancelled share
    }
  }

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code)
    toast.show({ type: 'success', title: t('profile.toast.copied') })
  }

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.alert.logoutMessage'))) {
        await logout()
      }
      return
    }
    Alert.alert(t('profile.alert.logoutTitle'), t('profile.alert.logoutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.alert.logoutConfirm'),
        style: 'destructive',
        onPress: () => logout(),
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
            <Text
              style={styles.avatarText}
              accessibilityLabel={t('profile.avatarA11y', { name: user.name })}
            >
              {initials}
            </Text>
          </LinearGradient>
          <View>
            <Text style={styles.userName} accessibilityRole="header">
              {user.name}
            </Text>
            <Text style={styles.userSubtitle}>
              {isPaired && partnerName
                ? t('profile.header.coupledWith', { partnerName })
                : t('profile.header.defaultSubtitle')}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid} accessibilityLabel={t('profile.stats.a11y')}>
          <View style={styles.statCard} accessibilityLabel={t('profile.stats.likedRings')}>
            <View style={styles.statRow}>
              <Heart size={16} color={theme.colors.ring.pink500} fill={theme.colors.ring.pink500} />
              <Text style={styles.statValue}>
                {likedQuery.isLoading ? '-' : (likedQuery.data ?? 0)}
              </Text>
            </View>
            <Text style={styles.statLabel}>{t('profile.stats.likedRings')}</Text>
          </View>
          <View style={styles.statCard} accessibilityLabel={t('profile.stats.matches')}>
            <View style={styles.statRow}>
              <Sparkles size={16} color={theme.colors.ring.pink500} />
              <Text style={styles.statValue}>
                {matchesQuery.isLoading ? '-' : (matchesQuery.data ?? 0)}
              </Text>
            </View>
            <Text style={styles.statLabel}>{t('profile.stats.matches')}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Body cards ── */}
      <View style={styles.body}>
        {/* Partner code display (when paired) */}
        {isPaired && couple && (
          <View
            style={styles.partnerCodeCard}
            accessibilityLabel={t('profile.partner.a11y', { name: partnerName })}
          >
            <Text style={styles.partnerCodeLabel}>{t('profile.partner.label')}</Text>
            <Text style={styles.partnerCodeValue}>{partnerName}</Text>
          </View>
        )}

        {/* Couple section */}
        {coupleQuery.isLoading ? (
          <View style={styles.loader} accessibilityLabel={t('profile.couple.loadingA11y')}>
            <View style={{ opacity: 0.5 }}>
              <Text style={styles.cardUpperLabel}>{t('profile.couple.sectionLabel')}</Text>
            </View>
          </View>
        ) : isPaired ? (
          <Pressable
            style={styles.dissolveBtn}
            onPress={handleDissolve}
            disabled={dissolveCoupleMutation.isPending}
            accessibilityLabel={t('profile.couple.dissolve')}
            accessibilityRole="button"
          >
            <Text style={styles.dissolveBtnText}>
              {dissolveCoupleMutation.isPending
                ? t('profile.couple.dissolving')
                : t('profile.couple.dissolve')}
            </Text>
          </Pressable>
        ) : isPending && couple ? (
          <View style={styles.card}>
            <Text style={styles.cardUpperLabel}>{t('profile.couple.invitationCodeLabel')}</Text>
            <View style={styles.codeRow}>
              <Text
                style={styles.codeText}
                accessibilityLabel={t('profile.couple.invitationCodeA11y', { code: couple.code })}
              >
                {couple.code}
              </Text>
              <Pressable
                style={styles.iconBtn}
                onPress={() => handleShareCode(couple.code)}
                accessibilityLabel={t('profile.couple.shareCodeA11y')}
                accessibilityRole="button"
              >
                <Share2 size={20} color={theme.colors.ring.pink500} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => handleCopyCode(couple.code)}
                accessibilityLabel={t('profile.couple.copyCodeA11y')}
                accessibilityRole="button"
              >
                <Copy size={20} color={theme.colors.foreground.secondary} />
              </Pressable>
            </View>
            <Text style={styles.cardHint}>{t('profile.couple.codeHint')}</Text>

            <View style={styles.separator} />

            <Pressable
              style={styles.dissolveBtn}
              onPress={handleDissolve}
              disabled={dissolveCoupleMutation.isPending}
              accessibilityLabel={t('profile.couple.cancelInvitationA11y')}
              accessibilityRole="button"
            >
              <Text style={styles.dissolveBtnText}>
                {dissolveCoupleMutation.isPending
                  ? t('profile.couple.cancelling')
                  : t('profile.couple.cancelInvitation')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Pressable
              style={styles.inviteBtn}
              onPress={handleCreateCouple}
              disabled={createCoupleMutation.isPending}
              accessibilityLabel={t('profile.couple.invite')}
              accessibilityRole="button"
            >
              <Text style={styles.inviteBtnText}>
                {createCoupleMutation.isPending
                  ? t('profile.couple.creating')
                  : t('profile.couple.invite')}
              </Text>
            </Pressable>

            <View style={styles.separator} />

            <Text style={styles.cardLabel}>{t('profile.couple.orEnterCode')}</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.joinInput}
                placeholder="ABC123"
                placeholderTextColor={theme.colors.foreground.muted}
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                accessibilityLabel={t('profile.couple.joinInputA11y')}
              />
              <Pressable
                style={[
                  styles.joinBtn,
                  (joinCode.trim().length !== 6 || joinCoupleMutation.isPending) &&
                    styles.joinBtnDisabled,
                ]}
                onPress={handleJoinCouple}
                disabled={joinCode.trim().length !== 6 || joinCoupleMutation.isPending}
                accessibilityLabel={t('profile.couple.joinA11y')}
                accessibilityRole="button"
              >
                <Text style={styles.joinBtnText}>
                  {joinCoupleMutation.isPending ? '...' : t('profile.couple.join')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Preferences button */}
        <Pressable
          style={styles.menuBtn}
          onPress={() => toast.show({ type: 'info', title: t('profile.toast.comingSoon') })}
          accessibilityLabel={t('profile.menu.preferencesA11y')}
          accessibilityRole="button"
        >
          <Settings size={20} color={theme.colors.foreground.secondary} />
          <View style={styles.menuBtnContent}>
            <Text style={styles.menuBtnTitle}>{t('profile.menu.preferencesTitle')}</Text>
            <Text style={styles.menuBtnSubtitle}>{t('profile.menu.preferencesSubtitle')}</Text>
          </View>
        </Pressable>

        {/* Logout button */}
        <Pressable
          style={styles.menuBtnDanger}
          onPress={handleLogout}
          accessibilityLabel={t('profile.menu.logoutA11y')}
          accessibilityRole="button"
        >
          <LogOut size={20} color={theme.colors.feedback.error.text} />
          <View style={styles.menuBtnContent}>
            <Text style={styles.menuBtnTitleDanger}>{t('profile.menu.logoutTitle')}</Text>
            <Text style={styles.menuBtnSubtitleDanger}>{t('profile.menu.logoutSubtitle')}</Text>
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
