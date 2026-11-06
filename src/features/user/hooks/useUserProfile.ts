import { useRemoteResource } from '@/hooks/useRemoteResource'
import { useCallback } from 'react'
import { userService } from '../services/userService'
import type { UserProfile } from '../types/user.types'

const loadProfile = (id: string, signal: AbortSignal) => userService.getProfileByAuthUserId(id, signal)

export function useUserProfile(authUserId: string) {
  const resource = useRemoteResource(authUserId, loadProfile)
  const update = resource.replace
  const replace = useCallback((profile: UserProfile) => {
    update((current) => !current || profile.version >= current.version ? profile : current)
  }, [update])
  return { ...resource, replace }
}
