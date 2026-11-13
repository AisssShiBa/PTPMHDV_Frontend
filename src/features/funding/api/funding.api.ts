import { z } from 'zod'
import api from '@/lib/axios'
import {
  topupSchema,
  topupInputSchema,
  createdTopupSchema,
} from '../schemas/topup.schema'
import { cashoutInputSchema, cashoutSchema } from '../schemas/cashout.schema'
import type { CashOutInput } from '../types/funding.types'
import { FundingError, fundingError } from './funding.errors'
async function read<T>(
  request: () => Promise<{ data: unknown }>,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await request()
    return z
      .object({ success: z.literal(true), data: schema })
      .parse(response.data).data
  } catch (error) {
    throw fundingError(error)
  }
}
const orderId = (id: string) => validate(z.uuid(), id)
export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw new FundingError('HTTP_400')
  return result.data
}
const keyHeader = (key: string) => ({
  'Idempotency-Key': validate(z.uuid(), key),
})
export const fundingApi = {
  createTopup: async (amount: string, key: string) => {
    const payload = validate(topupInputSchema, { amount })
    return read(
      () =>
        api.post('/payments/topups', payload, {
          headers: keyHeader(key),
          fundingNoReplay: true,
        }),
      createdTopupSchema,
    )
  },
  getTopup: (id: string, signal?: AbortSignal) =>
    read(
      () => api.get(`/payments/topups/${orderId(id)}`, { signal }),
      topupSchema,
    ),
  getTopups: (signal?: AbortSignal) =>
    read(() => api.get('/payments/topups', { signal }), z.array(topupSchema)),
  createCashOut: (input: CashOutInput, key: string) =>
    read(
      () =>
        api.post('/funding/cash-out', validate(cashoutInputSchema, input), {
          headers: keyHeader(key),
          fundingNoReplay: true,
        }),
      cashoutSchema,
    ),
  getCashOut: (id: string, signal?: AbortSignal) =>
    read(
      () => api.get(`/funding/cash-out/${orderId(id)}`, { signal }),
      cashoutSchema,
    ),
  confirmCashOut: (id: string, transactionToken: string) =>
    read(
      () =>
        api.post(
          `/funding/cash-out/${orderId(id)}/confirm`,
          {},
          {
            headers: { 'X-Transaction-Token': transactionToken },
            fundingNoReplay: true,
          },
        ),
      cashoutSchema,
    ),
}
