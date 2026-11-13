import { z } from 'zod'
import api from '@/lib/axios'
import { MerchantError } from './merchant.errors'
import {
  outletInputSchema,
  outletSchema,
  outletPageSchema,
  qrSchema,
  createdKeySchema,
  keyMetadataSchema,
} from '../schemas/outlet.schema'
import type { Outlet, OutletInput } from '../types/outlet.types'
const id = (value: string) => {
  if (!z.uuid().safeParse(value).success)
    throw new MerchantError('MERCHANT_INVALID_INPUT')
  return value
}
async function read<T>(
  request: () => Promise<{ data: unknown }>,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await request()
  const parsed = z
    .object({ success: z.literal(true), data: schema })
    .safeParse(response.data)
  if (!parsed.success) throw new MerchantError('MERCHANT_INVALID_RESPONSE')
  return parsed.data.data
}
export const merchantApi = {
  async listOutlets(merchantId: string, page: number, signal?: AbortSignal) {
    const result = await read(
      () =>
        api.get(`/merchants/${id(merchantId)}/outlets`, {
          params: { page, limit: 10 },
          signal,
        }),
      outletPageSchema,
    )
    if (result.content.some((row) => row.merchantId !== merchantId))
      throw new MerchantError('FORBIDDEN')
    return result
  },
  async createOutlet(merchantId: string, input: OutletInput) {
    const payload = outletInputSchema.safeParse(input)
    if (!payload.success) throw new MerchantError('MERCHANT_INVALID_INPUT')
    const result = await read(
      () =>
        api.post(`/merchants/${id(merchantId)}/outlets`, payload.data, {
          fundingNoReplay: true,
        }),
      outletSchema,
    )
    if (result.merchantId !== merchantId) throw new MerchantError('FORBIDDEN')
    return result
  },
  async getQr(merchantId: string, outlet: Outlet, signal?: AbortSignal) {
    const result = await read(
      () =>
        api.get(`/merchants/${id(merchantId)}/outlets/${id(outlet.id)}/qr`, {
          signal,
          headers: { 'Cache-Control': 'no-store' },
        }),
      qrSchema,
    )
    if (
      result.merchantId !== merchantId ||
      result.outletId !== outlet.id ||
      result.outletCode !== outlet.code
    )
      throw new MerchantError('FORBIDDEN')
    return result
  },
  async createKey(merchantId: string) {
    const result = await read(
      () =>
        api.post(
          `/merchants/${id(merchantId)}/api-keys`,
          {},
          { fundingNoReplay: true },
        ),
      createdKeySchema,
    )
    if (!result.key.startsWith(result.keyId + '.'))
      throw new MerchantError('MERCHANT_INVALID_RESPONSE')
    return result
  },
  async revokeKey(merchantId: string, keyId: string) {
    const result = await read(
      () =>
        api.delete(`/merchants/${id(merchantId)}/api-keys/${id(keyId)}`, {
          fundingNoReplay: true,
        }),
      keyMetadataSchema.extend({ revokedAt: z.string().min(1) }),
    )
    if (result.keyId !== keyId)
      throw new MerchantError('MERCHANT_INVALID_RESPONSE')
    return result
  },
}
