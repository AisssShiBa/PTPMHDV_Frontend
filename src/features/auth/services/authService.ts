import api from '@/lib/axios'

export const authService = {
  signUp: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    const res = await api.post(
      '/auth/signup',
      { username, password, email, firstName, lastName },
      { withCredentials: true }
    )
    return res.data
  },
  signIn: async (username: string, password: string) => {
    const res = await api.post(
      '/auth/signin',
      { username, password },
      { withCredentials: true }
    )
    return res.data
  },
  signOut: async () => {
    const res = await api.post('/auth/signout', {}, { withCredentials: true })
    return res.data
  },
  FetchMe: async () => {
    const res = await api.get('/user/me', { withCredentials: true })
    return res.data
  },
  refresh: async () => {
    const res = await api.post('/auth/refresh', {}, { withCredentials: true })
    return res.data.acessToken
  }
}
