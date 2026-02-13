type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: unknown
}

function formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  }
}

function write(entry: LogEntry) {
  const json = JSON.stringify(entry)
  if (entry.level === 'error') {
    console.error(json)
  } else if (entry.level === 'warn') {
    console.warn(json)
  } else {
    console.log(json)
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    write(formatEntry('debug', message, meta))
  },

  info(message: string, meta?: Record<string, unknown>) {
    write(formatEntry('info', message, meta))
  },

  warn(message: string, meta?: Record<string, unknown>) {
    write(formatEntry('warn', message, meta))
  },

  error(message: string, meta?: Record<string, unknown>) {
    write(formatEntry('error', message, meta))
  },
}
