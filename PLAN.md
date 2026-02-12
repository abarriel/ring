# Ring -- Build Plan

> Tinder-like app for engagement rings. Swipe, save favorites, pair with a partner, find matches.

## Overview

Ring lets users **swipe** through a curated catalog of engagement rings to build a **personal favorites list**. Users can **pair with a partner** so both swipe independently -- when both like the same ring, it's a **match**. Push notifications alert when a partner joins or a match is found.

**No price displayed** -- the experience is taste-focused.

**Viral hook**: every match is a shareable moment. Couples share their matches to social media, driving organic growth.

---

## Phase 0 -- Data Model & Seed Catalog

> Foundation: design the DB schema and populate with ring data.

### Prisma models

| Model | Key fields |
|-------|-----------|
| `Ring` | id, name, description, metalType (enum), stoneType (enum), caratWeight (float), style (enum), rating (float), reviewCount (int), createdAt, updatedAt |
| `RingImage` | id, ringId (FK), url, position (int for ordering) |
| `Swipe` | id, userId (FK), ringId (FK), direction (enum), createdAt. **Unique constraint on `(userId, ringId)`** -- one swipe per ring per user |
| `Couple` | id, code (unique 6-char), inviterId (FK), partnerId (FK nullable), status (enum), createdAt |
| `Match` | id, coupleId (FK), ringId (FK), createdAt. **Unique constraint on `(coupleId, ringId)`** -- prevents duplicate matches from concurrent swipes |

### Enums

- `MetalType`: YELLOW_GOLD, WHITE_GOLD, ROSE_GOLD, PLATINUM, SILVER
- `StoneType`: DIAMOND, SAPPHIRE, EMERALD, RUBY, MOISSANITE, MORGANITE, NONE
- `RingStyle`: SOLITAIRE, HALO, VINTAGE, PAVE, THREE_STONE, CLUSTER, ETERNITY, TENSION, CATHEDRAL, BEZEL
- `SwipeDirection`: LIKE, NOPE, SUPER
- `CoupleStatus`: PENDING, ACTIVE, DISSOLVED

### User model additions

Add relation fields to the existing `User` model:

- `swipes Swipe[]`
- `invitedCouples Couple[]` (relation: inviterId)
- `joinedCouples Couple[]` (relation: partnerId)
- `sessionToken String? @unique` (for Phase 1 auth)

### Seed strategy

- ~150 rings with realistic names, descriptions, specs
- 3-5 images per ring from curated Unsplash collections (via `https://images.unsplash.com/photo-ID?w=800` -- stable CDN URLs with size params, not hotlinks)
- Seed script: `apps/api/prisma/seed.ts`

### Tasks

- [ ] Design & add Prisma schema (all models + all 5 enums + relations + unique constraints)
- [ ] Add relation fields + sessionToken to existing User model
- [ ] Add Zod schemas in `@ring/shared`: `RingSchema`, `RingImageSchema`, `SwipeSchema`, `CoupleSchema`, `MatchSchema` + create/update variants, plus all enum schemas
- [ ] Write seed script (~150 rings, 3-5 images each)
- [ ] Run `pnpm db:push` and verify

---

## Phase 1 -- Auth, Ring API & Swipe Backend

> Secure the API and make swiping data-driven.

### Auth hardening

The current login is name-only with no session management. Before building any user-specific features, add token-based auth:

- On `auth.login`: generate a UUID session token, store it on the User record, return it to the client
- Client stores token in AsyncStorage alongside user data, sends it in `Authorization` header on every request
- Add `authMiddleware` to oRPC that reads the token from headers, resolves the current user, and injects `ctx.user` into all protected procedures
- Public procedures (ring catalog browsing) don't require auth
- Protected procedures (swipe, couple, match) require auth

### API procedures

| Namespace | Procedure | Auth | Description |
|-----------|-----------|------|-------------|
| `ring` | `list` | Public | Paginated ring list (limit/offset) |
| `ring` | `get` | Public | Get single ring with images |
| `ring` | `feed` | Protected | Get next N rings the user hasn't swiped on yet |
| `swipe` | `create` | Protected | Record a swipe (LIKE / NOPE / SUPER) + check for match if coupled. Upsert on `(userId, ringId)` to handle re-swipes gracefully |
| `swipe` | `listLiked` | Protected | Get all rings the user liked (favorites) |

### Anonymous swipe mode (mobile)

To maximize conversion, let new users experience the core loop before signing up:

- On first launch with no auth, show the swipe screen immediately using `ring.list` (public endpoint)
- Allow 5-10 swipes stored locally (not persisted to API)
- After the swipe limit, show a gate: "Sign up to save your favorites and pair with your partner"
- On signup, replay the local swipes to the API via `swipe.create`

### Tasks

- [ ] Add `sessionToken` field to User model (if not done in Phase 0)
- [ ] Update `auth.login` to generate + return session token
- [ ] Update mobile auth lib to store + send token in headers
- [ ] Build `authMiddleware` for oRPC (resolve user from token, inject `ctx.user`)
- [ ] Add `ring.*` procedures to router (list + get as public, feed as protected)
- [ ] Add `swipe.*` procedures to router (protected)
- [ ] Implement anonymous swipe mode on mobile (local storage, swipe limit, signup gate)
- [ ] On signup, replay locally stored swipes to API
- [ ] Update the mobile swipe screen to fetch from `ring.feed` (authenticated) or `ring.list` (anonymous)
- [ ] Handle "no more rings" state (empty feed)
- [ ] Add basic error state + loading indicator to swipe screen

---

## Phase 2 -- Ring Detail Screen

> Let users tap a card to see full details.

### Mobile screen: `/ring/[id]`

- Image carousel (swipeable, multiple images)
- Ring name (serif font per design system)
- Specs list: metal type, stone type, carat weight, style
- Star rating + review count
- Description text
- "Like" / "Nope" action buttons at the bottom
- Back navigation

### Tasks

- [ ] Create `app/ring/[id].tsx` route
- [ ] Add image carousel component (horizontal FlatList or `react-native-reanimated-carousel`)
- [ ] Wire to `ring.get` API call
- [ ] Like/Nope buttons trigger `swipe.create` and navigate back to swipe screen
- [ ] Add loading skeleton + error state

---

## Phase 3 -- Bottom Tab Navigation

> Proper app navigation structure. Build the shell before adding screens.

### Tab layout: `app/(tabs)/_layout.tsx`

| Tab | Icon | Screen |
|-----|------|--------|
| Swipe | Heart | Swipe screen |
| Favorites | Star | Favorites list (Phase 4) |
| Matches | rings icon | Match list (placeholder until Phase 6) |
| Profile | User circle | Profile / settings (placeholder until Phase 7) |

### Tasks

- [ ] Restructure `app/` to use `(tabs)` group with expo-router
- [ ] Move swipe screen into tabs
- [ ] Add tab bar with Lucide icons (add needed icons to `@ring/ui`)
- [ ] Keep login screen outside tabs (unauthenticated stack)
- [ ] Add placeholder screens for Favorites, Matches, Profile tabs

---

## Phase 4 -- Favorites List

> Show all liked rings in a dedicated screen.

### Mobile screen: `/(tabs)/favorites`

- Grid or list of liked ring cards (thumbnail, name, specs summary)
- Tap opens ring detail screen
- Pull-to-refresh
- Empty state: "No favorites yet -- start swiping!"

### Tasks

- [ ] Build favorites tab screen
- [ ] Build ring card thumbnail component (reusable)
- [ ] Wire to `swipe.listLiked` API
- [ ] Add loading skeleton + error state

---

## Phase 5 -- Partner Pairing

> Let two users link as a couple.

### API procedures

| Namespace | Procedure | Auth | Description |
|-----------|-----------|------|-------------|
| `couple` | `create` | Protected | Generate a 6-char invite code, create Couple with status PENDING |
| `couple` | `join` | Protected | Partner enters code or opens deep link, sets partnerId, status ACTIVE |
| `couple` | `get` | Protected | Get current couple info (if any) |
| `couple` | `dissolve` | Protected | Break the pairing (sets status DISSOLVED) |

### Mobile (Profile screen pairing section)

**Primary flow (lowest friction):** Tap "Invite partner" -> native share sheet sends a deep link (`ring://pair/CODE`) via iMessage/WhatsApp/etc. -> partner taps link -> auto-joins.

**Secondary flow:** Show a QR code the partner scans (uses `expo-camera` or a QR library).

**Fallback:** Manual 6-char code entry field.

Once paired, show partner name + "Dissolve" option.

### Backend logic

- When a swipe LIKE is recorded AND the user is in an ACTIVE couple, check if the partner also liked the same ring
- If yes, upsert a `Match` record (unique constraint on `(coupleId, ringId)` prevents duplicates from concurrent swipes)

### Tasks

- [ ] Add `couple.*` procedures to router
- [ ] Build pairing UI in Profile screen (share-first, QR secondary, manual code fallback)
- [ ] Implement deep link handling (`ring://pair/:code`) via expo-linking
- [ ] Update `swipe.create` to detect matches when coupled (upsert Match to handle race conditions)
- [ ] Add share functionality (native share sheet)
- [ ] Add loading + error states

---

## Phase 6 -- Match List & Sharing

> Show rings both partners liked. Make matches shareable for viral growth.

### API procedures

| Namespace | Procedure | Auth | Description |
|-----------|-----------|------|-------------|
| `match` | `list` | Protected | Get all matches for the user's couple |

### Mobile screen: `/(tabs)/matches`

- List of matched rings with "Matched!" badge
- Tap opens ring detail
- Empty state if no matches yet / not paired
- Celebration animation on new match (confetti/hearts)

### Match sharing (viral loop)

When a match is found:
- Show a celebration modal with the ring image + "You both love this one!"
- **"Share" button** generates a shareable card (ring image + couple names + Ring branding) and opens the native share sheet
- Targets: Instagram Stories, iMessage, WhatsApp, generic share
- The shared link deep-links back to the app (or App Store if not installed)

This is the primary organic growth mechanism. Every shared match is free advertising.

### Tasks

- [ ] Add `match.list` procedure
- [ ] Build matches tab screen
- [ ] Add match notification (in-app celebration modal when a match happens after swiping)
- [ ] Celebration animation (lottie or reanimated)
- [ ] Build shareable match card (ring image + text overlay)
- [ ] Implement share flow (native share sheet with deep link back to app)
- [ ] Add loading skeleton + error + empty states

---

## Phase 7 -- User Profile & Settings

> Edit profile, manage preferences, view stats.

### Mobile screen: `/(tabs)/profile`

- Avatar (initials-based, derived from user name)
- Username display + edit
- Partner status (paired/unpaired + partner name)
- Pairing actions (create code / join / dissolve) -- already built in Phase 5, surfaced here
- Stats: rings swiped, likes, matches
- Filters/preferences (metal type, stone type, style -- saved to user profile, used to sort feed)
- Logout button

### API additions

- Add preference fields to `User` model (preferredMetals, preferredStones, preferredStyles as arrays)
- `user.updatePreferences` procedure
- Update `ring.feed` to prioritize rings matching user preferences (preferred rings first, then others)

### Tasks

- [ ] Add preference fields to User model
- [ ] Build profile screen UI
- [ ] Wire stats (count queries)
- [ ] Implement preference-based feed sorting
- [ ] Logout flow (clear AsyncStorage + session token, redirect to login)
- [ ] Add loading + error states

---

## Phase 8 -- Push Notifications

> Keep users engaged with timely notifications.

### Infrastructure

- Expo Push Notifications (free, no external service needed)
- Store Expo push token on User model (`expoPushToken` field)

### Events

| Event | Recipient | Message | Priority |
|-------|-----------|---------|----------|
| Partner joined | Inviter | "{name} joined your couple!" | High |
| New match found | Both partners | "It's a match! You both love {ring name}" | High |
| New rings added | All users | "New rings just dropped -- come swipe!" | Medium |
| Partner is swiping | Other partner | "{name} is swiping right now!" | Low |

### Tasks

- [ ] Add `expoPushToken` field to User model
- [ ] Register for push notifications on mobile (permissions + token)
- [ ] Send token to API on login/registration
- [ ] Implement notification sending utility on API (Expo Push API)
- [ ] Trigger "partner joined" notification in `couple.join`
- [ ] Trigger "new match" push notification when a Match is created
- [ ] Trigger "partner swiping" notification when `ring.feed` is called (debounce: max 1 per hour)
- [ ] Handle notification taps (deep link to relevant screen)

---

## Phase 9 -- Polish & Ship

> Final touches before release.

### Tasks

- [ ] Loading skeletons for any screens still missing them
- [ ] Haptic feedback on swipe, like, match
- [ ] App icon & splash screen (Ring branding)
- [ ] Onboarding flow (1-2 screens explaining the concept -- shown only on first launch, before anonymous swiping)
- [ ] Accessibility pass (labels, contrast, screen reader)
- [ ] Performance audit (list virtualization, image caching with `expo-image`)
- [ ] EAS Build setup (Expo Application Services) for iOS/Android builds
- [ ] Final smoke test of all flows end-to-end

---

## Summary

| Phase | What | Key deliverable |
|-------|------|----------------|
| **0** | Data model + seed | All models, enums, constraints, 150 rings in DB |
| **1** | Auth + Ring API + swipe backend | Token auth, data-driven swiping, anonymous try-before-signup |
| **2** | Ring detail screen | Full ring info with image carousel |
| **3** | Tab navigation | Proper app structure with bottom tabs |
| **4** | Favorites list | View all liked rings |
| **5** | Partner pairing | Couple system with share-first invite flow |
| **6** | Match list + sharing | See matches, share to social (viral loop) |
| **7** | Profile & settings | User prefs, stats, feed personalization |
| **8** | Push notifications | Match alerts, partner joined, new rings |
| **9** | Polish & ship | Skeletons, haptics, onboarding, EAS build |

---

### Key changes from original plan

1. **Auth hardening** folded into Phase 1 (simple token, `authMiddleware`, `ctx.user`)
2. **Missing enums added**: `SwipeDirection`, `CoupleStatus`
3. **Unique constraints** on `Swipe(userId, ringId)` and `Match(coupleId, ringId)`
4. **User relations** explicitly defined in Phase 0
5. **Phase 3/4 swapped**: tabs built first, then favorites plugs in
6. **Anonymous swipe mode**: 5-10 swipes before signup gate (Phase 1)
7. **Match sharing** as the viral growth engine (Phase 6)
8. **Share-first pairing**: deep link > QR > manual code (Phase 5)
9. **Push notification for matches** added (Phase 8)
10. **Error/loading states** added per-phase, not deferred to Phase 9
