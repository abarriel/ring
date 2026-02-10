import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin } from '@orpc/server/plugins'
import { onError } from '@orpc/server'
import { router } from './router.js'

const handler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
  interceptors: [
    onError((error) => {
      console.error('[oRPC Error]', error)
    }),
  ],
})

const PORT = Number(process.env.PORT) || 3000

const server = Bun.serve({
  port: PORT,
  async fetch(request: Request) {
    const { matched, response } = await handler.handle(request, {
      prefix: '/rpc',
      context: {},
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

console.log(`🚀 Ring API running at http://localhost:${server.port}`)
