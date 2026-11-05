import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { userService } from '../services/userService'
import type { UserProfile } from '../types/user.types'

export const userKeys = {
  profile: (id: string) => ['user', 'profile', id] as const
}

export function useUserProfile(authUserId: string) {
  const queryClient = useQueryClient()
  const queryKey = userKeys.profile(authUserId)

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => userService.getProfileByAuthUserId(authUserId, signal),
    enabled: Boolean(authUserId)
  })

  const replace = useCallback((profile: UserProfile | ((prev: UserProfile | undefined) => UserProfile)) => {
    queryClient.setQueryData<UserProfile>(queryKey, (current) => {
      const next = typeof profile === 'function' ? profile(current) : profile
      if (!current) return next
      return next.version >= current.version ? next : current
    })
  }, [queryClient, queryKey])

  return {
    status: query.isLoading ? ('loading' as const) : query.isError ? ('error' as const) : ('success' as const),
    data: query.data,
    error: query.error,
    reload: () => query.refetch(),
    replace
  }
}
