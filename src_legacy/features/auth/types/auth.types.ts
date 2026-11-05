export interface User {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  role: 'USER' | 'ADMIN' | 'MERCHANT'
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
  signUp: (username: string, password: string, email: string, firstName: string, lastName: string) => Promise<boolean>
  signIn: (username: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  refresh: () => Promise<boolean>
}

// Alias tương thích ngược
export type authState = AuthState
