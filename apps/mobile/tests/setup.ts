import { vi } from 'vitest'

// Mock React Native core components
vi.mock('react-native', () => ({
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  Platform: { OS: 'ios' },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
}))

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}))

vi.mock('expo-router', () => ({
  router: { replace: vi.fn(), push: vi.fn() },
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
    multiRemove: vi.fn(),
  },
}))

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: 'SafeAreaProvider',
}))

vi.mock('@ring/ui', () => ({
  theme: {
    colors: {
      ring: { rose400: '#fb7185', pink500: '#ec4899' },
      background: { card: '#ffffff', imageZone: '#fafafa', surface: '#f9fafb' },
      foreground: { DEFAULT: '#111827', secondary: '#6b7280', muted: '#9ca3af' },
      feedback: {
        error: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
        success: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
        warning: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
        info: { bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' },
      },
      ui: { border: '#e5e7eb' },
    },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20 },
    spacing: { page: 24, cardX: 24, cardY: 20 },
  },
  ToastProvider: ({ children }: { children: unknown }) => children,
  useToast: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}))
