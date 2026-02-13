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

### Phase 3 -- "Je me couple avec mon partenaire" [DONE]

> I create an invite code, share it with my partner. They enter the code, we're paired. I can see our couple status.

**What was built:**

API:
- `couple.create` (protected): generates cryptographically random 6-char alphanumeric code via `crypto.getRandomValues()`, creates couple with PENDING status, uses `$transaction` race guard to prevent duplicate couple creation
- `couple.join` (protected): validates code exists, checks own-couple before already-paired, sets partnerId + ACTIVE status. Errors: CODE_NOT_FOUND, CANNOT_JOIN_OWN, ALREADY_PAIRED, COUPLE_ALREADY_FULL
- `couple.get` (protected): finds active/pending couple for current user (as inviter or partner), includes partner info via Prisma relations
- `couple.dissolve` (protected): sets status DISSOLVED + dissolvedAt timestamp

Shared:
- `CoupleWithPartnerSchema` added for couple.get response (couple + inviter + partner User)

Mobile:
- Profile tab added (4th tab: Swipe, Favoris, Matchs, Profil -- UserCircle icon)
- Profile screen `app/(tabs)/profile.tsx`: avatar (initials from `getInitials()` utility), username, couple section with 3 states (unpaired, pending, paired), logout button
- Unpaired state: "Invite ton partenaire" button → generates code → displays with share (native share sheet) + copy (expo-clipboard) buttons + manual code entry field with "Rejoindre" button
- Pending state: shows generated code with share/copy buttons + "Annuler l'invitation" button
- Paired state: shows "Couple actif" status dot + partner name + "Dissoudre le couple" button
- Error toasts for all couple.join failure cases (code not found, own couple, already paired, couple full)
- Logout: confirmation alert → `clearUser()` + `queryClient.clear()` + `router.replace('/login')`
- `getInitials()` utility extracted to `src/lib/utils.ts` (deduplicating from swipe screen)

Tests:
- API: `couple.test.ts` (10) -- create generates 6-char code, create returns PENDING, join pairs users, join errors (not found, own couple, already paired, full), get returns couple with partner, get returns null when unpaired, dissolve sets status + dissolvedAt
- Mobile: `profile.test.ts` (11) -- user info rendering, couple CRUD mutations, share/copy code, error toast mapping, logout flow, dissolve confirmation
- Shared: `schemas.test.ts` (+7 new, 83 total) -- CoupleSchema, CoupleWithPartnerSchema validation

Verification: typecheck clean, lint clean, shared 83/83, mobile 50/50, API integration tests written

### Phase 4 -- "On a un match !" [DONE]

> Both partners swipe LIKE on the same ring -> a Match is created. Both see it in a Matches tab with a celebration.

**What was built:**

API:
- `swipe.create` updated: on LIKE/SUPER, if user is in active couple, checks partner's swipe on same ring. If both LIKE → upserts Match on `(coupleId, ringId)`. Response changed from flat `Swipe` to `{ swipe: Swipe, match: Match | null }`. Uses explicit typing `Awaited<ReturnType<typeof db.match.upsert>> | null = null` to avoid `never` type inference
- `match.list` (protected): returns matches for user's couple, includes ring + images via Prisma join, ordered by createdAt desc, paginated

Shared:
- `MatchWithRingSchema` added (Match + embedded RingWithImages)
- `SwipeCreateResponseSchema` added (`{ swipe: SwipeSchema, match: MatchSchema.nullable() }`)

Mobile:
- Matches tab added (4 tabs total: Swipe/Heart, Favoris/Star, Matchs/Gem, Profil/UserCircle)
- Matches screen `app/(tabs)/matches.tsx`: 2-column grid of matched rings with "Match !" badge, tap opens ring detail, pull-to-refresh, 3 empty states (loading, uncoupled with CTA to profile, coupled but no matches)
- `CelebrationModal` component `src/components/celebration-modal.tsx`: full-screen modal with ring image, "C'est un match !" text, ring name, "Voir le match" and "Continuer" buttons
- Swipe screen updated: checks `swipe.create` response for `data.match`, triggers celebration modal with matched ring, invalidates match.list queries on match
- `Gem` icon exported from `@ring/ui`

Tests:
- API: `match.test.ts` (16) -- match created when both LIKE, match on SUPER+LIKE, no match on NOPE, no match if uncoupled, upsert prevents duplicate match, match.list returns couple's matches with ring images, match.list pagination, match.list empty, match.list requires auth, match.list for different couple, swipe.create response shape with/without match
- Mobile: `matches.test.ts` (6) -- fetch matches, empty state, unpaired CTA, match card display, error handling, badge rendering; `celebration.test.ts` (5) -- modal visibility, ring display, close handler, navigation to matches; `swipe.test.ts` updated for `{ swipe, match }` response shape
- Shared: `schemas.test.ts` (+10 new, 93 total) -- MatchWithRingSchema, SwipeCreateResponseSchema validation

Verification: typecheck clean, lint clean, shared 93/93, mobile 61/61, API integration tests written

### Phase 5 -- "Je partage notre match" [SKIPPED]

> Skipped by user request. Match sharing, branded image generation, and deep links deferred to post-MVP.

### Phase 6 -- "Je personnalise mon feed" [SKIPPED]

> Skipped by user request. Feed personalization and preference UI deferred to post-MVP.

### Phase 7 -- "Mode anonyme : essaie avant de t'inscrire" [DONE]

> A new user opens the app and can swipe through 5 rings without signing up. After 5 swipes, they're prompted to create an account. On signup, their local swipes are replayed to the API.

**What was built:**

API:
- No API changes needed. `ring.list` is already public. `swipe.create` handles upserts (skip duplicates on replay).

Mobile:
- Root layout auth gate removed: `_layout.tsx` no longer checks `getUser()`/`getToken()` or redirects to `/login`. App opens directly to swipe screen.
- Anonymous swipe storage utility `src/lib/anonymous-swipes.ts`: `saveAnonymousSwipe()`, `getAnonymousSwipes()`, `getAnonymousSwipeCount()`, `clearAnonymousSwipes()`, `ANONYMOUS_SWIPE_LIMIT = 5`, all backed by AsyncStorage key `ring:anonymous-swipes`
- `SwipeGate` overlay component `src/components/swipe-gate.tsx`: "Tu aimes ce que tu vois ?" title + "Inscris-toi pour sauvegarder tes favoris et te coupler !" subtitle + "S'inscrire" CTA button navigating to `/login`
- `useAuthGuard()` hook `src/lib/use-auth-guard.ts`: checks `getToken()` on mount, redirects to `/login` if not authenticated, returns `isAuthed` boolean
- Swipe screen `app/(tabs)/index.tsx` updated: detects `isAnonymous` state via `getToken()` on mount. Anonymous mode uses `ring.list` (public) instead of `ring.feed` (auth required). Swipes stored locally via `saveAnonymousSwipe()`. Shows `SwipeGate` overlay when count reaches limit. Header shows "S'inscrire" button (anonymous) or avatar (authenticated).
- Protected tabs updated: `favorites.tsx`, `matches.tsx`, `profile.tsx` all use `useAuthGuard()` with queries disabled until `isAuthed`
- Login screen `app/login.tsx` updated: `replayAnonymousSwipes()` function runs after successful login — iterates saved swipes, calls `client.swipe.create()` for each (skipping failures via try/catch), then clears local storage

Tests:
- Mobile: `anonymous-swipes.test.ts` (9) -- ANONYMOUS_SWIPE_LIMIT constant, getAnonymousSwipes empty/stored, saveAnonymousSwipe append/accumulate, getAnonymousSwipeCount empty/stored, clearAnonymousSwipes removes key
- Mobile: `use-auth-guard.test.ts` (4) -- redirect to /login when no token, no redirect when token exists, truthy/null token checks
- Mobile: `anonymous-swipe.test.ts` (16) -- anonymous detection (no token/with token), swipe storage (save/directions/accumulate), gate trigger at/below limit, gate navigates to /login, replay all swipes after login, clear after replay, skip failed replays, empty replay, full login+replay+navigate integration, anonymous uses ring.list, header state for anonymous/authenticated

Verification: typecheck clean, lint clean, shared 93/93, mobile 90/90, Lefthook pre-commit passed

### Current state of the app

| Screen | Route | What you see | API connected? |
|--------|-------|-------------|----------------|
| Swipe | `/(tabs)/` | Full swipe card UI with gestures, LIKE/NOPE/SUPER overlays, 3 action buttons, loading/error/empty states. Anonymous users see "S'inscrire" header button; authenticated users see avatar initials. | **Yes -- `ring.list` (anonymous) or `ring.feed` (authenticated) + `swipe.create`** |
| Favorites | `/(tabs)/favorites` | 2-column grid of liked ring cards (thumbnail, name, metal, rating), pull-to-refresh, empty state | **Yes -- `swipe.listLiked`** (auth guarded) |
| Matches | `/(tabs)/matches` | 2-column grid of matched rings with "Match !" badge, empty states (uncoupled CTA, no matches yet) | **Yes -- `couple.get` + `match.list`** (auth guarded) |
| Profile | `/(tabs)/profile` | Avatar, username, couple section (unpaired/pending/paired states), share/copy code, dissolve, logout | **Yes -- `couple.get/create/join/dissolve`** (auth guarded) |
| Ring Detail | `/ring/[id]` | Image carousel with dots, ring name (serif), specs table, rating, description, Like/Nope buttons | **Yes -- `ring.get` + `swipe.create`** |
| Login | `/login` | Gradient pink screen, "Ring" logo, username input, "C'est parti" button. Replays anonymous swipes on signup. | **Yes -- `auth.login` + `swipe.create` (replay)** |
| SwipeGate | overlay on swipe | "Tu aimes ce que tu vois ?" + signup CTA. Shown after 5 anonymous swipes. | No (client-only overlay) |
| Celebration | modal on swipe | Ring image + "C'est un match !" + "Voir le match" button. Shown when swipe triggers a match. | No (triggered by `swipe.create` response) |

**Key gap**: Push notifications (Phase 8) and polish/ship (Phase 9) are not yet implemented. Phases 5 (sharing) and 6 (preferences) were skipped.

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
