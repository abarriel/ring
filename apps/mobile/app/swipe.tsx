import { Heart, Star, theme, X } from '@ring/ui'
import { LinearGradient } from 'expo-linear-gradient'
import { useCallback, useState } from 'react'
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native'
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

// ── Mock data ────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  specs: string[]
  price: number
  rating: number
  reviews: number
  image: string
}

const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Eternal Promise',
    specs: ['2.5 Carat', 'Platinum', 'Princess Cut'],
    price: 8500,
    rating: 5,
    reviews: 2847,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop',
  },
  {
    id: '2',
    name: 'Celestial Halo',
    specs: ['1.8 Carat', 'White Gold', 'Round Cut'],
    price: 6200,
    rating: 4,
    reviews: 1923,
    image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=400&h=400&fit=crop',
  },
  {
    id: '3',
    name: 'Vintage Rosalie',
    specs: ['3.0 Carat', 'Rose Gold', 'Oval Cut'],
    price: 12400,
    rating: 5,
    reviews: 3156,
    image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=400&h=400&fit=crop',
  },
  {
    id: '4',
    name: 'Diamond Solitaire',
    specs: ['2.0 Carat', 'Platinum', 'Emerald Cut'],
    price: 9800,
    rating: 4,
    reviews: 2104,
    image: 'https://images.unsplash.com/photo-1589674781759-c21c37956a44?w=400&h=400&fit=crop',
  },
  {
    id: '5',
    name: 'Moonlight Pavé',
    specs: ['1.5 Carat', 'White Gold', 'Cushion Cut'],
    price: 5400,
    rating: 5,
    reviews: 1687,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop',
  },
]

// ── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35

// ── Component ────────────────────────────────────────────────────────────────

export default function SwipeScreen() {
  const insets = useSafeAreaInsets()
  const [currentIndex, setCurrentIndex] = useState(0)

  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  const currentProduct = PRODUCTS[currentIndex]

  const advanceCard = useCallback(() => {
    setCurrentIndex((prev) => prev + 1)
    translateX.value = 0
    translateY.value = 0
  }, [translateX, translateY])

  const swipeOff = useCallback(
    (direction: 'left' | 'right') => {
      const target = direction === 'left' ? -SCREEN_WIDTH * 1.5 : SCREEN_WIDTH * 1.5
      translateX.value = withTiming(target, { duration: 300 }, () => {
        runOnJS(advanceCard)()
      })
    },
    [translateX, advanceCard],
  )

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX
      translateY.value = event.translationY * 0.4
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left'
        const target = direction === 'left' ? -SCREEN_WIDTH * 1.5 : SCREEN_WIDTH * 1.5
        translateX.value = withTiming(target, { duration: 300 }, () => {
          runOnJS(advanceCard)()
        })
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 })
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 })
      }
    })

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15])
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    }
  })

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }))

  const nopeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, 1]),
  }))

  const handleNope = useCallback(() => swipeOff('left'), [swipeOff])
  const handleSuper = useCallback(() => {
    // Super-like: animate upward
    translateY.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
      runOnJS(advanceCard)()
    })
  }, [translateY, advanceCard])
  const handleLike = useCallback(() => swipeOff('right'), [swipeOff])

  const formatPrice = (price: number) => `$${price.toLocaleString('en-US')}`

  const isFinished = currentIndex >= PRODUCTS.length

  return (
    <LinearGradient colors={['#fff1f2', '#fce7f3']} style={styles.gradient}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLogo}>Ring</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AB</Text>
          </View>
        </View>

        {/* Card area */}
        <View style={styles.cardArea}>
          {isFinished ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Plus de bagues !</Text>
              <Text style={styles.emptySubtitle}>Reviens plus tard pour en voir d'autres.</Text>
            </View>
          ) : currentProduct ? (
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
                  <Image source={{ uri: currentProduct.image }} style={styles.productImage} />
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>{formatPrice(currentProduct.price)}</Text>
                  </View>
                </View>

                {/* Product info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{currentProduct.name}</Text>

                  {/* Specs */}
                  <View style={styles.specsRow}>
                    {currentProduct.specs.map((spec, i) => (
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
                            n <= currentProduct.rating ? styles.starFilled : styles.starEmpty,
                          ]}
                        >
                          ★
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.reviewCount}>
                      ({currentProduct.reviews.toLocaleString('en-US')} reviews)
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </GestureDetector>
          ) : null}
        </View>

        {/* Action buttons */}
        {!isFinished && (
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
  priceBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: theme.colors.accent.price.bg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent.price.text,
  },

  // Product info
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

  // Empty state
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
  },
})
