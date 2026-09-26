import { z } from 'zod'
import type { MerchantRegisterDto } from '../types/merchant.types'

export const merchantSchema = z.object({
  businessName: z.string().trim().min(1, 'Vui lòng nhập tên thương hiệu.').max(200, 'Tên thương hiệu tối đa 200 ký tự.'),
  taxId: z.string().trim().max(50, 'Mã số thuế tối đa 50 ký tự.'),
  bankAccount: z.string().trim().max(100, 'Số tài khoản tối đa 100 ký tự.')
})
export type MerchantFormValues = z.infer<typeof merchantSchema>

export function merchantPayload(values: MerchantFormValues): MerchantRegisterDto {
  return {
    businessName: values.businessName.trim(),
    ...(values.taxId.trim() ? { taxId: values.taxId.trim() } : {}),
    ...(values.bankAccount.trim() ? { bankAccount: values.bankAccount.trim() } : {})
  }
}
