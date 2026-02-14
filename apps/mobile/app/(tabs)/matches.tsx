import type { RingWithImages } from '@ring/shared'
import { ExternalLink, Gem, Heart, Sparkles, theme } from '@ring/ui'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router as expoRouter } from 'expo-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MatchesListSkeleton } from '@/components/skeleton'
import { useAuth } from '@/lib/auth-context'
import { hapticLight } from '@/lib/haptics'
import { orpc } from '@/lib/orpc'
import { formatEnum } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type MatchWithRing = {
  id: string
  coupleId: string
  ringId: string
  createdAt: Date
  ring: RingWithImages
}

// ── Match Card ───────────────────────────────────────────────────────────────

const MATCH_CARD_HEIGHT = 192 + 200 // image + info area approx

function MatchCard({ match }: { match: MatchWithRing }) {
  const { t } = useTranslation()
  const { ring } = match
  const imageUrl = ring.images[0]?.url

  const handleDetails = useCallback(() => {
    hapticLight().catch(() => {})
    expoRouter.push(`/ring/${ring.id}`)
  }, [ring.id])

  return (
    <View
      style={styles.card}
      accessibilityLabel={t('matches.card.ringA11y', { name: ring.name })}
      accessibilityRole="summary"
    >
      {/* Image */}
      <View style={styles.cardImageWrapper}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
            accessibilityLabel={t('common.ringPhotoA11y', { name: ring.name })}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Gem size={32} color={theme.colors.foreground.muted} />
          </View>
        )}
        <LinearGradient
          colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
          style={styles.matchBadge}
        >
          <Sparkles size={12} color="#ffffff" />
          <Text style={styles.matchBadgeText}>{t('matches.card.badge')}</Text>
        </LinearGradient>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{ring.name}</Text>

        {/* Inline specs with dot separators */}
        <View style={styles.specsInline}>
          <Text style={styles.specText}>{`${ring.caratWeight} ${t('common.caratUnit')}`}</Text>
          <View style={styles.specDot} />
          <Text style={styles.specText}>{formatEnum(ring.metalType)}</Text>
          <View style={styles.specDot} />
          <Text style={styles.specText}>{formatEnum(ring.style)}</Text>
        </View>

        {/* Star rating */}
        <View style={styles.starsRow}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Text
                key={`star-${n}`}
                style={[
                  styles.starIcon,
                  n <= Math.round(ring.rating) ? styles.starFilled : styles.starEmpty,
                ]}
              >
                {'\u2605'}
              </Text>
            ))}
          </View>
          <Text style={styles.reviewCount}>
            ({ring.reviewCount.toLocaleString('fr-FR')} {t('common.reviews')})
          </Text>
        </View>

        {ring.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {ring.description}
          </Text>
        )}

        <Pressable
          style={styles.detailsBtn}
          onPress={handleDetails}
          accessibilityLabel={t('matches.card.viewDetailsA11y', { name: ring.name })}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
            style={styles.detailsBtnGradient}
          >
            <Text style={styles.detailsBtnText}>{t('matches.card.viewDetails')}</Text>
            <ExternalLink size={16} color="#ffffff" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { t } = useTranslation()
  const { isAuthenticated: isAuthed } = useAuth()
  const insets = useSafeAreaInsets()

  const coupleQuery = useQuery({
    ...orpc.couple.get.queryOptions({ input: undefined }),
    enabled: isAuthed,
  })
  const couple = coupleQuery.data

  const matchesQuery = useQuery({
    ...orpc.match.list.queryOptions({ input: { limit: 50, offset: 0 } }),
    enabled: isAuthed && couple?.status === 'ACTIVE',
  })
  const matches = (matchesQuery.data as MatchWithRing[] | undefined) ?? []

  const isLoading = coupleQuery.isLoading || (couple?.status === 'ACTIVE' && matchesQuery.isLoading)
  const isError = coupleQuery.isError || matchesQuery.isError
  const isCoupled = couple?.status === 'ACTIVE'

  const getItemLayout = useCallback(
    (_data: ArrayLike<MatchWithRing> | null | undefined, index: number) => ({
      length: MATCH_CARD_HEIGHT,
      offset: MATCH_CARD_HEIGHT * index + 16 * index,
      index,
    }),
    [],
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient header */}
      <LinearGradient colors={['#fce7f3', '#ffffff']} style={styles.header}>
        <View style={styles.headerRow}>
          <LinearGradient
            colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
            style={styles.headerIcon}
          >
            <Sparkles size={20} color="#ffffff" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle} accessibilityRole="header">
              {t('matches.header.title')}
            </Text>
            {isCoupled && matches.length > 0 && (
              <Text style={styles.headerSubtitle}>
                {t('matches.header.subtitle', { count: matches.length })}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <MatchesListSkeleton />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('common.error.title')}</Text>
          <Text style={styles.emptySubtitle}>{t('matches.error.loadMatches')}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              coupleQuery.refetch()
              matchesQuery.refetch()
            }}
            accessibilityLabel={t('common.error.retryA11y')}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>{t('common.error.retry')}</Text>
          </Pressable>
        </View>
      ) : !isCoupled ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Heart size={48} color={theme.colors.ring.pink500} />
          </View>
          <Text style={styles.emptyTitle}>{t('matches.empty.noCoupleTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('matches.empty.noCoupleSubtitle')}</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Gem size={48} color={theme.colors.foreground.muted} />
          </View>
          <Text style={styles.emptyTitle}>{t('matches.empty.noMatchTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('matches.empty.noMatchSubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.listSpacer} />}
          getItemLayout={getItemLayout}
          windowSize={5}
          maxToRenderPerBatch={6}
          initialNumToRender={4}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={matchesQuery.isRefetching}
              onRefresh={() => matchesQuery.refetch()}
              tintColor={theme.colors.ring.pink500}
            />
          }
        />
      )}
    </View>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },

  // Header
  header: {
    paddingHorizontal: theme.spacing.page,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ui.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.foreground.secondary,
    marginTop: 2,
  },

  // List
  list: {
    padding: theme.spacing.page,
  },
  listSpacer: {
    height: 16,
  },

  // Card
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
  },
  cardImageWrapper: {
    height: 192,
    backgroundColor: theme.colors.background.imageZone,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardInfo: {
    padding: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 12,
  },

  // Inline specs with dot separators
  specsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  specText: {
    fontSize: 13,
    color: theme.colors.foreground.secondary,
  },
  specDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.ui.dot,
  },

  // Star rating
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  starIcon: {
    fontSize: 14,
  },
  starFilled: {
    color: theme.colors.accent.stars,
  },
  starEmpty: {
    color: theme.colors.ui.border,
  },
  reviewCount: {
    fontSize: 12,
    color: theme.colors.foreground.muted,
  },

  // Description
  cardDescription: {
    fontSize: 13,
    color: theme.colors.foreground.secondary,
    lineHeight: 18,
    marginBottom: 16,
  },

  // Details button
  detailsBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  detailsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
  },
  detailsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Empty / error states
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.page,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
    marginTop: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.foreground.secondary,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: theme.colors.ring.pink500,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})
