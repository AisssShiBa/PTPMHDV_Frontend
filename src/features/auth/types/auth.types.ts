export type UserRole = 'USER' | 'ADMIN' | 'MERCHANT'

export interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  role: UserRole
  kycTier?: number
  balance?: string
  createdAt?: string
}

export interface AuthSession {
  accessToken: string
  user: User
}

export interface AuthState {
  accessToken: string | null
  user: User | null
  loading: boolean
  initialized: boolean
  clearState: () => void
  setSession: (session: AuthSession) => void
  signIn: (username: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  refresh: () => Promise<boolean>
}
