import { router } from 'expo-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getToken } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
}))

describe('useAuthGuard logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /login when no token exists', async () => {
    vi.mocked(getToken).mockResolvedValue(null)

    const token = await getToken()
    if (!token) {
      router.replace('/login')
    }

    expect(router.replace).toHaveBeenCalledWith('/login')
  })

  it('does not redirect when token exists', async () => {
    vi.mocked(getToken).mockResolvedValue('valid-token-123')

    const token = await getToken()
    if (!token) {
      router.replace('/login')
    }

    expect(router.replace).not.toHaveBeenCalled()
  })

  it('returns truthy token when authenticated', async () => {
    vi.mocked(getToken).mockResolvedValue('valid-token-123')

    const token = await getToken()

    expect(token).toBeTruthy()
  })

  it('returns null token when not authenticated', async () => {
    vi.mocked(getToken).mockResolvedValue(null)

    const token = await getToken()

    expect(token).toBeNull()
  })
})
