import { z } from 'zod'
import type { UpdateUserDto, UserProfile } from '../types/user.types'

const fields = ['fullName', 'phone', 'address'] as const
type ProfileValues = Pick<UserProfile, 'fullName' | 'phone' | 'address'>

export function profileDefaults(profile: ProfileValues) {
  return { fullName: profile.fullName ?? '', phone: profile.phone ?? '', address: profile.address ?? '' }
}

export function createProfileSchema(profile: ProfileValues) {
  return z.object({
    fullName: z.string().trim().max(200, 'Họ tên tối đa 200 ký tự.'),
    phone: z.string().trim().max(30, 'Số điện thoại tối đa 30 ký tự.'),
    address: z.string().trim().max(500, 'Địa chỉ tối đa 500 ký tự.')
  }).superRefine((values, context) => {
    for (const field of fields) {
      if (profile[field] && !values[field]) {
        context.addIssue({ code: 'custom', path: [field], message: 'Vui lòng nhập giá trị thay thế; hiện chưa thể xóa thông tin đã lưu.' })
      }
    }
  })
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>

export function buildProfileUpdate(profile: ProfileValues, values: ProfileFormValues): UpdateUserDto {
  const payload: UpdateUserDto = {}
  for (const field of fields) {
    const value = values[field].trim()
    if (value && value !== (profile[field] ?? '')) payload[field] = value
  }
  return payload
}

export const MAX_KYC_FILE_SIZE = 5 * 1024 * 1024
export const kycSchema = z.object({
  idNumber: z.string().trim().min(1, 'Vui lòng nhập số CCCD hoặc Passport.').max(50, 'Số giấy tờ tối đa 50 ký tự.'),
  document: z.instanceof(File, { error: 'Vui lòng chọn ảnh giấy tờ.' })
    .refine((file) => ['image/jpeg', 'image/png'].includes(file.type), 'Chỉ chấp nhận ảnh JPEG hoặc PNG.')
    .refine((file) => file.size > 0 && file.size <= MAX_KYC_FILE_SIZE, 'Ảnh phải có dữ liệu và không vượt quá 5 MiB.')
})
export type KycFormValues = z.infer<typeof kycSchema>
