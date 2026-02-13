import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../src/logger.js'

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs info as structured JSON to console.log', () => {
    logger.info('server started', { port: 3000 })

    expect(logSpy).toHaveBeenCalledOnce()
    const output = JSON.parse(logSpy.mock.calls[0]?.[0] as string)
    expect(output.level).toBe('info')
    expect(output.message).toBe('server started')
    expect(output.port).toBe(3000)
    expect(output.timestamp).toBeDefined()
  })

  it('logs errors to console.error', () => {
    logger.error('db connection failed', { code: 'ECONNREFUSED' })

    expect(errorSpy).toHaveBeenCalledOnce()
    const output = JSON.parse(errorSpy.mock.calls[0]?.[0] as string)
    expect(output.level).toBe('error')
    expect(output.message).toBe('db connection failed')
    expect(output.code).toBe('ECONNREFUSED')
  })

  it('logs warnings to console.warn', () => {
    logger.warn('deprecated endpoint called')

    expect(warnSpy).toHaveBeenCalledOnce()
    const output = JSON.parse(warnSpy.mock.calls[0]?.[0] as string)
    expect(output.level).toBe('warn')
  })

  it('logs debug to console.log', () => {
    logger.debug('resolving user', { userId: '123' })

    expect(logSpy).toHaveBeenCalledOnce()
    const output = JSON.parse(logSpy.mock.calls[0]?.[0] as string)
    expect(output.level).toBe('debug')
    expect(output.userId).toBe('123')
  })

  it('includes ISO timestamp', () => {
    logger.info('test')

    const output = JSON.parse(logSpy.mock.calls[0]?.[0] as string)
    expect(() => new Date(output.timestamp)).not.toThrow()
    expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
