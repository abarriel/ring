import type { RingWithImages } from '@ring/shared'
import { Heart, theme } from '@ring/ui'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useCallback } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FavoritesGridSkeleton } from '@/components/skeleton'
import { useAuth } from '@/lib/auth-context'
import { hapticLight } from '@/lib/haptics'
import { orpc } from '@/lib/orpc'
import { formatEnum } from '@/lib/utils'

const _CARD_HEIGHT = 220 // aspect-ratio image (~160) + info (~60)

function RingCard({ ring }: { ring: RingWithImages }) {
  const imageUrl = ring.images[0]?.url

  const handlePress = useCallback(() => {
    hapticLight()
    router.push(`/ring/${ring.id}`)
  }, [ring.id])

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      accessibilityLabel={`Bague ${ring.name}, ${ring.metalType.replace(/_/g, ' ').toLowerCase()}`}
      accessibilityRole="button"
      accessibilityHint="Appuie pour voir les details"
    >
      <View style={styles.cardImage}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`Photo de ${ring.name}`}
          />
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
          {formatEnum(ring.metalType)}
        </Text>
        <View style={styles.cardRating}>
          <Text style={styles.cardStars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Text
                key={`s-${n}`}
                style={n <= Math.round(ring.rating) ? styles.starFilled : styles.starEmpty}
              >
                {'\u2605'}
              </Text>
            ))}
          </Text>
          <Text style={styles.cardReviews}>({ring.reviewCount})</Text>
        </View>
      </View>
    </Pressable>
  )
}

export default function FavoritesScreen() {
  const { isAuthenticated: isAuthed } = useAuth()
  const insets = useSafeAreaInsets()

  const favoritesQuery = useQuery({
    ...orpc.swipe.listLiked.queryOptions({ input: { limit: 50, offset: 0 } }),
    enabled: isAuthed,
  })
  const rings = (favoritesQuery.data as RingWithImages[] | undefined) ?? []

  const isLoading = favoritesQuery.isLoading
  const isError = favoritesQuery.isError

  // Note: getItemLayout removed — inaccurate for 2-column FlatList with variable row heights.
  // FlatList virtualization settings (windowSize, maxToRenderPerBatch) are sufficient.

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Favoris
        </Text>
      </View>

      {isLoading ? (
        <FavoritesGridSkeleton />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Oups !</Text>
          <Text style={styles.emptySubtitle}>Impossible de charger les favoris.</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => favoritesQuery.refetch()}
            accessibilityLabel="Reessayer le chargement"
            accessibilityRole="button"
          >
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
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          removeClippedSubviews
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
    ...theme.shadows.sm,
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
  },
  starFilled: {
    color: theme.colors.accent.stars,
  },
  starEmpty: {
    color: theme.colors.ui.border,
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
