import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../theme'

// ── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'error' | 'success' | 'warning' | 'info'

interface ToastMessage {
  id: number
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  show: (toast: Omit<ToastMessage, 'id'>) => void
  dismiss: (id: number) => void
}

// ── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

// ── Provider ────────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { ...toast, id }])

      const duration = toast.duration ?? DEFAULT_DURATION
      setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ── Container ───────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}) {
  const insets = useSafeAreaInsets()

  if (toasts.length === 0) return null

  return (
    <View style={[styles.container, { top: insets.top + 8 }]}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  )
}

// ── Toast item ──────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, { bg: string; text: string; border: string }> = {
  error: theme.colors.feedback.error,
  success: theme.colors.feedback.success,
  warning: theme.colors.feedback.warning,
  info: theme.colors.feedback.info,
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current
  const colors = TYPE_STYLES[toast.type]

  // Fade in on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: opacity is a stable ref, effect should only run on mount
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [])

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => onDismiss(toast.id))
  }

  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: colors.bg, borderColor: colors.border, opacity }]}
    >
      <View style={styles.toastContent}>
        <Text style={[styles.toastTitle, { color: colors.text }]}>{toast.title}</Text>
        {toast.message ? (
          <Text style={[styles.toastMessage, { color: colors.text }]}>{toast.message}</Text>
        ) : null}
      </View>
      <Pressable onPress={handleDismiss} hitSlop={8}>
        <Text style={[styles.dismissText, { color: colors.text }]}>x</Text>
      </Pressable>
    </Animated.View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: theme.spacing.page,
    right: theme.spacing.page,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  toastMessage: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.85,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
    paddingLeft: 12,
  },
})
