import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type { MerchantRecord, MerchantRegisterDto } from '../types/merchant.types'

export const merchantService = {
  async getMyMerchant(signal?: AbortSignal) {
    const res = await api.get<ApiResponse<MerchantRecord | null>>('/merchants/me', { signal })
    // Only explicit data:null means no registration. A 404 is an API/deployment error.
    return unwrap(res.data)
  },
  async registerMerchant(payload: MerchantRegisterDto) {
    const res = await api.post<ApiResponse<MerchantRecord>>('/merchants/register', payload)
    return unwrap(res.data)
  }
}
