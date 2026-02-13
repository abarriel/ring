import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin } from '@orpc/server/plugins'
import { logger } from './logger.js'
import { router } from './router.js'

const handler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
  interceptors: [
    onError((error) => {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('oRPC handler error', {
        name: err.name,
        message: err.message,
        code: 'code' in err ? (err as unknown as { code: unknown }).code : undefined,
        stack: err.stack,
      })
    }),
  ],
})

const PORT = Number(process.env.PORT) || 3000

const server = Bun.serve({
  port: PORT,
  async fetch(request: Request) {
    const { matched, response } = await handler.handle(request, {
      prefix: '/rpc',
      context: { headers: request.headers },
    })

    if (matched) {
      return response
    }

    // Health check
    const url = new URL(request.url)
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' })
    }

    return new Response('Not Found', { status: 404 })
  },
})

logger.info(`Ring API running at http://localhost:${server.port}`)
