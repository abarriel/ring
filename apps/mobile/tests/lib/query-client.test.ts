import { describe, expect, it } from 'vitest'
import { queryClient } from '../../src/lib/query-client'

describe('queryClient retry logic', () => {
  it('does not retry on UNAUTHORIZED errors', () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry
    if (typeof retryFn !== 'function') {
      throw new Error('Expected retry to be a function')
    }

    const unauthorizedError = { code: 'UNAUTHORIZED', message: 'Not authenticated' }
    const result = retryFn(0, unauthorizedError)

    expect(result).toBe(false)
  })

  it('retries on other errors up to 2 times', () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry
    if (typeof retryFn !== 'function') {
      throw new Error('Expected retry to be a function')
    }

    const genericError = new Error('Network error')

    expect(retryFn(0, genericError)).toBe(true)
    expect(retryFn(1, genericError)).toBe(true)
    expect(retryFn(2, genericError)).toBe(false)
  })

  it('retries on non-oRPC errors that look like oRPC errors', () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry
    if (typeof retryFn !== 'function') {
      throw new Error('Expected retry to be a function')
    }

    // Should retry on errors without a proper code property
    const errorWithoutCode = { message: 'UNAUTHORIZED' }
    expect(retryFn(0, errorWithoutCode)).toBe(true)

    // Should retry on errors with non-string code
    const errorWithNumberCode = { code: 401, message: 'Unauthorized' }
    expect(retryFn(0, errorWithNumberCode)).toBe(true)
  })

  it('retries on oRPC errors with non-UNAUTHORIZED codes', () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry
    if (typeof retryFn !== 'function') {
      throw new Error('Expected retry to be a function')
    }

    const notFoundError = { code: 'NOT_FOUND', message: 'Resource not found' }
    expect(retryFn(0, notFoundError)).toBe(true)

    const serverError = { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
    expect(retryFn(0, serverError)).toBe(true)
  })
})
