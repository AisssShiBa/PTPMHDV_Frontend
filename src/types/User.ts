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
