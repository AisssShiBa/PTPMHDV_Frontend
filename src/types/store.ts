import type { User } from './User'

export interface authState {
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
