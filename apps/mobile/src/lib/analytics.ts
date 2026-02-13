// ── Core event types ────────────────────────────────────────────────────────

type CoreEvent =
  | { name: 'signup'; props?: { from_anonymous?: boolean } }
  | { name: 'login' }
  | { name: 'swipe'; props: { ring_id: string; direction: 'LIKE' | 'NOPE' | 'SUPER' } }
  | { name: 'match'; props: { ring_id: string; couple_id: string } }
  | { name: 'share'; props: { type: 'match' | 'invite'; item_id: string } }
  | { name: 'invite_sent'; props: { couple_code: string } }
  | { name: 'invite_accepted'; props: { couple_code: string } }
  | { name: 'screen_view'; props: { screen: string } }

// ── Analytics interface ─────────────────────────────────────────────────────
// Swap the implementation when upgrading to PostHog or another provider.

interface AnalyticsProvider {
  track: (event: CoreEvent) => void
  identify: (userId: string) => void
  reset: () => void
}

// ── Console provider (MVP) ──────────────────────────────────────────────────

const consoleProvider: AnalyticsProvider = {
  track(event) {
    if (__DEV__) {
      console.log(`[Analytics] ${event.name}`, 'props' in event ? event.props : '')
    }
  },
  identify(userId) {
    if (__DEV__) {
      console.log(`[Analytics] identify: ${userId}`)
    }
  },
  reset() {
    if (__DEV__) {
      console.log('[Analytics] reset')
    }
  },
}

// ── Exported singleton ──────────────────────────────────────────────────────

export const analytics: AnalyticsProvider = consoleProvider

export function track(event: CoreEvent) {
  analytics.track(event)
}

export function identify(userId: string) {
  analytics.identify(userId)
}

export function resetAnalytics() {
  analytics.reset()
}
