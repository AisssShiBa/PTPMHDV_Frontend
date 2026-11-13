import { z } from 'zod'
import { isValidMoneyInput, normalizeVnd, parseVndToBigInt } from '@/lib/format'
export const moneySchema = z
  .string()
  .refine(isValidMoneyInput, 'Nhập số tiền nguyên, tối đa 18 chữ số.')
export const responseMoneySchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,17})(\.0+)?$/)
  .transform(normalizeVnd)
export const topupInputSchema = z.object({
  amount: moneySchema.refine(
    (value) =>
      isValidMoneyInput(value) &&
      parseVndToBigInt(value) >= 10000n &&
      parseVndToBigInt(value) <= 100000000n,
    'Số tiền nạp từ 10.000 đến 100.000.000 đồng.',
  ),
})
export const topupStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'APPROVED',
  'REJECTED',
  'FAILED',
  'EXPIRED',
])
export const topupSchema = z.object({
  id: z.uuid(),
  amount: responseMoneySchema,
  code: z.string(),
  status: topupStatusSchema,
  expiresAt: z.string(),
})
export const createdTopupSchema = z.object({
  topupId: z.uuid(),
  paymentUrl: z.url(),
})
