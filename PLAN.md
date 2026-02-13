# Ring -- Build Plan

> Tinder-like app for engagement rings. Swipe, save favorites, pair with a partner, find matches.

## Overview

Ring lets users **swipe** through a curated catalog of engagement rings to build a **personal favorites list**. Users can **pair with a partner** so both swipe independently -- when both like the same ring, it's a **match**. Push notifications alert when a partner joins or a match is found.

**No price displayed** -- the experience is taste-focused.

**Viral hook**: every match is a shareable moment. Couples share their matches to social media, driving organic growth.

## Methodology: Vertical Slices

Each phase delivers a **complete vertical slice**: API + UI + testable behavior. At the end of every phase, you can open the app, perform an action, and see a real result from the database. No phase is "backend only" or "frontend only."

### Phase structure

Every phase follows this template:

1. **Objectif Fonctionnel** -- What concrete feature is delivered?
2. **API** -- Only the endpoints strictly necessary for this feature
3. **UI/UX** -- A functional screen or component to test the feature (even if minimal)
4. **Criteres d'Acceptation (QA)** -- Manual tests you can run yourself to validate "Done"
5. **Tasks** -- Implementation checklist
6. **Tests** -- Automated tests (integration + unit)

---

## Completed Phases

### Phase 0 -- Data Model & Dev Catalog [DONE]

> Foundation: DB schema + dev data.

**What was built:**
- 6 Prisma models: `User`, `Ring`, `RingImage`, `Swipe`, `Couple`, `Match`
- 5 enums: `MetalType`, `StoneType`, `RingStyle`, `SwipeDirection`, `CoupleStatus`
- Unique constraints on `Swipe(userId, ringId)` and `Match(coupleId, ringId)`
- 17 Zod schemas in `@ring/shared` with create/update variants
- `prisma/seed.ts` with 3 dev rings + 6 Unsplash CDN images
- `db:seed` script wired through `prisma.config.ts`

### Phase 0.5 -- Cross-Cutting Foundations [DONE]

> Shared infrastructure for all subsequent phases.

**What was built:**
- `ErrorBoundary` class component wrapping the mobile app
- `ToastProvider` + `useToast` hook in `@ring/ui` (4 severity levels, animated)
- Feedback colors (`error`/`success`/`warning`/`info`) in theme
- Structured JSON logger for the API (`logger.ts`)
- Custom analytics module with typed core events (`track()`, `identify()`, `resetAnalytics()`)
- Smart `QueryClient` retry (skip auth errors, no mutation retries)
- API test setup with Testcontainers (PostgreSQL 17) + table truncation

### Phase 1 -- "Je swipe des vraies bagues" [DONE]

> I open the app, I log in, I swipe through rings that come from the database, and my swipes are saved.

**What was built:**

API:
- `auth.login` updated: generates UUID session token + 30-day `sessionExpiresAt`, returns `{ user, sessionToken }`
- Auth middleware (`authed`): reads `Authorization: Bearer <token>`, resolves user from DB, rejects expired tokens, auto-refreshes expiry when < 7 days remaining, injects `ctx.user`
- `os.$context<{ headers: Headers }>()` base builder: server passes `request.headers` through oRPC context
- `ring.list` (public): paginated with images, ordered by `createdAt asc`
- `ring.feed` (protected): excludes already-swiped rings, Fisher-Yates shuffle for random order, includes images
- `swipe.create` (protected): validates ring exists, upserts on `(userId, ringId)`, supports LIKE/NOPE/SUPER

Shared:
- `sessionExpiresAt: z.date().nullable()` added to `UserSchema`
- New `LoginResponseSchema` (`{ user: UserSchema, sessionToken: z.string() }`) + `LoginResponse` type

Prisma:
- `sessionExpiresAt DateTime?` field added to User model

Mobile:
- Auth lib: `saveToken()`, `getToken()` for session token in AsyncStorage; `clearUser()` uses `multiRemove` for user + token
- oRPC link: `headers` callback reads token from AsyncStorage, sends `Authorization: Bearer <token>` on every request
- Login screen: destructures `{ user, sessionToken }` from new response shape, saves both
- Swipe screen (full rewrite): fetches `ring.feed`, displays real Ring fields (name, metalType, stoneType, caratWeight, style, rating, reviewCount), no price, derives avatar initials from logged-in user name, calls `swipe.create` on each gesture, loading spinner, error retry, "Plus de bagues !" empty state

Tests:
- API: `auth.test.ts` (7) -- login returns token + expiry, new token on re-login, email derivation; `middleware.test.ts` (7) -- rejects no header, malformed, invalid token, accepts valid, rejects expired, refreshes < 7d, doesn't refresh > 7d; `ring.test.ts` (7) -- list with images, pagination, empty, feed returns unswiped, excludes swiped, empty when all swiped, requires auth; `swipe.test.ts` (5) -- creates swipe, upserts duplicate, NOT_FOUND for invalid ring, requires auth, all directions
- Mobile: `auth.test.ts` (7) -- saveUser, saveToken, getUser, getToken, clearUser multiRemove; `login.test.ts` (5) -- updated for `{ user, sessionToken }` response; `index.test.ts` (3) -- updated with `sessionExpiresAt`; `swipe.test.ts` (6) -- swipe.create calls, initials derivation, error handling
- Shared: `schemas.test.ts` (76 total, +5 new) -- `sessionExpiresAt` tests, `LoginResponseSchema` tests

Verification: typecheck (3/3 packages pass), lint clean, shared 76/76, mobile 21/21, API integration tests written (require Docker)

### Phase 2 -- "Je vois mes favoris" [DONE]

> I swipe LIKE on some rings, then I open a Favorites tab and see them listed. I tap one, I see its full details.

**What was built:**

API:
- `ring.get` (public): returns single ring with images, throws `NOT_FOUND` for invalid id
- `swipe.listLiked` (protected): returns rings where direction is LIKE/SUPER, ordered by swipe date desc, paginated, includes images via Prisma join

Mobile:
- Restructured `app/` to `(tabs)` group: `app/(tabs)/_layout.tsx` with Heart (Swipe) and Star (Favoris) tabs
- Swipe screen moved to `app/(tabs)/index.tsx` (default tab)
- Login screen stays outside tabs as root stack screen
- Favorites screen `app/(tabs)/favorites.tsx`: grid of liked ring cards (FlatList, 2 columns), thumbnail + name + metal type + rating, pull-to-refresh, loading/error/empty states
- Ring detail screen `app/ring/[id].tsx`: horizontal FlatList image carousel with pagination dots, ring name (serif), specs table (metal, stone, carats, style), star rating + review count, description, Like/Nope action buttons, back navigation with ChevronLeft
- Query invalidation: both swipe screen and detail screen invalidate `swipe.listLiked` and `ring.feed` after swipe mutations

UI:
- `ChevronLeft` icon exported from `@ring/ui`
- Fixed `formatEnum()` to properly title-case enum values (`.toLowerCase()` before `.replace(/\b\w/g, ...)`)

Tests:
- API: `ring.test.ts` (+2) -- `ring.get` returns ring with images, throws NOT_FOUND; `swipe.test.ts` (+6) -- `swipe.listLiked` returns LIKE/SUPER only, excludes NOPE, includes images, orders by date desc, pagination, empty array, requires auth
- Mobile: `favorites.test.ts` (5) -- fetches liked rings, empty state, image data for thumbnails, enum formatting, error handling; `ring-detail.test.ts` (6) -- fetches ring by id, all spec fields, LIKE/NOPE swipe calls, not found error, builds specs
- Mock theme in `tests/setup.ts` updated with all theme keys (accent, action, ui sub-keys, icon exports)

Verification: typecheck (3/3 packages pass), lint clean, shared 76/76, mobile 39/39, API integration tests written (require Docker)

### Current state of the app

| Screen | Route | What you see | API connected? |
|--------|-------|-------------|----------------|
| Login | `/login` | Gradient pink screen, "Ring" logo, username input, "C'est parti" button | Yes -- `auth.login` (returns `{ user, sessionToken }`) |
| Swipe | `/(tabs)/` | Full swipe card UI with gestures, LIKE/NOPE/SUPER overlays, 3 action buttons, loading/error/empty states | **Yes -- `ring.feed` + `swipe.create`** |
| Favorites | `/(tabs)/favorites` | 2-column grid of liked ring cards (thumbnail, name, metal, rating), pull-to-refresh, empty state | **Yes -- `swipe.listLiked`** |
| Ring Detail | `/ring/[id]` | Image carousel with dots, ring name (serif), specs table, rating, description, Like/Nope buttons | **Yes -- `ring.get` + `swipe.create`** |

**Key gap**: Couple pairing, match detection, and push notifications are not yet implemented.

---

## Phase 3 -- "Je me couple avec mon partenaire"

> I create an invite code, share it with my partner. They enter the code, we're paired. I can see our couple status.

### Objectif Fonctionnel

Partner pairing via invite code. A Profile tab is added (total: 3 tabs). From Profile, I generate a 6-char code, share it. My partner enters the code and we become a couple. Both users see the paired status.

### API

| Procedure | Auth | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `couple.create` | Protected | -- | `Couple` | Generate 6-char code, create with status PENDING |
| `couple.join` | Protected | `{ code }` | `Couple` | Partner enters code, sets partnerId, status ACTIVE. Errors: CODE_NOT_FOUND, ALREADY_PAIRED, COUPLE_ALREADY_FULL |
| `couple.get` | Protected | -- | `Couple?` with partner info | Get current active couple (if any) |
| `couple.dissolve` | Protected | -- | `Couple` | Set status DISSOLVED, set dissolvedAt |

### UI/UX

- **Profile tab** added (3 tabs total: Swipe, Favorites, Profile)
- **Profile screen**: avatar (initials from user name), username, couple section
- **Unpaired state**: "Invite ton partenaire" button -> generates code -> displays it with share button (native share sheet sends code) + manual code entry field for joining
- **Paired state**: shows partner name + "Dissoudre le couple" button
- **Code entry**: text input to type a 6-char code + "Rejoindre" button
- **Error handling**: toast for CODE_NOT_FOUND, ALREADY_PAIRED, COUPLE_ALREADY_FULL
- **Logout button**: clears AsyncStorage + redirects to login

### Criteres d'Acceptation (QA)

1. **Profile tab exists**: Tab bar has 3 tabs: Swipe, Favorites, Profile. Profile shows your name and avatar.
2. **Generate code**: On Profile, tap "Invite ton partenaire" -> a 6-char code appears on screen.
3. **Share code**: Tap share button next to the code -> native share sheet opens with the code.
4. **Partner joins**: On a second device/user, enter the code in the join field -> tap "Rejoindre" -> both users now see "Couple actif" with partner's name.
5. **Invalid code**: Enter "XXXXXX" -> toast: code not found.
6. **Already paired**: Try to join a code when already in a couple -> toast: already paired.
7. **Dissolve**: Tap "Dissoudre le couple" -> confirm -> couple status becomes DISSOLVED, both users return to unpaired state.
8. **Logout works**: Tap "Deconnexion" -> redirected to login screen. Token cleared.

### Tasks

- [ ] Add Profile tab to tab bar (UserCircle icon from Lucide)
- [ ] Build profile screen with avatar, username, couple section, logout button
- [ ] Add `couple.create` procedure: generate random 6-char alphanumeric code, create PENDING couple
- [ ] Add `couple.join` procedure: validate code, check errors (not found, already paired, full), set partnerId + ACTIVE status
- [ ] Add `couple.get` procedure: find active couple for current user (as inviter or partner), include partner info
- [ ] Add `couple.dissolve` procedure: set DISSOLVED + dissolvedAt
- [ ] Build pairing UI: unpaired (generate + share + join), paired (partner name + dissolve)
- [ ] Implement logout flow: `clearUser()` + router.replace('/login')
- [ ] Add share functionality (native share sheet with code)
- [ ] Error toasts for couple.join failures
- [ ] Write integration tests for all couple procedures
- [ ] Write mobile tests for profile screen + couple flows

### Tests

- **API**: `couple.test.ts` -- create generates code, join pairs users, join errors (not found, already paired, full), get returns couple, dissolve sets status
- **Mobile**: `profile.test.ts` -- renders user info, couple states, logout

---

## Phase 4 -- "On a un match !"

> Both partners swipe LIKE on the same ring -> a Match is created. Both see it in a Matches tab with a celebration.

### Objectif Fonctionnel

When both users in a couple LIKE the same ring, a Match is automatically detected. A Matches tab shows all shared matches. A celebration modal appears right after the swipe that triggers a match.

### API

| Procedure | Auth | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `swipe.create` (update) | Protected | `{ ringId, direction }` | `{ swipe: Swipe, match?: Match }` | On LIKE, if coupled, check partner's swipe. If both LIKE -> upsert Match. Return match if created. |
| `match.list` | Protected | `{ limit, offset }` | `Match[]` with ring + images | All matches for the user's couple |

### UI/UX

- **Matches tab** added (4 tabs: Swipe, Favorites, Matches, Profile)
- **Matches screen**: list of matched rings with "Match !" badge. Tap opens ring detail. Empty state: "Pas encore de match" (if coupled) or "Couple-toi pour trouver des matchs !" (if unpaired, with CTA to Profile)
- **Match celebration modal**: when `swipe.create` returns a match, show a full-screen modal with the ring image, "C'est un match !" text, confetti/hearts animation, and a "Voir le match" button
- **Swipe screen update**: after each LIKE swipe, check response for match and trigger celebration if present

### Criteres d'Acceptation (QA)

1. **Match detection**: User A and User B are paired. User A swipes LIKE on "Classic Solitaire Diamond". User B swipes LIKE on the same ring. -> A Match record is created in DB.
2. **Celebration modal**: The user who triggers the match (second LIKE) sees a celebration modal with the ring image and "C'est un match !" text.
3. **Match appears in list**: After the celebration, go to Matches tab -> the matched ring is listed with a "Match !" badge.
4. **Both users see it**: Both User A and User B see the match in their Matches tab.
5. **No match on NOPE**: User A likes, User B nopes -> no match.
6. **No match if not coupled**: User swipes LIKE while unpaired -> no match detection, just a regular swipe.
7. **No duplicate match**: Both users like the same ring -> only 1 Match record (unique constraint).
8. **Unpaired empty state**: Unpaired user goes to Matches tab -> sees "Couple-toi..." CTA.

### Tasks

- [ ] Add Matches tab to tab bar (diamond/ring icon)
- [ ] Update `swipe.create` handler: on LIKE/SUPER, if user is in active couple, check partner's swipe on same ring. If both LIKE -> upsert Match. Return match in response.
- [ ] Add `match.list` procedure: get matches for user's couple, include ring + images, ordered by createdAt desc
- [ ] Build matches tab screen with ring list, "Match !" badge, empty states (coupled vs unpaired)
- [ ] Build celebration modal component (ring image, "C'est un match !" text, animation, "Voir le match" button)
- [ ] Update swipe screen to check `swipe.create` response for match and show celebration modal
- [ ] Write integration tests for match detection logic (both like, one nope, not coupled, duplicate)
- [ ] Write mobile tests for matches screen + celebration modal

### Tests

- **API**: `match.test.ts` -- match created when both like, no match on nope, no match if uncoupled, upsert prevents duplicate, match.list returns couple's matches
- **Mobile**: `matches.test.ts` -- renders match list, empty states; `celebration.test.ts` -- modal shown on match

---

## Phase 5 -- "Je partage notre match"

> When we get a match, I can share it on social media with a branded card. Deep links bring people into the app.

### Objectif Fonctionnel

Match sharing as the viral growth engine. After a match, a "Partager" button generates a branded image (ring photo + couple names + Ring logo) and opens the native share sheet. Shared links deep-link back to the app.

### API

No new procedures needed. The share action is client-side only (image generation + native share sheet). Deep link handling is mobile-only.

### UI/UX

- **Share button on celebration modal**: after "C'est un match !", a "Partager" button appears
- **Share button on match list**: each match card has a share icon
- **Shareable card**: generated image with ring photo, couple names ("Alice & Bob"), "Ring" branding. Built with `react-native-view-shot`.
- **Native share sheet**: opens with the generated image + deep link URL (`ring://match/:matchId?referrer=:coupleId`)
- **Deep link handling**: `ring://pair/:code` opens pairing flow, `ring://match/:matchId` opens match detail

### Criteres d'Acceptation (QA)

1. **Share from celebration**: After a match celebration, tap "Partager" -> native share sheet opens with a branded image.
2. **Share from match list**: On Matches tab, tap share icon on a match card -> share sheet opens.
3. **Branded card content**: The shared image shows the ring photo, both partner names, and "Ring" branding.
4. **Deep link - pair**: Open `ring://pair/ABC123` link -> app opens to pairing flow (or prompts to join code).
5. **Deep link - match**: Open `ring://match/:id` link -> app opens to match detail.

### Tasks

- [ ] Install `react-native-view-shot` for image generation
- [ ] Build shareable match card component (ring image + couple names + branding)
- [ ] Add share button to celebration modal
- [ ] Add share icon to match list cards
- [ ] Implement native share sheet flow (generate image -> share)
- [ ] Set up deep link scheme (`ring://`) via expo-linking
- [ ] Handle `ring://pair/:code` deep link (navigate to profile + auto-fill code)
- [ ] Handle `ring://match/:matchId` deep link (navigate to match detail)
- [ ] Track `share` analytics event
- [ ] Write mobile tests for share flow + deep link handling

### Tests

- **Mobile**: `share.test.ts` -- share flow triggers view-shot + share sheet; `deep-link.test.ts` -- pair and match deep links navigate correctly

---

## Phase 6 -- "Je personnalise mon feed"

> I set my preferences (metal, stone, style) in my profile. The feed shows rings matching my taste first.

### Objectif Fonctionnel

Preference-based feed personalization. From the Profile screen, I select my preferred metals, stones, and styles. The swipe feed prioritizes rings that match my preferences.

### API

| Procedure | Auth | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `user.updatePreferences` | Protected | `{ preferredMetals?, preferredStones?, preferredStyles? }` | `User` | Save preference arrays to user profile |
| `ring.feed` (update) | Protected | `{ limit }` | `Ring[]` | Preference-weighted ordering: score = count of matching prefs (0-3). Within each tier, randomize. |

### UI/UX

- **Profile screen update**: add "Mes preferences" section with multi-select chips for metal types, stone types, ring styles. Save button calls `user.updatePreferences`.
- **Feed reordering**: after setting preferences, the swipe feed shows matching rings first. No visible UI change on the swipe screen itself -- the ordering just improves.
- **Stats section** on profile: rings swiped count, likes count, match count

### Criteres d'Acceptation (QA)

1. **Preference UI**: On Profile, you see "Mes preferences" with selectable chips for metals, stones, styles.
2. **Save preferences**: Select "Rose Gold" + "Diamond" + "Halo" -> tap save -> preferences are stored in DB on your User record.
3. **Feed ordering**: After setting preferences for Rose Gold + Diamond, seed a mix of rings. The feed shows Rose Gold Diamond rings before Platinum Emerald rings.
4. **Stats visible**: Profile shows "X bagues swipees, X favoris, X matchs" with real counts from DB.
5. **Preferences persist**: Log out + log back in -> preferences are still set.

### Tasks

- [ ] Add `user.updatePreferences` procedure: validate and save preference arrays
- [ ] Update `ring.feed` handler: score rings by preference match count (0-3), order by score desc then random within tier
- [ ] Add preference multi-select UI to profile screen (chips for each enum)
- [ ] Add user stats section to profile (swipe count, like count, match count via count queries)
- [ ] Add `user.stats` procedure or inline counts in `user.get` response
- [ ] Wire preference save + load on profile screen
- [ ] Write integration tests for preference-scored feed
- [ ] Write mobile tests for preference UI + stats

### Tests

- **API**: `ring.test.ts` -- feed scores by preferences, randomizes within tier; `user.test.ts` -- updatePreferences validates + persists
- **Mobile**: `profile.test.ts` -- preference chips, stats display

---

## Phase 7 -- "Mode anonyme : essaie avant de t'inscrire"

> A new user opens the app and can swipe through 5 rings without signing up. After 5 swipes, they're prompted to create an account. On signup, their local swipes are replayed to the API.

### Objectif Fonctionnel

Anonymous try-before-signup mode to maximize conversion. No login required to start swiping. After a configurable limit (5 swipes), a signup gate appears. On signup, local swipes are replayed to the backend.

### API

`ring.list` is already public. `swipe.create` handles upsert (skip duplicates on replay).

### UI/UX

- **First launch**: skip login, go directly to swipe screen. Fetch rings from `ring.list` (public).
- **Local swipe storage**: swipe decisions stored in AsyncStorage (not API) until signup
- **Swipe limit gate**: after 5 swipes, overlay: "Inscris-toi pour sauvegarder tes favoris et te coupler !" with signup button
- **Signup flow**: navigate to login screen -> on successful login, replay local swipes via `swipe.create` calls -> clear local storage -> navigate to tabs
- **Skip duplicates on replay**: if user already has swipes in DB (e.g., signed up on another device), upsert handles it

### Criteres d'Acceptation (QA)

1. **No login required**: Fresh install -> app opens directly to swipe screen (no login prompt).
2. **Can swipe 5 rings**: Swipe through 5 rings -> swipe gestures work normally, cards advance.
3. **Gate appears**: After 5th swipe, a gate overlay appears with signup CTA. Cannot swipe further.
4. **Signup replays swipes**: Tap signup -> enter username -> login -> local swipes are sent to API. Check DB: all 5 swipes exist.
5. **After signup, normal flow**: Post-signup, the app shows tab bar and continues from where you left off (feed excludes the 5 already-swiped rings).
6. **Duplicate safety**: If a swipe already exists in DB for this user+ring, replay doesn't fail or create duplicates.

### Tasks

- [ ] Update root layout auth gate: allow unauthenticated access to swipe screen
- [ ] Add local swipe storage utility (AsyncStorage: save/load/clear anonymous swipes)
- [ ] Update swipe screen: detect anonymous mode, use `ring.list` instead of `ring.feed`, store swipes locally
- [ ] Build swipe limit gate overlay component (shown after N swipes)
- [ ] On signup, replay local swipes to API via sequential `swipe.create` calls
- [ ] Clear local swipes after successful replay
- [ ] Handle replay errors gracefully (skip failures, continue with remaining)
- [ ] Write mobile tests for anonymous flow + replay logic

### Tests

- **Mobile**: `anonymous-swipe.test.ts` -- local storage, gate at limit, replay on signup, duplicate handling

---

## Phase 8 -- "Je recois des notifications"

> I get a push notification when my partner joins, when we get a match, or when new rings are added.

### Objectif Fonctionnel

Push notifications for key events. Users opt in to notifications on first launch. The API sends notifications via Expo Push API.

### API

| Change | Description |
|--------|-------------|
| Add `expoPushToken` field to User model | Store device push token |
| `user.registerPushToken` procedure | Protected. Save Expo push token to user profile |
| Update `couple.join` handler | Send "Partner joined" notification to inviter |
| Update `swipe.create` handler | On match creation, send "New match" notification to both partners |
| Push notification utility | `apps/api/src/push.ts` -- send via Expo Push API |

### UI/UX

- **Permission prompt**: on first authenticated launch, request push notification permission. Register token with API.
- **Notification taps**: tap a "partner joined" notification -> opens Profile tab. Tap "new match" -> opens Matches tab.

### Criteres d'Acceptation (QA)

1. **Permission requested**: After login, the app asks for notification permission (iOS prompt).
2. **Token registered**: Accept permission -> check DB: user has an `expoPushToken`.
3. **Partner joined notification**: User A creates a couple code. User B joins. -> User A receives a push notification "{name} a rejoint ton couple !".
4. **Match notification**: Both partners like the same ring -> both receive "C'est un match ! Vous aimez tous les deux {ring name}".
5. **Notification tap opens correct screen**: Tap the match notification -> app opens to Matches tab.

### Tasks

- [ ] Add `expoPushToken String?` field to User model + `db:push`
- [ ] Add `user.registerPushToken` procedure
- [ ] Build push notification utility (`apps/api/src/push.ts`) using Expo Push API
- [ ] Request notification permission on mobile + register token
- [ ] Trigger "partner joined" push in `couple.join` handler
- [ ] Trigger "new match" push in `swipe.create` match detection
- [ ] Handle notification taps with deep link routing
- [ ] Write integration tests for push sending logic
- [ ] Write mobile tests for permission flow + token registration

### Tests

- **API**: `push.test.ts` -- notification sent on couple.join, notification sent on match creation, handles missing tokens gracefully
- **Mobile**: `notifications.test.ts` -- permission request, token registration, notification tap navigation

---

## Phase 9 -- Polish & Ship

> Final quality pass. Every screen is polished, accessible, performant.

### Objectif Fonctionnel

Production-ready polish. Not a feature phase -- a quality phase. Every screen gets loading skeletons, haptic feedback, accessibility labels, and performance optimization.

### UI/UX

- Loading skeletons for all screens (swipe, favorites, matches, profile, ring detail)
- Haptic feedback on swipe, like, match celebration
- App icon & splash screen (Ring branding)
- Onboarding overlay (1-screen, shown after first swipe: "Swipe pour decouvrir des bagues ! Sauvegarde tes favoris et couple-toi.")
- Accessibility pass: labels, contrast, screen reader support
- Performance: `expo-image` for caching, preload next 3 rings in feed, list virtualization
- EAS Build setup for iOS/Android

### Criteres d'Acceptation (QA)

1. **Skeletons**: every screen shows a skeleton/shimmer while loading (not a blank screen or "Loading..." text).
2. **Haptics**: feel a vibration on swipe, like tap, and match celebration.
3. **App icon**: custom Ring icon visible on home screen (not default Expo icon).
4. **Splash screen**: branded splash on launch.
5. **Accessibility**: VoiceOver/TalkBack can navigate all screens and announce ring names, buttons, tabs.
6. **Performance**: scrolling through 50+ rings in favorites is smooth (60fps).
7. **EAS builds**: `eas build --platform ios` and `--platform android` succeed.

### Tasks

- [ ] Add loading skeletons to all screens
- [ ] Add haptic feedback (`expo-haptics`) on swipe, like, match
- [ ] Design + add app icon and splash screen
- [ ] Build onboarding overlay component
- [ ] Accessibility audit: add `accessibilityLabel`, ensure contrast ratios, test with VoiceOver
- [ ] Replace Image with `expo-image` + configure cache + preload feed
- [ ] Ensure FlatList virtualization on favorites + matches
- [ ] Configure EAS Build (`eas.json`)
- [ ] Run Maestro E2E smoke tests for critical flows
- [ ] Final end-to-end smoke test of all flows

### Tests

- **E2E**: Maestro flows for login, swipe, favorite, couple, match, share, logout

---

## Phase 10 -- Admin & Post-MVP

> Post-launch tooling.

### Tasks

- [ ] Build simple admin web app (Next.js + oRPC client)
- [ ] Ring CRUD interface (add/edit/remove rings + images)
- [ ] User and couple admin panel (view, moderate, dissolve)
- [ ] Analytics dashboard (signups, swipes/session, match rate, share rate, invite conversion)
- [ ] Manual push notification sender (for "new rings" announcements)

---

## Architecture Reference

### Data model

| Model | Key fields | Unique constraints |
|-------|-----------|-------------------|
| `User` | id, email, name, sessionToken?, sessionExpiresAt?, preferredMetals[], preferredStones[], preferredStyles[] | email, name, sessionToken |
| `Ring` | id, name, description?, metalType, stoneType, caratWeight, style, rating, reviewCount | -- |
| `RingImage` | id, ringId (FK), url, position | -- |
| `Swipe` | id, userId (FK), ringId (FK), direction, timestamps | `(userId, ringId)` |
| `Couple` | id, code (6-char), inviterId, partnerId?, status, createdAt, dissolvedAt? | code |
| `Match` | id, coupleId (FK), ringId (FK), createdAt | `(coupleId, ringId)` |

### Enums

- `MetalType`: YELLOW_GOLD, WHITE_GOLD, ROSE_GOLD, PLATINUM, SILVER
- `StoneType`: DIAMOND, SAPPHIRE, EMERALD, RUBY, MOISSANITE, MORGANITE, NONE
- `RingStyle`: SOLITAIRE, HALO, VINTAGE, PAVE, THREE_STONE, CLUSTER, ETERNITY, TENSION, CATHEDRAL, BEZEL
- `SwipeDirection`: LIKE, NOPE, SUPER
- `CoupleStatus`: PENDING, ACTIVE, DISSOLVED

### Error handling strategy

- **Network errors** (offline, timeout) -- retry-able toast
- **Auth errors** (expired/invalid token) -- redirect to login
- **Validation errors** (Zod) -- inline field errors
- **DB constraint errors** (unique violations) -- user-friendly toast messages

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Unsplash licensing | High (legal) | Medium | Verify terms or switch to paid stock / AI-generated |
| Auth token security | Medium | Medium | `sessionExpiresAt` + refresh in Phase 1 |
| Match race condition | Medium | Low | Unique constraint on `Match(coupleId, ringId)` |
| Partner pairing confusion | Medium | Medium | `couple.join` error handling in Phase 3 |
| Push notification spam | High (churn) | Medium | Opt-in via settings in Phase 8 |
| Anonymous swipe replay bugs | Low | Medium | Upsert handles duplicates in Phase 7 |
| Image loading performance | Medium | High | `expo-image` + preloading in Phase 9 |

---

## Summary

| Phase | Nom | Ce que tu peux tester |
|-------|-----|----------------------|
| **0** | Data Model [DONE] | `db:seed` + Prisma Studio |
| **0.5** | Foundations [DONE] | Error boundary, toasts, analytics logging |
| **1** | "Je swipe des vraies bagues" [DONE] | Login -> swipe -> voir des vraies bagues de la DB -> swipes sauvegardes |
| **2** | "Je vois mes favoris" | Tab bar + liste des favoris + detail bague avec carousel |
| **3** | "Je me couple" | Creer un code -> partager -> partenaire rejoint -> statut couple visible |
| **4** | "On a un match !" | Les deux aiment la meme bague -> match detecte + celebration |
| **5** | "Je partage notre match" | Partager une image de match sur les reseaux + deep links |
| **6** | "Je personnalise mon feed" | Preferences -> feed trie par gouts + stats profil |
| **7** | "Mode anonyme" | Swiper 5 bagues sans compte -> gate -> inscription -> replay |
| **8** | "Notifications" | Push quand partenaire rejoint / match trouve |
| **9** | Polish & Ship | Skeletons, haptics, icone, splash, accessibilite, EAS |
| **10** | Admin | Web app d'admin, CRUD bagues, dashboard analytics |

---

## Discoveries (from previous phases)

- **Prisma 7** uses `prisma.config.ts` with `migrations.seed` for seed commands, not `prisma.seed` in `package.json`
- **`db:push` with schema changes** adding unique constraints requires `--accept-data-loss` flag
- **`vi.spyOn()` + `vi.clearAllMocks()`** pattern is broken -- create spies in `beforeEach`, restore in `afterEach`
- **Flaky ordering test**: records with same `createdAt` make `ORDER BY` non-deterministic. Add delay or secondary sort.
- **UserSchema changes cascade**: adding fields breaks mobile test mocks -- update all mock objects
- **Biome lint** flags `!` assertions -- use `npx @biomejs/biome check --write --unsafe` to fix
- **`as const` on objects with empty arrays** creates `readonly []` incompatible with mutable types -- use explicit type annotation
- **oRPC context for auth**: use `os.$context<{ headers: Headers }>()` to create a typed base builder, pass `request.headers` from server `fetch()` handler via `context: { headers: request.headers }`
- **oRPC `ORPCError`**: re-exported from `@orpc/server` (originally from `@orpc/client`) -- import from `@orpc/server` to avoid extra dependency
- **oRPC middleware `.use()` callback signature**: `({ context, next }, _input, _output) => ...` -- second/third params for input/output types
- **Fisher-Yates shuffle with `noUncheckedIndexedAccess`**: destructuring swap `[a[i], a[j]] = [a[j], a[i]]` with `as` cast avoids non-null assertions that Biome rejects
- **`call()` requires context arg with `$context`**: when using `os.$context<T>()`, all `call(procedure, input, { context })` invocations in tests must include the third argument -- even for public procedures
- **Login response shape change cascades widely**: changing `auth.login` from returning `User` to `{ user, sessionToken }` breaks login screen, all mobile test mocks, and any code destructuring the response
