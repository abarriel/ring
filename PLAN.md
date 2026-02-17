# Ring -- Figma Rebuild Plan

> Complete UI rebuild of the Ring mobile app based on the Figma sitemap (24 pages, 5 sections).

## Overview

Ring is a Tinder-like app for engagement rings. This plan covers the **complete rebuild** of all mobile screens to match the Figma design system: luxury minimal, warm and romantic. Cream backgrounds, dusty rose accents, Playfair Display headings, DM Sans body text.

The app has **24 pages** organized into **5 sections**. Of these, **7 have Figma designs** and **17 are built design-system-consistent** using theme tokens.

## Sitemap (24 Pages)

| # | Page | Section | Figma? | Route |
|---|------|---------|--------|-------|
| 01 | Welcome/Landing | Auth & Onboarding | Yes (`1:3`) | `(auth)/welcome` |
| 02 | Sign Up | Auth & Onboarding | Yes (`1:99`) | `(auth)/signup` |
| 03 | Login | Auth & Onboarding | No | `(auth)/login` |
| 04 | Preferences Setup | Auth & Onboarding | No | `(onboarding)/preferences` |
| 05 | Couple Pairing | Auth & Onboarding | Yes (`1:261`) | `(onboarding)/pair` |
| 06 | Pairing Success | Auth & Onboarding | No | `(onboarding)/paired` |
| 07 | Swipe Deck | Core Swipe | Yes (`1:334`) | `(tabs)/index` |
| 08 | Ring Detail | Core Swipe | No | `ring/[id]` |
| 09 | Filter Overlay | Core Swipe | No | Modal on swipe |
| 10 | Empty Deck | Core Swipe | No | State in swipe |
| 11 | Match Moment | Matches & Results | Yes (`8:107`) | Modal on swipe |
| 12 | Our Matches | Matches & Results | Yes (`8:162`) | `(tabs)/matches` |
| 13 | Match Detail | Matches & Results | No | `matches/[id]` |
| 14 | Couple Insights | Matches & Results | No | `matches/insights` |
| 15 | Wishlist | Matches & Results | No | `matches/wishlist` |
| 16 | Share Match | Matches & Results | No | Action in match detail |
| 17 | My Profile | Profile & Settings | Yes (`8:2`) | `(tabs)/profile` |
| 18 | Edit Profile | Profile & Settings | No | `profile/edit` |
| 19 | Preferences | Profile & Settings | No | `profile/preferences` |
| 20 | Notifications | Profile & Settings | No | `profile/notifications` |
| 21 | Couple Settings | Profile & Settings | No | `profile/couple` |
| 22 | How It Works | Informational | No | `info/how-it-works` |
| 23 | Ring Guide | Informational | No | `info/guide` |
| 24 | FAQ / Legal | Informational | No | `info/faq` |

## Route Structure (New)

```
app/
  _layout.tsx                    Root stack (providers, auth gate)
  (auth)/
    _layout.tsx                  Auth stack layout
    welcome.tsx                  Page 01 - Welcome/Landing
    signup.tsx                   Page 02 - Sign Up
    login.tsx                    Page 03 - Login
  (onboarding)/
    _layout.tsx                  Onboarding stack layout
    preferences.tsx              Page 04 - Preferences Setup
    pair.tsx                     Page 05 - Couple Pairing
    paired.tsx                   Page 06 - Pairing Success
  (tabs)/
    _layout.tsx                  3 tabs: Rings, Matches, Profile
    index.tsx                    Page 07 - Swipe Deck (+ Page 10 empty state)
    matches.tsx                  Page 12 - Our Matches
    profile.tsx                  Page 17 - My Profile
  ring/
    [id].tsx                     Page 08 - Ring Detail
  matches/
    [id].tsx                     Page 13 - Match Detail
    insights.tsx                 Page 14 - Couple Insights
    wishlist.tsx                 Page 15 - Wishlist
  profile/
    edit.tsx                     Page 18 - Edit Profile
    preferences.tsx              Page 19 - Preferences
    notifications.tsx            Page 20 - Notifications
    couple.tsx                   Page 21 - Couple Settings
  info/
    how-it-works.tsx             Page 22 - How It Works
    guide.tsx                    Page 23 - Ring Guide
    faq.tsx                      Page 24 - FAQ / Legal
  src/
    components/
      celebration-modal.tsx      Page 11 - Match Moment (modal)
      filter-overlay.tsx         Page 09 - Filter Overlay (modal)
      swipe-gate.tsx             Existing - Anonymous limit gate
      skeleton.tsx               Existing - Loading skeletons
      error-boundary.tsx         Existing - Error boundary
```

## Key Changes from Current App

1. **Remove favorites tab** -- go from 4 tabs to 3 (Rings, Matches, Profile)
2. **Add (auth) route group** -- welcome, signup, login as separate screens
3. **Add (onboarding) route group** -- preferences, pairing, success after signup
4. **Replace LinearGradient buttons** -- solid `theme.colors.primary` backgrounds
5. **Replace pink gradient backgrounds** -- `theme.colors.background.surface` (warm cream)
6. **Apply Playfair Display** for all headings
7. **Apply DM Sans** for all body text
8. **New screens**: filter overlay, match detail, insights, wishlist, edit profile, notifications, couple settings, info pages

---

## Phase 1 -- Foundation & Auth (Pages 01-06)

> Route restructuring + auth & onboarding flow.

### Tasks

- [ ] Restructure routes: create `(auth)/`, `(onboarding)/` groups
- [ ] Update root `_layout.tsx` to handle auth/onboarding/main flow
- [ ] Build Welcome screen (Page 01) -- Figma `1:3`
- [ ] Build Sign Up screen (Page 02) -- Figma `1:99`
- [ ] Build Login screen (Page 03) -- design-system consistent
- [ ] Build Preferences Setup screen (Page 04) -- metal/stone/style pickers
- [ ] Build Couple Pairing screen (Page 05) -- Figma `1:261`
- [ ] Build Pairing Success screen (Page 06) -- celebration + redirect
- [ ] Remove old `login.tsx` at root level
- [ ] Update i18n keys (fr.json + en.json) for all new screens
- [ ] Write tests for new screens

### Figma Screens

| Screen | Node ID | Key Elements |
|--------|---------|-------------|
| Welcome | `1:3` | Logo, tagline, "Commencer" CTA, warm cream bg |
| Sign Up | `1:99` | Name input, email input, form card on cream bg |
| Couple Pairing | `1:261` | Code input, share code, join code sections |

---

## Phase 2 -- Core Swipe (Pages 07-11)

> Rebuild swipe deck + ring detail + modals.

### Tasks

- [ ] Rebuild Swipe Deck screen (Page 07) -- Figma `1:334`
- [ ] Rebuild Ring Detail screen (Page 08) -- design-system consistent
- [ ] Build Filter Overlay component (Page 09) -- bottom sheet modal
- [ ] Style Empty Deck state (Page 10) -- warm illustration
- [ ] Rebuild Match Moment modal (Page 11) -- Figma `8:107`
- [ ] Remove `favorites.tsx` tab screen
- [ ] Update tab layout to 3 tabs (Rings/Matches/Profile)
- [ ] Update i18n for rebuilt screens
- [ ] Write tests

### Figma Screens

| Screen | Node ID | Key Elements |
|--------|---------|-------------|
| Swipe Deck | `1:334` | Card stack, action buttons, ring info overlay |
| Match Moment | `8:107` | Celebration animation, ring image, "C'est un match!" |

---

## Phase 3 -- Matches & Profile (Pages 12-21)

> Rebuild matches grid + profile + all sub-pages.

### Tasks

- [ ] Rebuild Our Matches screen (Page 12) -- Figma `8:162`
- [ ] Build Match Detail screen (Page 13) -- ring detail with match context
- [ ] Build Couple Insights screen (Page 14) -- taste stats, overlap %
- [ ] Build Wishlist screen (Page 15) -- saved/liked rings list
- [ ] Add Share Match action (Page 16) -- native share in match detail
- [ ] Rebuild My Profile screen (Page 17) -- Figma `8:2`
- [ ] Build Edit Profile screen (Page 18) -- name, avatar, bio
- [ ] Build Preferences screen (Page 19) -- ring preference toggles
- [ ] Build Notifications screen (Page 20) -- push settings
- [ ] Build Couple Settings screen (Page 21) -- invite, dissolve, partner info
- [ ] Update i18n
- [ ] Write tests

### Figma Screens

| Screen | Node ID | Key Elements |
|--------|---------|-------------|
| Our Matches | `8:162` | 2-column grid, match badges, couple header |
| My Profile | `8:2` | Avatar, stats row, menu items, partner section |

---

## Phase 4 -- Informational (Pages 22-24)

> Low priority static content pages.

### Tasks

- [ ] Build How It Works screen (Page 22) -- step-by-step with icons
- [ ] Build Ring Guide screen (Page 23) -- metal/stone education
- [ ] Build FAQ / Legal screen (Page 24) -- accordion sections
- [ ] Link from profile menu
- [ ] Update i18n
- [ ] Write tests

---

## Phase 5 -- Polish & Testing

> Final pass across all screens.

### Tasks

- [ ] Shared components audit (ensure all use design system)
- [ ] i18n completeness audit (all keys in fr.json + en.json)
- [ ] Accessibility audit (labels, roles, contrast)
- [ ] Add missing loading skeletons for new screens
- [ ] Add haptic feedback to new interactions
- [ ] Run full test suite
- [ ] Run Maestro E2E flows
- [ ] Run typecheck + lint + build

---

## Previous Build History

The app was originally built in Phases 0-9 (see git history). Key milestones:
- **Phase 0**: Data model + seed data
- **Phase 0.5**: Error boundary, toasts, analytics, test setup
- **Phase 1**: Auth + swipe (API connected)
- **Phase 2**: Favorites tab + ring detail
- **Phase 3**: Couple pairing (create/join/dissolve)
- **Phase 4**: Match detection + celebration
- **Phase 7**: Anonymous mode (5 free swipes)
- **Phase 8**: Push notifications
- **Phase 9**: Polish (skeletons, haptics, expo-image, a11y, EAS)

The Figma rebuild preserves all existing API functionality and business logic. Only the UI layer is being rebuilt.
