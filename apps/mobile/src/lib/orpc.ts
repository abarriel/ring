import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { Router } from '@ring/api/router'
import Constants from 'expo-constants'
import { getToken } from '@/lib/auth'

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000'

const link = new RPCLink({
  url: `${API_URL}/rpc`,
  headers: async () => {
    const token = await getToken()
    if (token) {
      return { authorization: `Bearer ${token}` }
    }
    return {}
  },
})

export const client: RouterClient<Router> = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
