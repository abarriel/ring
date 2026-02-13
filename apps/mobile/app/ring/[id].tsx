import type { RingWithImages } from '@ring/shared'
import { ChevronLeft, Heart, theme, X } from '@ring/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { client, orpc } from '@/lib/orpc'
import { formatEnum } from '@/lib/utils'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.85

export default function RingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const navigation = useNavigation()

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }, [navigation])

  const ringQuery = useQuery(orpc.ring.get.queryOptions({ input: { id: id ?? '' } }))
  const ring = ringQuery.data as RingWithImages | undefined

  const swipeMutation = useMutation({
    mutationFn: (input: { ringId: string; direction: 'LIKE' | 'NOPE' | 'SUPER' }) =>
      client.swipe.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.swipe.listLiked.queryOptions({ input: { limit: 50, offset: 0 } }).queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: orpc.ring.feed.queryOptions({ input: { limit: 50 } }).queryKey,
      })
      goBack()
    },
  })

  const handleNope = useCallback(() => {
    if (!ring) return
    swipeMutation.mutate({ ringId: ring.id, direction: 'NOPE' })
  }, [ring, swipeMutation.mutate])

  const handleLike = useCallback(() => {
    if (!ring) return
    swipeMutation.mutate({ ringId: ring.id, direction: 'LIKE' })
  }, [ring, swipeMutation.mutate])

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems[0]?.index != null) {
        setActiveImageIndex(viewableItems[0].index)
      }
    },
    [],
  )

  if (ringQuery.isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.ring.pink500} />
      </View>
    )
  }

  if (ringQuery.isError || !ring) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Bague introuvable</Text>
        <Pressable style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>Retour</Text>
        </Pressable>
      </View>
    )
  }

  const specs = buildSpecs(ring)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back button */}
      <Pressable style={styles.headerBack} onPress={goBack}>
        <ChevronLeft size={24} color={theme.colors.foreground.DEFAULT} />
      </Pressable>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Image carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={ring.images}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
            renderItem={({ item }) => (
              <View style={styles.imageSlide}>
                <Image source={{ uri: item.url }} style={styles.carouselImage} />
              </View>
            )}
          />
          {/* Pagination dots */}
          {ring.images.length > 1 && (
            <View style={styles.dots}>
              {ring.images.map((img, i) => (
                <View
                  key={img.id}
                  style={[styles.dot, i === activeImageIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Ring info */}
        <View style={styles.infoSection}>
          <Text style={styles.ringName}>{ring.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Text
                  key={`star-${n}`}
                  style={[
                    styles.starIcon,
                    n <= Math.round(ring.rating) ? styles.starFilled : styles.starEmpty,
                  ]}
                >
                  *
                </Text>
              ))}
            </View>
            <Text style={styles.reviewCount}>
              ({ring.reviewCount.toLocaleString('en-US')} reviews)
            </Text>
          </View>

          {/* Specs */}
          <View style={styles.specsContainer}>
            {specs.map((spec) => (
              <View key={spec.label} style={styles.specRow}>
                <Text style={styles.specLabel}>{spec.label}</Text>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          {ring.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{ring.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.actionBtn, styles.nopeBtn]}
          onPress={handleNope}
          disabled={swipeMutation.isPending}
        >
          <X size={24} color={theme.colors.action.nope.icon} strokeWidth={2.5} />
          <Text style={styles.nopeBtnText}>Nope</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, styles.likeBtn]}
          onPress={handleLike}
          disabled={swipeMutation.isPending}
        >
          <Heart size={24} color={theme.colors.action.like.icon} strokeWidth={2.5} />
          <Text style={styles.likeBtnText}>Like</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSpecs(ring: RingWithImages) {
  const specs: { label: string; value: string }[] = []
  specs.push({ label: 'Metal', value: formatEnum(ring.metalType) })
  specs.push({ label: 'Pierre', value: formatEnum(ring.stoneType) })
  if (ring.caratWeight) specs.push({ label: 'Carats', value: `${ring.caratWeight}` })
  specs.push({ label: 'Style', value: formatEnum(ring.style) })
  return specs
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 12,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.ring.pink500,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Header
  headerBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    paddingTop: 8,
    paddingLeft: theme.spacing.page,
    paddingRight: 16,
    paddingBottom: 16,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Carousel
  carouselContainer: {
    backgroundColor: theme.colors.background.imageZone,
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  carouselImage: {
    width: '70%',
    height: '85%',
    resizeMode: 'contain',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.ui.border,
  },
  dotActive: {
    backgroundColor: theme.colors.ring.pink500,
  },

  // Info
  infoSection: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.cardY,
  },
  ringName: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Georgia',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 8,
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  starIcon: {
    fontSize: 16,
  },
  starFilled: {
    color: theme.colors.accent.stars,
  },
  starEmpty: {
    color: theme.colors.ui.border,
  },
  reviewCount: {
    fontSize: 13,
    color: theme.colors.foreground.muted,
  },

  // Specs
  specsContainer: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 14,
    color: theme.colors.foreground.muted,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground.DEFAULT,
  },

  // Description
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.foreground.secondary,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: theme.spacing.page,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ui.border,
    backgroundColor: theme.colors.background.surface,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
  },
  nopeBtn: {
    borderColor: theme.colors.action.nope.border,
    backgroundColor: theme.colors.action.nope.bg,
  },
  nopeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.action.nope.icon,
  },
  likeBtn: {
    borderColor: theme.colors.action.like.border,
    backgroundColor: theme.colors.action.like.bg,
  },
  likeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.action.like.icon,
  },
})
