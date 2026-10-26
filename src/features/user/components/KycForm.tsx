import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { errorCode, errorMessage } from '@/lib/apiResponse'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { kycSchema, MAX_KYC_FILE_SIZE, type KycFormValues } from '../schemas/user.schema'
import { userService } from '../services/userService'
import type { UserProfile } from '../types/user.types'
import { KycDocumentViewer } from './KycDocumentViewer'

export function KycForm({ profile, onSaved, onReload }: {
  profile: UserProfile; onSaved: (profile: UserProfile) => void; onReload: () => void
}) {
  const busy = useRef(false)
  const [needsReload, setNeedsReload] = useState(false)
  const { register, handleSubmit, control, setValue, setError, formState: { errors, isSubmitting } } = useForm<KycFormValues>({
    resolver: zodResolver(kycSchema), defaultValues: { idNumber: '' }
  })
  const front = useWatch({ control, name: 'front' })
  const back = useWatch({ control, name: 'back' })

  const submit = async (values: KycFormValues) => {
    if (busy.current || needsReload || !['NONE', 'REJECTED'].includes(profile.kycStatus)) return
    busy.current = true
    try {
      const saved = await userService.submitKyc(values)
      if (useAuthStore.getState().user?.id !== profile.authUserId) return
      onSaved(saved)
      toast.success('Đã gửi hồ sơ xác thực, vui lòng chờ xét duyệt.')
    } catch (reason) {
      if (useAuthStore.getState().user?.id !== profile.authUserId) return
      setError('root', { message: errorMessage(reason) })
      // Reload before retrying an upload whose outcome could be ambiguous.
      if (!['INVALID_IMAGE', 'INVALID_UPLOAD', 'KYC_DOCUMENT_REQUIRED', 'KYC_DOCUMENTS_REQUIRED', 'FILE_TOO_LARGE', 'VALIDATION_ERROR'].includes(errorCode(reason) ?? '')) {
        setNeedsReload(true)
      }
    } finally { busy.current = false }
  }
  const canSubmit = profile.kycStatus === 'NONE' || profile.kycStatus === 'REJECTED'
  return <div className="space-y-5">
    {profile.kycStatus === 'PENDING' && <p className="rounded-lg bg-amber-500/10 p-4 text-sm">Hồ sơ đang được xét duyệt. Bạn có thể tải lại trạng thái sau khi có kết quả.</p>}
    {profile.kycStatus === 'APPROVED' && <p className="rounded-lg bg-emerald-500/10 p-4 text-sm">Danh tính của bạn đã được xác thực.</p>}
    {profile.kycStatus === 'REJECTED' && <p className="rounded-lg bg-destructive/10 p-4 text-sm">Hồ sơ chưa được chấp thuận. Vui lòng kiểm tra thông tin và gửi lại ảnh giấy tờ rõ nét.</p>}
    {canSubmit && <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="kyc-number">Số CCCD / Passport</Label>
        <Input id="kyc-number" {...register('idNumber')} disabled={isSubmitting || needsReload}
          autoComplete="off" aria-invalid={!!errors.idNumber} aria-describedby="kyc-number-help" />
        <p id="kyc-number-help" className="text-xs text-muted-foreground">Nhập đúng số trên giấy tờ, tối đa 50 ký tự.</p>
        {errors.idNumber && <p role="alert" className="text-sm text-destructive">{errors.idNumber.message}</p>}
      </div>
      {(['front', 'back'] as const).map((side) => <div key={side} className="space-y-2">
        <Label htmlFor={`kyc-${side}`}>{side === 'front' ? 'Ảnh mặt trước' : 'Ảnh mặt sau'}</Label>
        <Input id={`kyc-${side}`} type="file" accept="image/jpeg,image/png" disabled={isSubmitting || needsReload}
          onChange={(event) => setValue(side, event.target.files?.[0] as File, { shouldValidate: true })}
          aria-invalid={!!errors[side]} aria-describedby={`kyc-${side}-help`} />
        <p id={`kyc-${side}-help`} className="text-xs text-muted-foreground">Ảnh JPEG hoặc PNG, tối đa 5 MiB. Chụp rõ thông tin và không che góc giấy tờ.</p>
        {errors[side] && <p role="alert" className="text-sm text-destructive">{errors[side].message}</p>}
        <ImagePreview file={side === 'front' ? front : back} label={side === 'front' ? 'mặt trước' : 'mặt sau'} />
      </div>)}
      {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
      {needsReload
        ? <Button type="button" variant="outline" onClick={onReload}>Tải lại trạng thái hồ sơ</Button>
        : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang gửi hồ sơ…' : 'Gửi xác thực'}</Button>}
    </form>}
    {!canSubmit && <Button variant="outline" onClick={onReload}>Tải lại trạng thái</Button>}
    {profile.hasKycDocument && <KycDocumentViewer key={profile.updatedAt} authUserId={profile.authUserId} />}
  </div>
}

function ImagePreview({ file, label }: { file?: File; label: string }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
    if (!file || !['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > MAX_KYC_FILE_SIZE) {
      setUrl(''); return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  if (failed) return <p role="alert" className="text-sm text-destructive">Không đọc được ảnh {label}. Vui lòng chọn tệp khác.</p>
  return url ? <img src={url} alt={`Xem trước ${label}`} className="max-h-64 w-full rounded-lg border border-border object-contain" onError={() => setFailed(true)} /> : null
}
