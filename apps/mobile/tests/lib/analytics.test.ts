import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Must mock __DEV__ before importing analytics
vi.stubGlobal('__DEV__', true)

const { track, identify, resetAnalytics } = await import('@/lib/analytics')

describe('analytics', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tracks events with name and props in dev mode', () => {
    track({ name: 'swipe', props: { ring_id: 'r1', direction: 'LIKE' } })

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy.mock.calls[0]?.[0]).toContain('[Analytics] swipe')
  })

  it('tracks events without props', () => {
    track({ name: 'login' })

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy.mock.calls[0]?.[0]).toContain('[Analytics] login')
  })

  it('identifies a user', () => {
    identify('user-123')

    expect(consoleSpy).toHaveBeenCalledWith('[Analytics] identify: user-123')
  })

  it('resets analytics', () => {
    resetAnalytics()

    expect(consoleSpy).toHaveBeenCalledWith('[Analytics] reset')
  })

  it('tracks signup with from_anonymous prop', () => {
    track({ name: 'signup', props: { from_anonymous: true } })

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy.mock.calls[0]?.[0]).toContain('[Analytics] signup')
  })

  it('tracks match event', () => {
    track({ name: 'match', props: { ring_id: 'r1', couple_id: 'c1' } })

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy.mock.calls[0]?.[0]).toContain('[Analytics] match')
  })

  it('tracks share event', () => {
    track({ name: 'share', props: { type: 'match', item_id: 'm1' } })

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy.mock.calls[0]?.[0]).toContain('[Analytics] share')
  })
})
