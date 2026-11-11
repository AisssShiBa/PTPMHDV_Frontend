import { z } from 'zod'

/** DECIMAL(20,2) của wallet-service: tối đa 18 chữ số nguyên. */
export const MAX_ADJUST_AMOUNT = 999_999_999_999_999_999n

/**
 * Số tiền điều chỉnh là CHUỖI nguyên dương, kiểm bằng BigInt (không Number).
 * Từ chối: rỗng, 0, âm, thập phân, ký hiệu khoa học, vượt 18 chữ số.
 */
export const adjustAmountSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập số tiền điều chỉnh.')
  .regex(/^[1-9]\d*$/, 'Số tiền phải là số nguyên dương, không có dấu chấm hay dấu âm.')
  .refine(
    // Chỉ gọi BigInt khi chuỗi đã qua regex để tránh TypeError từ zod.
    (value) => !/^[1-9]\d*$/.test(value) || (value.length <= 18 && BigInt(value) <= MAX_ADJUST_AMOUNT),
    'Số tiền vượt quá giới hạn cho phép.'
  )

/** Body POST .../anomalies/:id/adjust: direction, amount (string), reason 5..500. */
export const adjustAnomalySchema = z.object({
  direction: z.enum(['CREDIT', 'DEBIT']),
  amount: adjustAmountSchema,
  reason: z
    .string()
    .trim()
    .min(5, 'Lý do phải có từ 5 đến 500 ký tự.')
    .max(500, 'Lý do tối đa 500 ký tự.')
})

export type AdjustAnomalyInput = z.infer<typeof adjustAnomalySchema>
