import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAuthStore } from '@/features/auth'
import { userService } from '../services/userService'
import type { UserKycStatus, UserProfile } from '../types/user.types'

export const userKeys = {
  account: (authUserId: string) => ['user', authUserId] as const,
  profile: (authUserId: string) => [...userKeys.account(authUserId), 'profile'] as const,
  kyc: (authUserId: string) => [...userKeys.account(authUserId), 'kyc'] as const
}

export function useProfileQuery(authUserId: string) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: userKeys.profile(authUserId),
    queryFn: async ({ signal }) => {
      const profile = await userService.getProfileByAuthUserId(authUserId, signal)
      if (profile && profile.authUserId !== authUserId) throw new Error('Không thể đọc hồ sơ của tài khoản hiện tại.')
      return profile
    },
    enabled: Boolean(authUserId),
    gcTime: 0,
    retry: false
  })
  const replace = useCallback(async (profile: UserProfile) => {
    if (profile.authUserId !== authUserId) return
    await client.cancelQueries({ queryKey: userKeys.profile(authUserId), exact: true })
    if (useAuthStore.getState().user?.id !== authUserId) return
    client.setQueryData<UserProfile>(userKeys.profile(authUserId), (current) =>
      !current || profile.version >= current.version ? profile : current)
    await client.invalidateQueries({ queryKey: userKeys.profile(authUserId), exact: true })
  }, [authUserId, client])
  return { ...query, reload: query.refetch, replace }
}

export function useKycStatus(authUserId: string) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: userKeys.kyc(authUserId),
    queryFn: ({ signal }) => userService.getKycStatus(signal),
    enabled: Boolean(authUserId),
    gcTime: 0,
    retry: false
  })
  const submitted = useCallback(async (profile: UserProfile) => {
    if (profile.authUserId !== authUserId) return
    await client.cancelQueries({ queryKey: userKeys.kyc(authUserId), exact: true })
    if (useAuthStore.getState().user?.id !== authUserId) return
    client.setQueryData<UserKycStatus>(userKeys.kyc(authUserId), {
      kycStatus: profile.kycStatus,
      kycTier: profile.kycTier,
      hasKycDocument: profile.hasKycDocument
    })
    await client.invalidateQueries({ queryKey: userKeys.kyc(authUserId), exact: true })
  }, [authUserId, client])
  return { ...query, submitted }
}
