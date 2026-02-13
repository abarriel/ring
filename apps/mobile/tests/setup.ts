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
  },
}))

vi.mock('@ring/ui', () => ({
  theme: {
    colors: {
      ring: { rose400: '#fb7185', pink500: '#ec4899' },
      background: { card: '#ffffff', imageZone: '#fafafa', surface: '#f9fafb' },
      foreground: { DEFAULT: '#111827', secondary: '#6b7280', muted: '#9ca3af' },
      ui: { border: '#e5e7eb' },
    },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20 },
    spacing: { page: 24, cardX: 24, cardY: 20 },
  },
}))
