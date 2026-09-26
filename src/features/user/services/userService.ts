import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type { KycDocument, SubmitKycDto, UpdateUserDto, UserProfile } from '../types/user.types'

const path = (authUserId: string) => '/users/by-auth/' + encodeURIComponent(authUserId)

export const userService = {
  async getProfileByAuthUserId(authUserId: string, signal?: AbortSignal) {
    const res = await api.get<ApiResponse<UserProfile>>(path(authUserId), { signal })
    return unwrap(res.data)
  },
  async updateProfile(authUserId: string, payload: UpdateUserDto) {
    const res = await api.put<ApiResponse<UserProfile>>(path(authUserId), payload)
    return unwrap(res.data)
  },
  async submitKyc(authUserId: string, payload: SubmitKycDto) {
    const body = new FormData()
    body.append('idNumber', payload.idNumber.trim())
    body.append('document', payload.document)
    const res = await api.post<ApiResponse<UserProfile>>(path(authUserId) + '/kyc', body)
    return unwrap(res.data)
  },
  async getKycDocument(authUserId: string, signal?: AbortSignal) {
    const res = await api.get<ApiResponse<KycDocument>>(path(authUserId) + '/kyc/document', { signal })
    return unwrap(res.data)
  }
}
