import { useProfileQuery } from '../api/user.queries'

export function useUserProfile(authUserId: string) {
  return useProfileQuery(authUserId)
}
