import { QueryClient } from '@tanstack/react-query'

// Type guard to check if error is an oRPC error with a code property
function isORPCError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  )
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: (failureCount, error) => {
        // Don't retry auth errors (401 UNAUTHORIZED)
        if (isORPCError(error) && error.code === 'UNAUTHORIZED') return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
