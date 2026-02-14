import type { RingWithImages } from '@ring/shared'
import { Gem, theme } from '@ring/ui'
import { Image } from 'expo-image'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { hapticSuccess } from '@/lib/haptics'

type CelebrationModalProps = {
  visible: boolean
  ring: RingWithImages | null
  onClose: () => void
  onViewMatch: () => void
}

export function CelebrationModal({ visible, ring, onClose, onViewMatch }: CelebrationModalProps) {
  const { t } = useTranslation()
  const imageUrl = ring?.images[0]?.url

  useEffect(() => {
    if (visible) hapticSuccess()
  }, [visible])

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay} accessibilityLabel={t('celebration.a11y')}>
        <View style={styles.content}>
          {/* Ring image */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.ringImage}
                contentFit="contain"
                accessibilityLabel={t('common.ringPhotoA11y', {
                  name: ring?.name ?? t('common.ringFallbackName'),
                })}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Gem size={48} color={theme.colors.ring.pink500} />
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title} accessibilityRole="header">
            {t('celebration.title')}
          </Text>
          <Text style={styles.subtitle}>{t('celebration.subtitle')}</Text>

          {/* Ring name */}
          {ring && <Text style={styles.ringName}>{ring.name}</Text>}

          {/* Actions */}
          <Pressable
            style={styles.viewBtn}
            onPress={onViewMatch}
            accessibilityLabel={t('celebration.viewMatch')}
            accessibilityRole="button"
          >
            <Text style={styles.viewBtnText}>{t('celebration.viewMatch')}</Text>
          </Pressable>

          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel={t('celebration.continueA11y')}
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>{t('celebration.continue')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.page,
  },
  content: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  imageContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.background.imageZone,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  ringImage: {
    width: '80%',
    height: '80%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.ring.pink500,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.foreground.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  ringName: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Georgia',
    color: theme.colors.foreground.DEFAULT,
    textAlign: 'center',
    marginBottom: 24,
  },
  viewBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.ring.pink500,
    alignItems: 'center',
    marginBottom: 10,
  },
  viewBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.foreground.muted,
  },
})
