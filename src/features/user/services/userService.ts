import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type { KycDocument, SubmitKycDto, UpdateUserDto, UserProfile } from '../types/user.types'
import { recipientQuerySchema, recipientSchema, type Recipient } from '../schemas/recipient.schema'

const path = (authUserId: string) => '/users/by-auth/' + encodeURIComponent(authUserId)

export const userService = {
  async lookupRecipient(query: string, signal?: AbortSignal): Promise<Recipient> {
    const q = recipientQuerySchema.parse(query)
    const res = await api.get<ApiResponse<Recipient>>('/users/lookup', { params: { q }, signal })
    return recipientSchema.parse(unwrap(res.data))
  },
  async getProfileById(id: string) {
    const res = await api.get<ApiResponse<UserProfile>>('/users/' + encodeURIComponent(id))
    return unwrap(res.data)
  },
  async getProfileByAuthUserId(authUserId: string, signal?: AbortSignal) {
    const res = await api.get<ApiResponse<UserProfile>>(path(authUserId), { signal })
    return unwrap(res.data)
  },
  async updateProfile(authUserId: string, payload: UpdateUserDto) {
    const res = await api.put<ApiResponse<UserProfile>>(path(authUserId), payload)
    return unwrap(res.data)
  },
  async submitKyc(payload: SubmitKycDto) {
    const body = new FormData()
    body.append('idNumber', payload.idNumber.trim())
    body.append('front', payload.front)
    body.append('back', payload.back)
    const res = await api.post<ApiResponse<UserProfile>>('/users/kyc/documents', body)
    return unwrap(res.data)
  },
  async getKycDocument(authUserId: string, signal?: AbortSignal) {
    const res = await api.get<ApiResponse<KycDocument>>(path(authUserId) + '/kyc/document', { signal })
    return unwrap(res.data)
  }
}
