// d:\PTPMHDV\Frontend\src\features\user\services\userService.ts
import api from '@/lib/axios'
import type { UserProfile, UpdateUserDto, SubmitKycDto } from '../types/user.types'

export const userService = {
  /**
   * Lấy thông tin hồ sơ theo authUserId (từ useAuthStore)
   */
  getProfileByAuthUserId: async (authUserId: string): Promise<UserProfile> => {
    const res = await api.get(`/users/by-auth/${authUserId}`)
    return res.data?.data ?? res.data
  },

  /**
   * Lấy thông tin hồ sơ theo ID user_service
   */
  getProfileById: async (id: string): Promise<UserProfile> => {
    const res = await api.get(`/users/${id}`)
    return res.data?.data ?? res.data
  },

  /**
   * Cập nhật họ tên, sđt, địa chỉ
   */
  updateProfile: async (id: string, data: UpdateUserDto): Promise<UserProfile> => {
    const res = await api.put(`/users/${id}`, data)
    return res.data?.data ?? res.data
  },

  /**
   * Nộp hồ sơ định danh KYC
   */
  submitKyc: async (id: string, data: SubmitKycDto): Promise<UserProfile> => {
    const res = await api.post(`/users/${id}/kyc`, data)
    return res.data?.data ?? res.data
  }
}
