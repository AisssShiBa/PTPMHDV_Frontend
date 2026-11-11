import { z } from 'zod'

/**
 * Duyệt / từ chối KYC.
 * Backend chỉ bắt buộc `detail` khi REJECTED (1..500 ký tự).
 */
export const kycReviewSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    detail: z.string().trim().max(500, 'Lý do tối đa 500 ký tự').optional()
  })
  .superRefine((value, ctx) => {
    if (value.status === 'REJECTED' && !value.detail) {
      ctx.addIssue({
        code: 'custom',
        path: ['detail'],
        message: 'Vui lòng nhập lý do từ chối (1 đến 500 ký tự).'
      })
    }
  })

export type KycReviewInput = z.infer<typeof kycReviewSchema>

/** Đổi cấp KYC: reason bắt buộc 1..500 ký tự. */
export const kycTierSchema = z.object({
  tier: z.union([z.literal(1), z.literal(2)]),
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do đổi cấp (1 đến 500 ký tự).')
    .max(500, 'Lý do tối đa 500 ký tự')
})

export type KycTierInput = z.infer<typeof kycTierSchema>

/** Từ chối lệnh nạp tiền: backend yêu cầu reason 1..500 ký tự. */
export const topupRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do từ chối (1 đến 500 ký tự).')
    .max(500, 'Lý do tối đa 500 ký tự')
})

export type TopupRejectInput = z.infer<typeof topupRejectSchema>
