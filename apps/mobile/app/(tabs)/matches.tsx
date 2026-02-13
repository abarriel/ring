import type { RingWithImages } from '@ring/shared'
import { Gem, theme, Users } from '@ring/ui'
import { useQuery } from '@tanstack/react-query'
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
    <Pressable style={styles.card} onPress={() => expoRouter.push(`/ring/${ring.id}`)}>
      <View style={styles.cardImage}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Gem size={24} color={theme.colors.foreground.muted} />
          </View>
        )}
        {/* Match badge */}
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>Match !</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {ring.name}
        </Text>
        <Text style={styles.cardMetal} numberOfLines={1}>
          {ring.metalType
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </Text>
      </View>
    </Pressable>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matchs</Text>
      </View>

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
          <Users size={48} color={theme.colors.foreground.muted} />
          <Text style={styles.emptyTitle}>Couple-toi pour trouver des matchs !</Text>
          <Text style={styles.emptySubtitle}>Va dans ton profil pour inviter ton partenaire.</Text>
          <Pressable style={styles.ctaBtn} onPress={() => expoRouter.push('/profile')}>
            <Text style={styles.ctaText}>Aller au profil</Text>
          </Pressable>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Gem size={48} color={theme.colors.foreground.muted} />
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
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
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
  header: {
    paddingHorizontal: theme.spacing.page,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
  },

  // List
  list: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: 24,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    aspectRatio: 1,
    backgroundColor: theme.colors.background.imageZone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.ring.pink500,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardInfo: {
    padding: 10,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Georgia',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 2,
  },
  cardMetal: {
    fontSize: 11,
    color: theme.colors.foreground.secondary,
  },

  // Empty / error states
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.page,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.foreground.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.ring.pink500,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  ctaBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.ring.pink500,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})
