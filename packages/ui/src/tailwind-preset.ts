import type { Config } from 'tailwindcss'

export const ringPreset = {
  theme: {
    extend: {
      colors: {
        ring: {
          rose400: '#fb7185',
          pink500: '#ec4899',
        },
        background: {
          card: '#ffffff',
          'image-zone': '#fafafa',
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
        ui: {
          border: '#e5e7eb',
          'avatar-bg': '#e5e7eb',
          'avatar-text': '#4b5563',
          dot: '#d1d5db',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(0,0,0,0.06)',
        md: '0 4px 12px rgba(0,0,0,0.1)',
        lg: '0 8px 30px rgba(0,0,0,0.08)',
        xl: '0 20px 40px rgba(0,0,0,0.15)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      spacing: {
        page: '24px',
        'card-x': '24px',
        'card-y': '20px',
        section: '20px',
        field: '8px',
      },
    },
  },
} satisfies Partial<Config>
