import type { User } from './User'

export interface authState {
  accessToken: string | null
  user: User | null
  loading: boolean
  clearState: () => void
  signUp: (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => Promise<boolean>
  signIn: (username: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  setAccessToken: (accessToken: string) => void
}
