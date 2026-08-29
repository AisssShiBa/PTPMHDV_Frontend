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
  ) => void
  signIn: (username: string, password: string) => void
  signOut: () => void
  fetchMe: () => void
  refresh: () => void
  setAccessToken: (accessToken: string) => void
}
