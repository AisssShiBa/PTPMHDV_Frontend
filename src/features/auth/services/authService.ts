import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type { AuthSession, User } from '@/types/User'

function session(body: ApiResponse<AuthSession>) {
  const value = unwrap(body)
  if (!value?.accessToken || !value.user?.id) throw new Error('Invalid session response')
  return value
}

export const authService = {
  async signUp(username: string, password: string, email: string, firstName: string, lastName: string) {
    const res = await api.post<ApiResponse<{ user: User }>>('/auth/signup', {
      username, password, email, firstName, lastName
    })
    return unwrap(res.data)
  },
  async signIn(username: string, password: string) {
    const res = await api.post<ApiResponse<AuthSession>>('/auth/signin', { username, password })
    return session(res.data)
  },
  async signOut() {
    await api.post('/auth/signout', {})
  },
  async refresh() {
    const res = await api.post<ApiResponse<AuthSession>>('/auth/refresh', {})
    return session(res.data)
  }
}
