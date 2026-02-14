import type { Match, RingWithImages } from '@ring/shared'
import { Heart, Sparkles, Star, theme, X } from '@ring/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router as expoRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
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
import { CelebrationModal } from '@/components/celebration-modal'
import { SwipeCardSkeleton } from '@/components/skeleton'
import { SwipeGate } from '@/components/swipe-gate'
import { ANONYMOUS_SWIPE_LIMIT, saveAnonymousSwipe } from '@/lib/anonymous-swipes'
import { getToken, getUser } from '@/lib/auth'
import { hapticHeavy, hapticLight, hapticMedium } from '@/lib/haptics'
import { client, orpc } from '@/lib/orpc'
import { getInitials } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatEnum(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SwipeScreen() {
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const swipeThreshold = screenWidth * 0.35
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInitials, setUserInitials] = useState('?')
  const [celebrationMatch, setCelebrationMatch] = useState<Match | null>(null)
  const [celebrationRing, setCelebrationRing] = useState<RingWithImages | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [_anonymousSwipeCount, setAnonymousSwipeCount] = useState(0)
  const [showGate, setShowGate] = useState(false)
  const queryClient = useQueryClient()

  // Detect auth state on mount
  useEffect(() => {
    getToken().then((token) => {
      setIsAnonymous(!token)
    })
    getUser().then((user) => {
      if (user?.name) setUserInitials(getInitials(user.name))
    })
  }, [])

  // Anonymous mode: fetch public ring list
  const listQuery = useQuery({
    ...orpc.ring.list.queryOptions({ input: { limit: 50, offset: 0 } }),
    enabled: isAnonymous,
  })

  // Authenticated mode: fetch personalized feed
  const feedQuery = useQuery({
    ...orpc.ring.feed.queryOptions({ input: { limit: 50 } }),
    enabled: !isAnonymous,
  })

  const activeQuery = isAnonymous ? listQuery : feedQuery
  const rings: RingWithImages[] = (activeQuery.data as RingWithImages[] | undefined) ?? []

  // Swipe mutation (only used in authenticated mode)
  const swipeMutation = useMutation({
    mutationFn: (input: { ringId: string; direction: 'LIKE' | 'NOPE' | 'SUPER' }) =>
      client.swipe.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: orpc.ring.feed.queryOptions({ input: { limit: 50 } }).queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: orpc.swipe.listLiked.queryOptions({ input: { limit: 50, offset: 0 } }).queryKey,
      })
      if (data.match) {
        queryClient.invalidateQueries({
          queryKey: orpc.match.list.queryOptions({ input: { limit: 50, offset: 0 } }).queryKey,
        })
        const matchedRing = rings.find((r) => r.id === data.match?.ringId) ?? null
        setCelebrationMatch(data.match)
        setCelebrationRing(matchedRing)
      }
    },
  })

  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const isAnimating = useSharedValue(false)

  const currentRing = rings[currentIndex]

  const persistSwipe = useCallback(
    (direction: 'LIKE' | 'NOPE' | 'SUPER') => {
      if (!currentRing) return
      if (isAnonymous) {
        // Store locally for anonymous users
        saveAnonymousSwipe({ ringId: currentRing.id, direction }).then((swipes) => {
          setAnonymousSwipeCount(swipes.length)
          if (swipes.length >= ANONYMOUS_SWIPE_LIMIT) {
            setShowGate(true)
          }
        })
      } else {
        swipeMutation.mutate({ ringId: currentRing.id, direction })
      }
    },
    [currentRing, isAnonymous, swipeMutation],
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

  const handleNope = useCallback(() => {
    hapticLight()
    swipeOff('left')
  }, [swipeOff])

  const handleSuper = useCallback(() => {
    if (isAnimating.value) return
    hapticHeavy()
    isAnimating.value = true
    translateX.value = withTiming(0, { duration: 100 })
    translateY.value = withTiming(-screenWidth * 1.5, { duration: 300 }, () => {
      runOnJS(advanceCard)('SUPER')
    })
  }, [translateX, translateY, isAnimating, screenWidth, advanceCard])

  const handleLike = useCallback(() => {
    hapticMedium()
    swipeOff('right')
  }, [swipeOff])

  const isFinished = !activeQuery.isLoading && currentIndex >= rings.length
  const isLoading = activeQuery.isLoading
  const isError = activeQuery.isError

  return (
    <LinearGradient colors={['#fff1f2', '#fce7f3']} style={styles.gradient}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLogo} accessibilityRole="header">
            Ring
          </Text>
          {isAnonymous ? (
            <Pressable
              style={styles.loginBtn}
              onPress={() => expoRouter.push('/login')}
              accessibilityLabel="S'inscrire"
              accessibilityRole="button"
            >
              <Text style={styles.loginBtnText}>S'inscrire</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.avatar}
              onPress={() => expoRouter.push('/profile')}
              accessibilityLabel="Voir le profil"
              accessibilityRole="button"
            >
              <Text style={styles.avatarText}>{userInitials}</Text>
            </Pressable>
          )}
        </View>

        {/* Card area */}
        <View style={styles.cardArea}>
          {isLoading ? (
            <SwipeCardSkeleton />
          ) : isError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Oups !</Text>
              <Text style={styles.emptySubtitle}>Impossible de charger les bagues.</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => activeQuery.refetch()}
                accessibilityLabel="Reessayer le chargement"
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Reessayer</Text>
              </Pressable>
            </View>
          ) : isFinished ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Sparkles size={48} color={theme.colors.foreground.muted} />
              </View>
              <Text style={styles.emptyTitle}>Plus de bagues !</Text>
              <Text style={styles.emptySubtitle}>Tu as vu toutes les bagues disponibles.</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => expoRouter.push('/matches')}
                accessibilityLabel="Voir tes matchs"
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Voir tes matchs</Text>
              </Pressable>
            </View>
          ) : currentRing ? (
            <GestureDetector gesture={panGesture}>
              <Animated.View
                style={[styles.card, cardAnimatedStyle]}
                accessibilityLabel={`Bague ${currentRing.name}`}
                accessibilityHint="Swipe a gauche pour passer, a droite pour liker"
              >
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
                  <Image
                    source={{ uri: currentRing.images[0]?.url }}
                    style={styles.productImage}
                    contentFit="contain"
                    transition={200}
                    accessibilityLabel={`Photo de ${currentRing.name}`}
                  />
                </View>

                {/* Ring info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{currentRing.name}</Text>

                  {/* Key-value specs */}
                  <View style={styles.specsTable} accessibilityLabel="Specifications de la bague">
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Style</Text>
                      <Text style={styles.specValue}>{formatEnum(currentRing.style)}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Metal</Text>
                      <Text style={styles.specValue}>{formatEnum(currentRing.metalType)}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Pierre</Text>
                      <Text style={styles.specValue}>{formatEnum(currentRing.stoneType)}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Carat</Text>
                      <Text style={styles.specValue}>{currentRing.caratWeight} ct</Text>
                    </View>
                  </View>

                  {/* Description */}
                  {currentRing.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {currentRing.description}
                    </Text>
                  )}
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
              accessibilityLabel="Passer cette bague"
              accessibilityRole="button"
            >
              <X size={28} color={theme.colors.action.nope.icon} strokeWidth={2.5} />
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.actionBtnSmall, styles.superBtn]}
              onPress={handleSuper}
              accessibilityLabel="Super like"
              accessibilityRole="button"
            >
              <Star size={20} color={theme.colors.action.super.icon} strokeWidth={2.5} />
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.actionBtnLarge, styles.likeBtn]}
              onPress={handleLike}
              accessibilityLabel="Liker cette bague"
              accessibilityRole="button"
            >
              <Heart size={28} color={theme.colors.action.like.icon} strokeWidth={2.5} />
            </Pressable>
          </View>
        )}

        {/* Bottom safe area spacing */}
        <View style={{ height: insets.bottom + 8 }} />

        {/* Anonymous swipe gate */}
        {showGate && <SwipeGate />}
      </View>

      {/* Match celebration modal */}
      <CelebrationModal
        visible={celebrationMatch !== null}
        ring={celebrationRing}
        onClose={() => {
          setCelebrationMatch(null)
          setCelebrationRing(null)
        }}
        onViewMatch={() => {
          setCelebrationMatch(null)
          setCelebrationRing(null)
          expoRouter.push('/matches')
        }}
      />
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
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.ring.pink500,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
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

  // Specs table (key-value rows)
  specsTable: {
    gap: 6,
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
    color: theme.colors.foreground.DEFAULT,
  },

  // Description
  productDescription: {
    fontSize: 13,
    color: theme.colors.foreground.secondary,
    lineHeight: 18,
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
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.background.imageZone,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
