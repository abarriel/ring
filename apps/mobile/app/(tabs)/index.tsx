import type { Match, RingWithImages } from '@ring/shared'
import { Heart, RotateCcw, Sparkles, Star, theme, X } from '@ring/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router as expoRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useAuth } from '@/lib/auth-context'
import { hapticHeavy, hapticLight, hapticMedium } from '@/lib/haptics'
import { client, orpc } from '@/lib/orpc'
import { formatEnum, getInitials } from '@/lib/utils'

// ── Component ────────────────────────────────────────────────────────────────

export default function SwipeScreen() {
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const { isAuthenticated, user: authUser } = useAuth()
  const swipeThreshold = screenWidth * 0.35
  const [currentIndex, setCurrentIndex] = useState(0)
  const [celebrationMatch, setCelebrationMatch] = useState<Match | null>(null)
  const [celebrationRing, setCelebrationRing] = useState<RingWithImages | null>(null)
  const [showGate, setShowGate] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  const isAnonymous = !isAuthenticated
  const userInitials = authUser?.name ? getInitials(authUser.name) : '?'

  // Clear undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
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

      // Show undo button for 3 seconds
      setCanUndo(true)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => setCanUndo(false), 3000)
    },
    [translateX, translateY, isAnimating, persistSwipe],
  )

  const handleUndo = useCallback(() => {
    if (currentIndex <= 0) return
    setCurrentIndex((prev) => prev - 1)
    setCanUndo(false)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    hapticLight()
  }, [currentIndex])

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
          <View style={styles.headerLeft}>
            <Text style={styles.headerLogo} accessibilityRole="header">
              Ring
            </Text>
            {!isLoading && !isError && rings.length > 0 && !isFinished && (
              <Text
                style={styles.cardCounter}
                accessibilityLabel={`Bague ${currentIndex + 1} sur ${rings.length}`}
              >
                {currentIndex + 1}/{rings.length}
              </Text>
            )}
          </View>
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

                  {/* Inline specs with dot separators (matching mockup) */}
                  <View
                    style={styles.specsInline}
                    accessibilityLabel={`${currentRing.caratWeight} carats, ${formatEnum(currentRing.metalType)}, ${formatEnum(currentRing.style)}`}
                  >
                    <Text style={styles.specText}>{currentRing.caratWeight} ct</Text>
                    <View style={styles.specDot} />
                    <Text style={styles.specText}>{formatEnum(currentRing.metalType)}</Text>
                    <View style={styles.specDot} />
                    <Text style={styles.specText}>{formatEnum(currentRing.style)}</Text>
                  </View>

                  {/* Star rating */}
                  <View
                    style={styles.starsRow}
                    accessibilityLabel={`Note: ${Math.round(currentRing.rating)} sur 5, ${currentRing.reviewCount} avis`}
                  >
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
                          {'\u2605'}
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.reviewCount}>
                      ({currentRing.reviewCount.toLocaleString('fr-FR')} avis)
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
            {canUndo && currentIndex > 0 && (
              <Pressable
                style={[styles.actionBtn, styles.actionBtnSmall, styles.undoBtn]}
                onPress={handleUndo}
                accessibilityLabel="Annuler le dernier swipe"
                accessibilityRole="button"
              >
                <RotateCcw size={18} color={theme.colors.foreground.muted} strokeWidth={2.5} />
              </Pressable>
            )}

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
        {showGate && <SwipeGate onDismiss={() => setShowGate(false)} />}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.ring.pink500,
  },
  cardCounter: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.foreground.muted,
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
    ...theme.shadows.lg,
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
    // Drop shadow matching mockup: drop-shadow(0 8px 24px rgba(0,0,0,0.12))
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
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

  // Inline specs with dot separators
  specsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  specText: {
    fontSize: 14,
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
    ...theme.shadows.md,
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
  undoBtn: {
    borderColor: theme.colors.ui.border,
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
