import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import LoginScreen from '../../app/login'

const mockLogin = jest.fn()
const mockSaveUser = jest.fn()
const mockRouterReplace = jest.fn()

jest.mock('@/lib/orpc', () => ({
  client: {
    auth: {
      login: (...args: unknown[]) => mockLogin(...args),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  saveUser: (...args: unknown[]) => mockSaveUser(...args),
}))

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
}))

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: { children: React.ReactNode }) => {
    const { View } = require('react-native')
    return <View {...props}>{children}</View>
  },
}))

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginScreen />
    </QueryClientProvider>,
  )
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the login form', () => {
    renderWithProviders()

    expect(screen.getByText('Pseudo')).toBeTruthy()
    expect(screen.getByPlaceholderText('ton_pseudo')).toBeTruthy()
    expect(screen.getByText("C'est parti")).toBeTruthy()
  })

  it('does not call login when input is empty', () => {
    renderWithProviders()

    fireEvent.press(screen.getByText("C'est parti"))

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls client.auth.login on submit', async () => {
    const mockUser = { id: '1', name: 'TestUser', email: 'test@ring.local' }
    mockLogin.mockResolvedValue(mockUser)
    mockSaveUser.mockResolvedValue(undefined)

    renderWithProviders()

    const input = screen.getByPlaceholderText('ton_pseudo')
    fireEvent.changeText(input, 'TestUser')

    const button = screen.getByText("C'est parti")
    fireEvent.press(button)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ name: 'TestUser' })
    })
  })

  it('shows loading state during mutation', async () => {
    // biome-ignore lint/style/useConst: assigned inside Promise constructor
    let resolveLogin!: (value: unknown) => void
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )

    renderWithProviders()

    fireEvent.changeText(screen.getByPlaceholderText('ton_pseudo'), 'TestUser')
    fireEvent.press(screen.getByText("C'est parti"))

    await waitFor(() => {
      expect(screen.getByText('Connexion...')).toBeTruthy()
    })

    resolveLogin?.({ id: '1', name: 'TestUser', email: 'test@ring.local' })
  })

  it('navigates to / on success', async () => {
    const mockUser = { id: '1', name: 'TestUser', email: 'test@ring.local' }
    mockLogin.mockResolvedValue(mockUser)
    mockSaveUser.mockResolvedValue(undefined)

    renderWithProviders()

    fireEvent.changeText(screen.getByPlaceholderText('ton_pseudo'), 'TestUser')
    fireEvent.press(screen.getByText("C'est parti"))

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/')
    })
  })
})
