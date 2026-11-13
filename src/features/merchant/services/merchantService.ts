import { z } from 'zod'
import {
  merchantRecordSchema,
  merchantRegisterDtoSchema,
} from '../schemas/merchant.schema'
import { MerchantError } from '../api/merchant.errors'
import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type {
  MerchantRecord,
  MerchantRegisterDto,
} from '../types/merchant.types'

export const merchantService = {
  async register(payload: MerchantRegisterDto) {
    return merchantService.registerMerchant(payload)
  },
  async getById(id: string) {
    const res = await api.get<ApiResponse<MerchantRecord>>(
      '/merchants/' + encodeURIComponent(id),
    )
    return unwrap(res.data)
  },
  async checkActive(id: string) {
    const res = await api.get<ApiResponse<{ active: boolean }>>(
      '/merchants/' + encodeURIComponent(id) + '/active',
    )
    return unwrap(res.data)
  },
  async getMerchants() {
    const res = await api.get<ApiResponse<MerchantRecord[]>>('/merchants')
    return unwrap(res.data)
  },
  async getMyMerchant(signal?: AbortSignal, expectedOwner?: string) {
    const res = await api.get<unknown>('/merchants/me', { signal })
    const result = z
      .object({
        success: z.literal(true),
        data: merchantRecordSchema.nullable(),
      })
      .safeParse(res.data)
    if (!result.success) throw new MerchantError('MERCHANT_INVALID_RESPONSE')
    if (
      result.data.data &&
      expectedOwner &&
      result.data.data.ownerId !== expectedOwner
    )
      throw new MerchantError('FORBIDDEN')
    return result.data.data
  },
  async registerMerchant(payload: MerchantRegisterDto, expectedOwner?: string) {
    const input = merchantRegisterDtoSchema.safeParse(payload)
    if (!input.success) throw new MerchantError('MERCHANT_INVALID_INPUT')
    // Registration has an owner uniqueness constraint, not an idempotency contract.
    // Never replay this POST automatically after a 401 or ambiguous response.
    const res = await api.post<unknown>('/merchants/register', input.data, {
      fundingNoReplay: true,
    })
    const result = z
      .object({ success: z.literal(true), data: merchantRecordSchema })
      .safeParse(res.data)
    if (!result.success) throw new MerchantError('MERCHANT_INVALID_RESPONSE')
    if (expectedOwner && result.data.data.ownerId !== expectedOwner)
      throw new MerchantError('FORBIDDEN')
    return result.data.data
  },
}
