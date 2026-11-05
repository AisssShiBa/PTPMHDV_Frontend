import { useRef, useState } from 'react'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorCode, errorMessage } from '@/lib/apiResponse'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { merchantPayload, merchantSchema, type MerchantFormValues } from '../schemas/merchant.schema'
import { merchantService } from '../services/merchantService'
import type { MerchantRecord } from '../types/merchant.types'

export function MerchantRegisterForm({ authUserId, onRegistered, onCheck }: {
  authUserId: string; onRegistered: (merchant: MerchantRecord) => void; onCheck: () => void
}) {
  const busy = useRef(false)
  const [needsCheck, setNeedsCheck] = useState(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantSchema), defaultValues: { businessName: '', taxId: '', bankAccount: '' }
  })
  const submit = async (values: MerchantFormValues) => {
    if (busy.current || needsCheck) return
    busy.current = true
    try {
      const merchant = await merchantService.registerMerchant(merchantPayload(values))
      if (useAuthStore.getState().user?.id !== authUserId) return
      onRegistered(merchant)
      toast.success('Đã gửi đăng ký đối tác')
    } catch (reason) {
      if (useAuthStore.getState().user?.id !== authUserId) return
      setError('root', { message: errorCode(reason) === 'DUPLICATE_RESOURCE'
        ? 'Bạn đã đăng ký đối tác. Vui lòng tải lại thông tin.' : errorMessage(reason) })
      if (errorCode(reason) === 'DUPLICATE_RESOURCE' || !axios.isAxiosError(reason) ||
          !reason.response || reason.response.status >= 500) setNeedsCheck(true)
    } finally { busy.current = false }
  }
  return <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
    {([['businessName', 'Tên thương hiệu', 'Tên cửa hàng hoặc doanh nghiệp'],
      ['taxId', 'Mã số thuế (không bắt buộc)', 'Nhập mã số thuế'],
      ['bankAccount', 'Số tài khoản thanh toán (không bắt buộc)', 'Nhập số tài khoản']] as const)
      .map(([name, label, placeholder]) => <div key={name} className="space-y-2">
        <Label htmlFor={'merchant-' + name}>{label}</Label>
        <Input id={'merchant-' + name} {...register(name)} placeholder={placeholder} disabled={isSubmitting || needsCheck}
          aria-invalid={!!errors[name]} aria-describedby={errors[name] ? name + '-error' : undefined} />
        {errors[name] && <p id={name + '-error'} role="alert" className="text-sm text-destructive">{errors[name]?.message}</p>}
      </div>)}
    {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
    {needsCheck ? <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Vui lòng kiểm tra trạng thái đăng ký trước khi gửi lại.</p>
      <Button type="button" variant="outline" onClick={onCheck}>Kiểm tra trạng thái đăng ký</Button>
    </div> : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang gửi đăng ký…' : 'Gửi đăng ký đối tác'}</Button>}
  </form>
}
