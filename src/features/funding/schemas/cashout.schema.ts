import { z } from 'zod'
import { moneySchema, responseMoneySchema } from './topup.schema'
import { isValidMoneyInput, parseVndToBigInt } from '@/lib/format'
export const cashoutInputSchema = z.object({
  amount: moneySchema.refine(
    (value) => isValidMoneyInput(value) && parseVndToBigInt(value) > 0n,
    'Số tiền rút phải lớn hơn 0.',
  ),
  destination: z.string().trim().max(255).optional(),
})
export const cashoutStatusSchema = z.enum([
  'REQUESTED',
  'HOLDING',
  'PAYOUT_PENDING',
  'SUCCEEDED',
  'FAILED',
])
export const cashoutSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  amount: responseMoneySchema,
  destination: z.string().nullable(),
  status: cashoutStatusSchema,
  failureReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  replayed: z.boolean().optional(),
})
