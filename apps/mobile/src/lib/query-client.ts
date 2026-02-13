import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: (failureCount, error) => {
        // Don't retry auth errors (will be 401 once auth is implemented)
        if (error instanceof Error && error.message.includes('UNAUTHORIZED')) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
