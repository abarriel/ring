import type { RingWithImages } from '@ring/shared'
import { ExternalLink, Gem, Heart, Sparkles, theme } from '@ring/ui'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { router as expoRouter } from 'expo-router'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { orpc } from '@/lib/orpc'
import { useAuthGuard } from '@/lib/use-auth-guard'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatEnum(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Types ────────────────────────────────────────────────────────────────────

type MatchWithRing = {
  id: string
  coupleId: string
  ringId: string
  createdAt: Date
  ring: RingWithImages
}

// ── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: MatchWithRing }) {
  const { ring } = match
  const imageUrl = ring.images[0]?.url

  return (
    <View style={styles.card}>
      {/* Image */}
      <View style={styles.cardImageWrapper}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
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
          <Text style={styles.matchBadgeText}>Match</Text>
        </LinearGradient>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{ring.name}</Text>

        <View style={styles.specsTable}>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Style</Text>
            <Text style={styles.specValue}>{formatEnum(ring.style)}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Metal</Text>
            <Text style={styles.specValue}>{formatEnum(ring.metalType)}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Pierre</Text>
            <Text style={styles.specValue}>
              {formatEnum(ring.stoneType)} - {ring.caratWeight} ct
            </Text>
          </View>
        </View>

        {ring.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {ring.description}
          </Text>
        )}

        <Pressable style={styles.detailsBtn} onPress={() => expoRouter.push(`/ring/${ring.id}`)}>
          <LinearGradient
            colors={[theme.colors.ring.rose400, theme.colors.ring.pink500]}
            style={styles.detailsBtnGradient}
          >
            <Text style={styles.detailsBtnText}>Voir les details</Text>
            <ExternalLink size={16} color="#ffffff" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const isAuthed = useAuthGuard()
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
            <Text style={styles.headerTitle}>Tes matchs</Text>
            {isCoupled && matches.length > 0 && (
              <Text style={styles.headerSubtitle}>
                {matches.length} bague{matches.length !== 1 ? 's' : ''} que vous aimez tous les deux
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.ring.pink500} />
        </View>
      ) : isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Oups !</Text>
          <Text style={styles.emptySubtitle}>Impossible de charger les matchs.</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              coupleQuery.refetch()
              matchesQuery.refetch()
            }}
          >
            <Text style={styles.retryText}>Reessayer</Text>
          </Pressable>
        </View>
      ) : !isCoupled ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Heart size={48} color={theme.colors.ring.pink500} />
          </View>
          <Text style={styles.emptyTitle}>Pas encore de matchs</Text>
          <Text style={styles.emptySubtitle}>
            Commence a parcourir les bagues et matcher avec ton partenaire
          </Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Gem size={48} color={theme.colors.foreground.muted} />
          </View>
          <Text style={styles.emptyTitle}>Pas encore de match</Text>
          <Text style={styles.emptySubtitle}>
            Swipez tous les deux pour trouver vos coups de coeur !
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.listSpacer} />}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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
    resizeMode: 'cover',
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

  // Specs
  specsTable: {
    gap: 4,
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 13,
    color: theme.colors.foreground.muted,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.foreground.secondary,
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
