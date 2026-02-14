export const theme = {
  colors: {
    ring: {
      rose400: '#fb7185',
      pink500: '#ec4899',
    },
    background: {
      card: '#ffffff',
      imageZone: '#fafafa',
      surface: '#f9fafb',
    },
    foreground: {
      DEFAULT: '#111827',
      secondary: '#6b7280',
      muted: '#9ca3af',
    },
    accent: {
      price: { bg: '#fefce8', text: '#a16207' },
      stars: '#f59e0b',
    },
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
    ui: {
      border: '#e5e7eb',
      avatarBg: '#e5e7eb',
      avatarText: '#4b5563',
      dot: '#d1d5db',
    },
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 30,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.15,
      shadowRadius: 40,
      elevation: 12,
    },
  },
  spacing: {
    page: 24,
    cardX: 24,
    cardY: 20,
    section: 20,
    field: 8,
  },
} as const
