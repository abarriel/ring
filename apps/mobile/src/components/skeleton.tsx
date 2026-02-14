import { theme } from '@ring/ui'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

// ── Base Skeleton Block ──────────────────────────────────────────────────────

type SkeletonBlockProps = {
  width?: number | `${number}%`
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function SkeletonBlock({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const { t } = useTranslation()
  const shimmer = useSharedValue(0)

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true)
  }, [shimmer])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.8]),
  }))

  return (
    <Animated.View
      accessibilityRole="none"
      accessibilityLabel={t('common.loading')}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.ui.border,
        },
        animatedStyle,
        style,
      ]}
    />
  )
}

// ── Skeleton: Swipe Card ─────────────────────────────────────────────────────

export function SwipeCardSkeleton() {
  const { t } = useTranslation()

  return (
    <View style={skeletonStyles.swipeCard} accessibilityLabel={t('skeleton.swipeCard')}>
      <View style={skeletonStyles.swipeImage}>
        <SkeletonBlock width={180} height={180} borderRadius={16} />
      </View>
      <View style={skeletonStyles.swipeInfo}>
        <SkeletonBlock width="60%" height={22} borderRadius={6} />
        <View style={skeletonStyles.swipeSpecs}>
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="80%" height={14} />
        </View>
        <SkeletonBlock width="90%" height={12} />
      </View>
    </View>
  )
}

// ── Skeleton: Favorites Grid ─────────────────────────────────────────────────

export function FavoritesGridSkeleton() {
  const { t } = useTranslation()

  return (
    <View style={skeletonStyles.favGrid} accessibilityLabel={t('skeleton.favorites')}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={skeletonStyles.favCard}>
          <SkeletonBlock width="100%" height={140} borderRadius={0} />
          <View style={skeletonStyles.favInfo}>
            <SkeletonBlock width="80%" height={14} />
            <SkeletonBlock width="50%" height={10} />
          </View>
        </View>
      ))}
    </View>
  )
}

// ── Skeleton: Matches List ───────────────────────────────────────────────────

export function MatchesListSkeleton() {
  const { t } = useTranslation()

  return (
    <View style={skeletonStyles.matchesList} accessibilityLabel={t('skeleton.matches')}>
      {[0, 1].map((i) => (
        <View key={i} style={skeletonStyles.matchCard}>
          <SkeletonBlock width="100%" height={192} borderRadius={0} />
          <View style={skeletonStyles.matchInfo}>
            <SkeletonBlock width="60%" height={18} />
            <View style={skeletonStyles.matchSpecs}>
              <SkeletonBlock width="100%" height={14} />
              <SkeletonBlock width="100%" height={14} />
              <SkeletonBlock width="80%" height={14} />
            </View>
            <SkeletonBlock width="100%" height={44} borderRadius={24} />
          </View>
        </View>
      ))}
    </View>
  )
}

// ── Skeleton: Profile ────────────────────────────────────────────────────────

export function ProfileSkeleton() {
  const { t } = useTranslation()

  return (
    <View style={skeletonStyles.profile} accessibilityLabel={t('skeleton.profile')}>
      <View style={skeletonStyles.profileHeader}>
        <SkeletonBlock width={80} height={80} borderRadius={40} />
        <View style={skeletonStyles.profileNameArea}>
          <SkeletonBlock width={120} height={22} />
          <SkeletonBlock width={80} height={14} />
        </View>
      </View>
      <View style={skeletonStyles.profileStats}>
        <SkeletonBlock width="48%" height={70} borderRadius={12} />
        <SkeletonBlock width="48%" height={70} borderRadius={12} />
      </View>
      <View style={skeletonStyles.profileBody}>
        <SkeletonBlock width="100%" height={100} borderRadius={12} />
        <SkeletonBlock width="100%" height={60} borderRadius={12} />
        <SkeletonBlock width="100%" height={60} borderRadius={12} />
      </View>
    </View>
  )
}

// ── Skeleton: Ring Detail ────────────────────────────────────────────────────

export function RingDetailSkeleton() {
  const { t } = useTranslation()

  return (
    <View style={skeletonStyles.ringDetail} accessibilityLabel={t('skeleton.ringDetail')}>
      <SkeletonBlock width="100%" height={280} borderRadius={0} />
      <View style={skeletonStyles.ringDetailInfo}>
        <SkeletonBlock width="60%" height={24} />
        <SkeletonBlock width="40%" height={14} style={{ marginTop: 8 }} />
        <View style={skeletonStyles.ringDetailSpecs}>
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="80%" height={14} />
        </View>
        <SkeletonBlock width="100%" height={40} />
      </View>
    </View>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const skeletonStyles = StyleSheet.create({
  // Swipe card
  swipeCard: {
    flex: 1,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.background.card,
    overflow: 'hidden',
  },
  swipeImage: {
    flex: 1,
    backgroundColor: theme.colors.background.imageZone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeInfo: {
    padding: theme.spacing.cardX,
    gap: 10,
  },
  swipeSpecs: {
    gap: 6,
  },

  // Favorites grid
  favGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: theme.spacing.page,
    paddingTop: 12,
  },
  favCard: {
    width: '47%',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  favInfo: {
    padding: 10,
    gap: 6,
  },

  // Matches list
  matchesList: {
    padding: theme.spacing.page,
    gap: 16,
  },
  matchCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
  },
  matchInfo: {
    padding: 16,
    gap: 12,
  },
  matchSpecs: {
    gap: 4,
  },

  // Profile
  profile: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: theme.spacing.page,
    paddingVertical: 16,
  },
  profileNameArea: {
    gap: 6,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.page,
    paddingBottom: 20,
  },
  profileBody: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 20,
    gap: 12,
  },

  // Ring detail
  ringDetail: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },
  ringDetailInfo: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.cardY,
    gap: 8,
  },
  ringDetailSpecs: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    gap: 12,
    marginTop: 12,
  },
})
