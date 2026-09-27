import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { errorMessage } from '@/lib/apiResponse'
import { buildProfileUpdate, createProfileSchema, profileDefaults, type ProfileFormValues } from '../schemas/user.schema'
import { userService } from '../services/userService'
import type { UserProfile } from '../types/user.types'

export function ProfileForm({ profile, onSaved }: { profile: UserProfile; onSaved: (profile: UserProfile) => void }) {
  const busy = useRef(false)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormValues>({
    resolver: zodResolver(createProfileSchema(profile)),
    defaultValues: profileDefaults(profile)
  })
  const submit = async (values: ProfileFormValues) => {
    if (busy.current) return
    const payload = buildProfileUpdate(profile, values)
    if (!Object.keys(payload).length) { toast.info('Không có thông tin thay đổi.'); return }
    busy.current = true
    try {
      const saved = await userService.updateProfile(profile.authUserId, payload)
      if (useAuthStore.getState().user?.id !== profile.authUserId) return
      reset(profileDefaults(saved))
      onSaved(saved)
      toast.success('Đã cập nhật hồ sơ')
    } catch (error) {
      if (useAuthStore.getState().user?.id === profile.authUserId) setError('root', { message: errorMessage(error) })
    } finally { busy.current = false }
  }
  return <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
    <div className="space-y-2">
      <Label htmlFor="profile-email">Email</Label>
      <Input id="profile-email" type="email" value={profile.email} readOnly aria-describedby="email-help" />
      <p id="email-help" className="text-xs text-muted-foreground">Email đăng nhập không thể thay đổi tại đây.</p>
    </div>
    {([
      ['fullName', 'Họ và tên', 'name'],
      ['phone', 'Số điện thoại', 'tel'],
      ['address', 'Địa chỉ', 'street-address']
    ] as const).map(([name, label, autoComplete]) => <div key={name} className="space-y-2">
      <Label htmlFor={'profile-' + name}>{label}</Label>
      <Input id={'profile-' + name} type={name === 'phone' ? 'tel' : 'text'} autoComplete={autoComplete}
        {...register(name)} disabled={isSubmitting} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? name + '-error' : undefined} />
      {errors[name] && <p id={name + '-error'} role="alert" className="text-sm text-destructive">{errors[name]?.message}</p>}
    </div>)}
    {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
    <Button type="submit" disabled={isSubmitting || !isDirty}>{isSubmitting ? 'Đang lưu…' : 'Lưu thông tin'}</Button>
  </form>
}
