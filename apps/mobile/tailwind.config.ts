import { ringPreset } from '@ring/ui/tailwind-preset'
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), ringPreset],
} satisfies Config
