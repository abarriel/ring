import type { RingWithImages } from '@ring/shared'
import { Heart, Star, theme, X } from '@ring/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getUser } from '@/lib/auth'
import { client, orpc } from '@/lib/orpc'
import { formatEnum } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function formatSpec(ring: RingWithImages): string[] {
  const specs: string[] = []
  if (ring.caratWeight) specs.push(`${ring.caratWeight} Carat`)
  if (ring.metalType) specs.push(formatEnum(ring.metalType))
  if (ring.style) specs.push(formatEnum(ring.style))
  return specs
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SwipeScreen() {
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const swipeThreshold = screenWidth * 0.35
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInitials, setUserInitials] = useState('?')
  const queryClient = useQueryClient()

  // Fetch user initials from storage
  useEffect(() => {
    getUser().then((user) => {
      if (user?.name) setUserInitials(getInitials(user.name))
    })
  }, [])

  // Fetch ring feed from API
  const feedQuery = useQuery(orpc.ring.feed.queryOptions({ input: { limit: 50 } }))
  const rings: RingWithImages[] = (feedQuery.data as RingWithImages[] | undefined) ?? []

  // Swipe mutation
  const swipeMutation = useMutation({
    mutationFn: (input: { ringId: string; direction: 'LIKE' | 'NOPE' | 'SUPER' }) =>
      client.swipe.create(input),
    onSuccess: () => {
      // Invalidate feed so next fetch excludes swiped rings
      queryClient.invalidateQueries({
        queryKey: orpc.ring.feed.queryOptions({ input: { limit: 50 } }).queryKey,
      })
      // Invalidate favorites so liked rings appear on the Favorites tab
      queryClient.invalidateQueries({
        queryKey: orpc.swipe.listLiked.queryOptions({ input: { limit: 50, offset: 0 } }).queryKey,
      })
    },
  })

  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const isAnimating = useSharedValue(false)

  const currentRing = rings[currentIndex]

  const persistSwipe = useCallback(
    (direction: 'LIKE' | 'NOPE' | 'SUPER') => {
      if (currentRing) {
        swipeMutation.mutate({ ringId: currentRing.id, direction })
      }
    },
    [currentRing, swipeMutation],
  )

  const advanceCard = useCallback(
    (direction: 'LIKE' | 'NOPE' | 'SUPER') => {
      persistSwipe(direction)
      setCurrentIndex((prev) => prev + 1)
      translateX.value = 0
      translateY.value = 0
      isAnimating.value = false
    },
    [translateX, translateY, isAnimating, persistSwipe],
  )

  const swipeOff = useCallback(
    (direction: 'left' | 'right') => {
      if (isAnimating.value) return
      isAnimating.value = true
      const target = direction === 'left' ? -screenWidth * 1.5 : screenWidth * 1.5
      const swipeDirection = direction === 'left' ? 'NOPE' : 'LIKE'
      translateX.value = withTiming(target, { duration: 300 }, () => {
        runOnJS(advanceCard)(swipeDirection)
      })
    },
    [translateX, isAnimating, screenWidth, advanceCard],
  )

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          if (isAnimating.value) return
          translateX.value = event.translationX
          translateY.value = event.translationY * 0.4
        })
        .onEnd((event) => {
          if (isAnimating.value) return
          if (Math.abs(event.translationX) > swipeThreshold) {
            isAnimating.value = true
            const direction = event.translationX > 0 ? 'right' : 'left'
            const target = direction === 'left' ? -screenWidth * 1.5 : screenWidth * 1.5
            const swipeDirection = direction === 'left' ? 'NOPE' : 'LIKE'
            translateX.value = withTiming(target, { duration: 300 }, () => {
              runOnJS(advanceCard)(swipeDirection as 'LIKE' | 'NOPE' | 'SUPER')
            })
          } else {
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 })
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 })
          }
        }),
    [translateX, translateY, isAnimating, screenWidth, swipeThreshold, advanceCard],
  )

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-screenWidth, 0, screenWidth], [-15, 0, 15])
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    }
  })

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 1]),
  }))

  const nopeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -swipeThreshold], [0, 1]),
  }))

  const handleNope = useCallback(() => swipeOff('left'), [swipeOff])
  const handleSuper = useCallback(() => {
    if (isAnimating.value) return
    isAnimating.value = true
    translateX.value = withTiming(0, { duration: 100 })
    translateY.value = withTiming(-screenWidth * 1.5, { duration: 300 }, () => {
      runOnJS(advanceCard)('SUPER')
    })
  }, [translateX, translateY, isAnimating, screenWidth, advanceCard])
  const handleLike = useCallback(() => swipeOff('right'), [swipeOff])

  const isFinished = !feedQuery.isLoading && currentIndex >= rings.length
  const isLoading = feedQuery.isLoading
  const isError = feedQuery.isError

  return (
    <LinearGradient colors={['#fff1f2', '#fce7f3']} style={styles.gradient}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLogo}>Ring</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
        </View>

        {/* Card area */}
        <View style={styles.cardArea}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={theme.colors.ring.pink500} />
              <Text style={styles.emptySubtitle}>Chargement des bagues...</Text>
            </View>
          ) : isError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Oups !</Text>
              <Text style={styles.emptySubtitle}>Impossible de charger les bagues.</Text>
              <Pressable style={styles.retryBtn} onPress={() => feedQuery.refetch()}>
                <Text style={styles.retryText}>Reessayer</Text>
              </Pressable>
            </View>
          ) : isFinished ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Plus de bagues !</Text>
              <Text style={styles.emptySubtitle}>Reviens plus tard pour en voir d'autres.</Text>
            </View>
          ) : currentRing ? (
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.card, cardAnimatedStyle]}>
                {/* LIKE overlay */}
                <Animated.View style={[styles.overlayLabel, styles.likeLabel, likeOverlayStyle]}>
                  <Text style={styles.likeLabelText}>LIKE</Text>
                </Animated.View>

                {/* NOPE overlay */}
                <Animated.View style={[styles.overlayLabel, styles.nopeLabel, nopeOverlayStyle]}>
                  <Text style={styles.nopeLabelText}>NOPE</Text>
                </Animated.View>

                {/* Image zone */}
                <View style={styles.imageZone}>
                  <Image source={{ uri: currentRing.images[0]?.url }} style={styles.productImage} />
                </View>

                {/* Ring info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{currentRing.name}</Text>

                  {/* Specs */}
                  <View style={styles.specsRow}>
                    {formatSpec(currentRing).map((spec, i) => (
                      <View key={spec} style={styles.specItem}>
                        {i > 0 && <View style={styles.specDot} />}
                        <Text style={styles.specText}>{spec}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Stars */}
                  <View style={styles.starsRow}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Text
                          key={`star-${n}`}
                          style={[
                            styles.starIcon,
                            n <= Math.round(currentRing.rating)
                              ? styles.starFilled
                              : styles.starEmpty,
                          ]}
                        >
                          *
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.reviewCount}>
                      ({currentRing.reviewCount.toLocaleString('en-US')} reviews)
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </GestureDetector>
          ) : null}
        </View>

        {/* Action buttons */}
        {!isFinished && !isLoading && !isError && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnLarge, styles.nopeBtn]}
              onPress={handleNope}
            >
              <X size={28} color={theme.colors.action.nope.icon} strokeWidth={2.5} />
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.actionBtnSmall, styles.superBtn]}
              onPress={handleSuper}
            >
              <Star size={20} color={theme.colors.action.super.icon} strokeWidth={2.5} />
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.actionBtnLarge, styles.likeBtn]}
              onPress={handleLike}
            >
              <Heart size={28} color={theme.colors.action.like.icon} strokeWidth={2.5} />
            </Pressable>
          </View>
        )}

        {/* Bottom safe area spacing */}
        <View style={{ height: insets.bottom + 8 }} />
      </View>
    </LinearGradient>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.page,
    paddingVertical: 8,
  },
  headerLogo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.ring.pink500,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.ui.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ui.avatarText,
  },

  // Card area
  cardArea: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 8,
  },
  card: {
    flex: 1,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.background.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
    overflow: 'hidden',
  },

  // Swipe overlay labels
  overlayLabel: {
    position: 'absolute',
    top: 40,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeLabel: {
    left: 20,
    borderColor: theme.colors.action.like.icon,
    backgroundColor: theme.colors.action.like.bg,
  },
  nopeLabel: {
    right: 20,
    borderColor: theme.colors.action.nope.icon,
    backgroundColor: theme.colors.action.nope.bg,
  },
  likeLabelText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.action.like.icon,
  },
  nopeLabelText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.action.nope.icon,
  },

  // Image zone
  imageZone: {
    flex: 1,
    backgroundColor: theme.colors.background.imageZone,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  productImage: {
    width: '65%',
    height: '80%',
    resizeMode: 'contain',
  },

  // Ring info
  productInfo: {
    paddingHorizontal: theme.spacing.cardX,
    paddingTop: theme.spacing.cardY,
    paddingBottom: theme.spacing.cardX,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Georgia',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 8,
  },

  // Specs
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.ui.dot,
  },
  specText: {
    fontSize: 14,
    color: theme.colors.foreground.secondary,
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.page,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: theme.colors.background.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtnLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  actionBtnSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  nopeBtn: {
    borderColor: theme.colors.action.nope.border,
  },
  superBtn: {
    borderColor: theme.colors.action.super.border,
  },
  likeBtn: {
    borderColor: theme.colors.action.like.border,
  },

  // Empty / loading / error states
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.foreground.DEFAULT,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.foreground.muted,
    marginTop: 8,
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
