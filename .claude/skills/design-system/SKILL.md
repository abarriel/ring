# Ring Design System Skill

## When to Apply

Apply this skill whenever you are **creating or modifying UI** in the Ring mobile app (`apps/mobile/`). This includes screens, components, layouts, and any file that imports from `@ring/ui` or uses `StyleSheet.create()`.

## Design Language

Ring's design language is **luxury minimal, warm and romantic**. Think high-end jewelry brand meets modern dating app. Every screen should feel like it belongs in a boutique, not a tech startup.

### Key Principles

1. **Warm tones over cool** -- cream backgrounds, dusty rose accents, warm charcoal text. Never use pure gray or blue-gray.
2. **Generous whitespace** -- let elements breathe. Use `theme.spacing.page` (24px) for screen padding, `theme.spacing.section` (32px) between major sections.
3. **Typography hierarchy** -- Playfair Display (serif) for headings that convey elegance, DM Sans (sans-serif) for body text that's clean and readable.
4. **Subtle depth** -- light shadows (`theme.shadows.sm` / `theme.shadows.md`), no heavy drop shadows or borders.
5. **Single accent color** -- `theme.colors.primary` (#d4897a dusty rose). No gradients for buttons. Solid fills only.

## Theme Tokens (Source of Truth)

Always import from `@ring/ui`:

```ts
import { theme } from '@ring/ui'
```

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `colors.primary` | `#d4897a` | Primary buttons, active states, accent |
| `colors.primaryLight` | `rgba(212,137,122,0.2)` | Light tint backgrounds, selected states |
| `colors.primaryMuted` | `rgba(212,137,122,0.1)` | Subtle tint, hover states |
| `colors.background.surface` | `#faf7f5` | Screen background (warm cream) |
| `colors.background.card` | `#ffffff` | Card backgrounds |
| `colors.background.cardTranslucent` | `rgba(255,255,255,0.5)` | Overlays on images |
| `colors.background.tag` | `#f3f4f6` | Tags, chips, badges |
| `colors.background.subtle` | `rgba(45,41,38,0.05)` | Very subtle backgrounds |
| `colors.foreground.DEFAULT` | `#2d2926` | Primary text (warm charcoal) |
| `colors.foreground.secondary` | `rgba(45,41,38,0.8)` | Secondary text |
| `colors.foreground.muted` | `rgba(45,41,38,0.7)` | Muted text |
| `colors.foreground.tertiary` | `rgba(45,41,38,0.6)` | Tertiary text |
| `colors.foreground.placeholder` | `#9ca3af` | Input placeholders |
| `colors.foreground.inverse` | `#ffffff` | Text on primary buttons |
| `colors.ui.border` | `#e5e7eb` | Input borders, dividers |
| `colors.ui.navActive` | `#d4897a` | Active tab bar icon |
| `colors.ui.navInactive` | `#9ca3af` | Inactive tab bar icon |

### Typography

```ts
// Headings (Playfair Display)
{ fontFamily: theme.fonts.heading, fontWeight: theme.fontWeights.bold }

// Body (DM Sans)
{ fontFamily: theme.fonts.body, fontWeight: theme.fontWeights.regular }

// Font sizes
theme.fontSizes.xs   // 12 -- captions, labels
theme.fontSizes.sm   // 14 -- secondary text, hints
theme.fontSizes.md   // 16 -- body text, inputs
theme.fontSizes.lg   // 18 -- section headers
theme.fontSizes.xl   // 20 -- card titles
theme.fontSizes['2xl'] // 24 -- screen sub-headers
theme.fontSizes['3xl'] // 30 -- screen titles
theme.fontSizes['4xl'] // 36 -- hero text
```

### Border Radius

```ts
theme.borderRadius.lg   // 14 -- buttons, inputs
theme.borderRadius.xl   // 16 -- cards
theme.borderRadius.full // 9999 -- avatars, pills
```

### Spacing

```ts
theme.spacing.page    // 24 -- horizontal screen padding
theme.spacing.cardX   // 24 -- card horizontal padding
theme.spacing.cardY   // 24 -- card vertical padding
theme.spacing.section // 32 -- gap between major sections
theme.spacing.gap     // 16 -- gap between list items
theme.spacing.field   // 12 -- gap between form fields
```

## Component Patterns

### Buttons

```ts
// Primary button
{
  backgroundColor: theme.colors.primary,
  borderRadius: theme.borderRadius.lg, // 14
  height: 52,
  alignItems: 'center',
  justifyContent: 'center',
}
// Text: white, DM Sans semiBold 16

// Secondary/outline button
{
  borderWidth: 1,
  borderColor: theme.colors.ui.border,
  borderRadius: theme.borderRadius.lg,
  height: 48,
  backgroundColor: theme.colors.background.card,
}
// Text: foreground.DEFAULT, DM Sans medium 16

// Ghost/text button
// No background, no border. Just text with primary color.
```

### Inputs

```ts
{
  height: 48,
  borderWidth: 1,
  borderColor: theme.colors.ui.border,
  borderRadius: theme.borderRadius.lg, // 14
  paddingHorizontal: 16,
  fontSize: theme.fontSizes.md,
  color: theme.colors.foreground.DEFAULT,
  backgroundColor: theme.colors.background.card,
}
```

### Cards

```ts
{
  backgroundColor: theme.colors.background.card,
  borderRadius: theme.borderRadius.xl, // 16
  padding: theme.spacing.cardX,
  ...theme.shadows.sm,
}
```

### Screen Container

```ts
{
  flex: 1,
  backgroundColor: theme.colors.background.surface,
  paddingHorizontal: theme.spacing.page,
}
```

### Section Headers (Playfair Display)

```ts
{
  fontFamily: theme.fonts.heading,
  fontSize: theme.fontSizes['3xl'], // 30
  fontWeight: theme.fontWeights.bold,
  color: theme.colors.foreground.DEFAULT,
}
```

### Body Text (DM Sans)

```ts
{
  fontFamily: theme.fonts.body,
  fontSize: theme.fontSizes.md, // 16
  fontWeight: theme.fontWeights.regular,
  color: theme.colors.foreground.secondary,
  lineHeight: theme.lineHeights.md, // 24
}
```

## Rules

1. **NEVER use hardcoded colors.** Always reference `theme.colors.*`.
2. **NEVER use gradients for buttons or backgrounds.** The old code used `LinearGradient` -- replace with solid `backgroundColor: theme.colors.primary`.
3. **NEVER use `#fff1f2` or `#fce7f3`** (old pink gradient). The background is `theme.colors.background.surface` (`#faf7f5` warm cream).
4. **NEVER use `ring.pink500`, `ring.rose400`, or `accent.price`** -- these no longer exist.
5. **ALWAYS use `StyleSheet.create()`** with theme tokens. No inline styles except dynamic values.
6. **ALWAYS use `theme.fonts.heading` (Playfair Display)** for screen titles and hero text.
7. **ALWAYS use `theme.fonts.body` (DM Sans)** for body text, labels, buttons.
8. **Screen background** is always `theme.colors.background.surface` (not white, not pink).
9. **Primary action buttons** are solid `theme.colors.primary` with white text. No gradients.
10. **Inactive/secondary elements** use `theme.colors.foreground.muted` or `theme.colors.ui.border`.
11. **Images** use `expo-image` (not `react-native` Image). Always `contentFit="cover"` with `transition={200}`.
12. **Safe areas**: always use `useSafeAreaInsets()` from `react-native-safe-area-context` for top/bottom padding.
13. **Tab bar**: 3 tabs only (Rings, Matches, Profile). Active = `theme.colors.ui.navActive`, inactive = `theme.colors.ui.navInactive`.
14. **All interactive elements** must have `accessibilityLabel` and `accessibilityRole`.
15. **i18n**: all user-facing text must use `useTranslation()` + `t('key')`. Never hardcode strings.

## Common Mistakes to Avoid

- Using `LinearGradient` for button backgrounds (use solid `backgroundColor`)
- Using `#ffffff` for screen background (use `theme.colors.background.surface`)
- Forgetting `fontFamily` on text (defaults to system font, not DM Sans/Playfair)
- Using `resizeMode` with expo-image (use `contentFit` instead)
- Mixing `theme.borderRadius.md` (12) for buttons (should be `lg` = 14)
