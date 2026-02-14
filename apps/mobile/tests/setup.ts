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
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: vi.fn() },
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Image: 'Image',
  Modal: 'Modal',
  RefreshControl: 'RefreshControl',
  Share: { share: vi.fn() },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
}))

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}))

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(),
}))

vi.mock('expo-router', () => ({
  router: { replace: vi.fn(), push: vi.fn() },
}))

vi.mock('expo-image', () => ({
  Image: 'ExpoImage',
}))

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success' },
}))

vi.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: vi.fn(),
  hideAsync: vi.fn(),
}))

vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: 'ExponentPushToken[mock]' }),
  setNotificationChannelAsync: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  AndroidImportance: { MAX: 5 },
}))

vi.mock('expo-device', () => ({
  isDevice: true,
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
      accent: { price: { bg: '#fefce8', text: '#a16207' }, stars: '#f59e0b' },
      action: {
        nope: { border: '#fca5a5', icon: '#f87171', bg: '#fef2f2' },
        super: { border: '#93c5fd', icon: '#60a5fa', bg: '#eff6ff' },
        like: { border: '#86efac', icon: '#22c55e', bg: '#f0fdf4' },
      },
      feedback: {
        error: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
        success: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
        warning: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
        info: { bg: '#eff6ff', text: '#2563eb', border: '#93c5fd' },
      },
      ui: { border: '#e5e7eb', avatarBg: '#e5e7eb', avatarText: '#4b5563', dot: '#d1d5db' },
    },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 20 },
    spacing: { page: 24, cardX: 24, cardY: 20, section: 20, field: 8 },
  },
  ToastProvider: ({ children }: { children: unknown }) => children,
  useToast: () => ({ show: vi.fn(), dismiss: vi.fn() }),
  ArrowRight: 'ArrowRight',
  Check: 'Check',
  ChevronLeft: 'ChevronLeft',
  Copy: 'Copy',
  ExternalLink: 'ExternalLink',
  Gem: 'Gem',
  Heart: 'Heart',
  Home: 'Home',
  Info: 'Info',
  LogOut: 'LogOut',
  Settings: 'Settings',
  Share2: 'Share2',
  Sparkles: 'Sparkles',
  Star: 'Star',
  User: 'User',
  UserCircle: 'UserCircle',
  Users: 'Users',
  X: 'X',
  AlertTriangle: 'AlertTriangle',
  CheckCircle: 'CheckCircle',
  XCircle: 'XCircle',
}))
