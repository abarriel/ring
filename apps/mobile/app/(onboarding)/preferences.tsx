import { theme } from '@ring/ui'
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type PreferenceOption = { key: string; labelKey: string }

const METALS: PreferenceOption[] = [
  { key: 'YELLOW_GOLD', labelKey: 'preferences.metals.yellowGold' },
  { key: 'WHITE_GOLD', labelKey: 'preferences.metals.whiteGold' },
  { key: 'ROSE_GOLD', labelKey: 'preferences.metals.roseGold' },
  { key: 'PLATINUM', labelKey: 'preferences.metals.platinum' },
  { key: 'SILVER', labelKey: 'preferences.metals.silver' },
]

const STONES: PreferenceOption[] = [
  { key: 'DIAMOND', labelKey: 'preferences.stones.diamond' },
  { key: 'SAPPHIRE', labelKey: 'preferences.stones.sapphire' },
  { key: 'EMERALD', labelKey: 'preferences.stones.emerald' },
  { key: 'RUBY', labelKey: 'preferences.stones.ruby' },
  { key: 'MOISSANITE', labelKey: 'preferences.stones.moissanite' },
  { key: 'MORGANITE', labelKey: 'preferences.stones.morganite' },
]

const RING_STYLES: PreferenceOption[] = [
  { key: 'SOLITAIRE', labelKey: 'preferences.styles.solitaire' },
  { key: 'HALO', labelKey: 'preferences.styles.halo' },
  { key: 'VINTAGE', labelKey: 'preferences.styles.vintage' },
  { key: 'PAVE', labelKey: 'preferences.styles.pave' },
  { key: 'THREE_STONE', labelKey: 'preferences.styles.threeStone' },
]

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const [selectedMetals, setSelectedMetals] = useState<string[]>([])
  const [selectedStones, setSelectedStones] = useState<string[]>([])
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])

  const toggleSelection = (key: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key))
    } else {
      setSelected([...selected, key])
    }
  }

  const handleContinue = () => {
    // TODO: Save preferences to API when endpoint exists
    router.replace('/(onboarding)/pair')
  }

  const handleSkip = () => {
    router.replace('/(onboarding)/pair')
  }

  const renderChips = (
    options: PreferenceOption[],
    selected: string[],
    setSelected: (v: string[]) => void,
  ) => (
    <View style={styles.chipGrid}>
      {options.map(({ key, labelKey }) => {
        const isSelected = selected.includes(key)
        return (
          <Pressable
            key={key}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => toggleSelection(key, selected, setSelected)}
            accessibilityLabel={t(labelKey)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {t(labelKey)}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <View style={styles.stepDotActive} />
        <View style={styles.stepDot} />
        <View style={styles.stepDot} />
      </View>

      {/* Heading */}
      <Text style={styles.heading} accessibilityRole="header">
        {t('preferences.heading')}
      </Text>
      <Text style={styles.subtitle}>{t('preferences.subtitle')}</Text>

      {/* Metals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('preferences.metalsTitle')}</Text>
        {renderChips(METALS, selectedMetals, setSelectedMetals)}
      </View>

      {/* Stones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('preferences.stonesTitle')}</Text>
        {renderChips(STONES, selectedStones, setSelectedStones)}
      </View>

      {/* Styles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('preferences.stylesTitle')}</Text>
        {renderChips(RING_STYLES, selectedStyles, setSelectedStyles)}
      </View>

      {/* Buttons */}
      <View style={styles.buttonsSection}>
        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityLabel={t('preferences.continue')}
          accessibilityRole="button"
        >
          <Text style={styles.continueText}>{t('preferences.continue')}</Text>
        </Pressable>

        <Pressable
          onPress={handleSkip}
          accessibilityLabel={t('preferences.skip')}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>{t('preferences.skip')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
  },
  content: {
    paddingHorizontal: theme.spacing.page,
    gap: 24,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDotActive: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  stepDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.background.tag,
  },

  // Heading
  heading: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fontSizes['3xl'],
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    lineHeight: theme.lineHeights['3xl'],
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.muted,
    textAlign: 'center',
    lineHeight: theme.lineHeights.md,
  },

  // Section
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    backgroundColor: theme.colors.background.card,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  chipText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.foreground.DEFAULT,
  },
  chipTextSelected: {
    color: theme.colors.primary,
  },

  // Buttons
  buttonsSection: {
    gap: 16,
    alignItems: 'center',
    paddingTop: 8,
  },
  continueButton: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semiBold,
    color: theme.colors.foreground.inverse,
  },
  skipText: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.regular,
    color: theme.colors.foreground.muted,
    textDecorationLine: 'underline',
  },
})
