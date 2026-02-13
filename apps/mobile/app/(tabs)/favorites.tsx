import type { RingWithImages } from '@ring/shared'
import { Heart, theme } from '@ring/ui'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
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

function RingCard({ ring }: { ring: RingWithImages }) {
  const imageUrl = ring.images[0]?.url

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/ring/${ring.id}`)}>
      <View style={styles.cardImage}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Heart size={24} color={theme.colors.foreground.muted} />
          </View>
        )}
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
        <View style={styles.cardRating}>
          <Text style={styles.cardStars}>{'*'.repeat(Math.round(ring.rating))}</Text>
          <Text style={styles.cardReviews}>({ring.reviewCount})</Text>
        </View>
      </View>
    </Pressable>
  )
}

export default function FavoritesScreen() {
  const isAuthed = useAuthGuard()
  const insets = useSafeAreaInsets()

  const favoritesQuery = useQuery({
    ...orpc.swipe.listLiked.queryOptions({ input: { limit: 50, offset: 0 } }),
    enabled: isAuthed,
  })
  const rings = (favoritesQuery.data as RingWithImages[] | undefined) ?? []

  const isLoading = favoritesQuery.isLoading
  const isError = favoritesQuery.isError

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris</Text>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.ring.pink500} />
        </View>
      ) : isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Oups !</Text>
          <Text style={styles.emptySubtitle}>Impossible de charger les favoris.</Text>
          <Pressable style={styles.retryBtn} onPress={() => favoritesQuery.refetch()}>
            <Text style={styles.retryText}>Reessayer</Text>
          </Pressable>
        </View>
      ) : rings.length === 0 ? (
        <View style={styles.emptyState}>
          <Heart size={48} color={theme.colors.foreground.muted} />
          <Text style={styles.emptyTitle}>Pas encore de favoris</Text>
          <Text style={styles.emptySubtitle}>Swipe pour en ajouter !</Text>
        </View>
      ) : (
        <FlatList
          data={rings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RingCard ring={item} />}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={favoritesQuery.isRefetching}
              onRefresh={() => favoritesQuery.refetch()}
              tintColor={theme.colors.ring.pink500}
            />
          }
        />
      )}
    </View>
  )
}

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
    marginBottom: 4,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStars: {
    fontSize: 10,
    color: theme.colors.accent.stars,
  },
  cardReviews: {
    fontSize: 10,
    color: theme.colors.foreground.muted,
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
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.foreground.muted,
    marginTop: 4,
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
})
