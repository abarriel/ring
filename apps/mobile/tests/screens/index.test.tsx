import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react-native'
import HomeScreen from '../../app/index'

const mockQueryOptions = jest.fn()

jest.mock('@/lib/orpc', () => ({
  orpc: {
    user: {
      list: {
        queryOptions: (...args: unknown[]) => mockQueryOptions(...args),
      },
    },
  },
}))

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}))

function renderWithProviders(queryClient?: QueryClient) {
  const client = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <HomeScreen />
    </QueryClientProvider>,
  )
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state', () => {
    mockQueryOptions.mockReturnValue({
      queryKey: ['user', 'list'],
      queryFn: () => new Promise(() => {}), // never resolves
    })

    renderWithProviders()

    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('renders user list from query', async () => {
    mockQueryOptions.mockReturnValue({
      queryKey: ['user', 'list'],
      queryFn: () =>
        Promise.resolve([
          { id: '1', name: 'Alice', email: 'alice@ring.local' },
          { id: '2', name: 'Bob', email: 'bob@ring.local' },
        ]),
    })

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy()
      expect(screen.getByText('Bob')).toBeTruthy()
      expect(screen.getByText('alice@ring.local')).toBeTruthy()
    })
  })

  it('shows empty state when no users', async () => {
    mockQueryOptions.mockReturnValue({
      queryKey: ['user', 'list'],
      queryFn: () => Promise.resolve([]),
    })

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('No users yet.')).toBeTruthy()
    })
  })

  it('shows error state', async () => {
    mockQueryOptions.mockReturnValue({
      queryKey: ['user', 'list'],
      queryFn: () => Promise.reject(new Error('Network error')),
    })

    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeTruthy()
    })
  })
})
