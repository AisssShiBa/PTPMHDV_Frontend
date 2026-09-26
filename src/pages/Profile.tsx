import { ShieldCheck, UserRound } from 'lucide-react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResourceError, ResourceLoading } from '@/components/common/ResourceState'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { useUserProfile } from '@/features/user/hooks/useUserProfile'
import { ProfileForm } from '@/features/user/components/ProfileForm'
import { KycForm } from '@/features/user/components/KycForm'
import { KycStatusBadge } from '@/features/user/components/KycStatusBadge'
import { errorMessage } from '@/lib/apiResponse'

export default function Profile() {
  const user = useAuthStore((state) => state.user)
  return user ? <ProfileContent key={user.id} authUserId={user.id} /> : null
}

function ProfileContent({ authUserId }: { authUserId: string }) {
  const resource = useUserProfile(authUserId)
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="space-y-2">
      <p className="text-sm font-medium text-primary">Tài khoản FinVault</p>
      <h1 className="text-3xl font-bold tracking-tight">Hồ sơ cá nhân</h1>
      <p className="text-sm text-muted-foreground">Quản lý thông tin liên hệ và xác thực danh tính của bạn.</p>
    </header>
    {resource.status === 'loading' && <ResourceLoading />}
    {resource.status === 'error' && <ResourceError onRetry={resource.reload} message={
      axios.isAxiosError(resource.error) && resource.error.response?.status === 404
        ? 'Chưa tìm thấy hồ sơ của bạn. Nếu vừa đăng ký, vui lòng thử tải lại sau ít phút.'
        : errorMessage(resource.error)
    } />}
    {resource.status === 'success' && <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-5 text-primary" />Thông tin cá nhân</CardTitle>
          <CardDescription>Cập nhật thông tin để chúng tôi có thể liên hệ với bạn.</CardDescription></CardHeader>
        <CardContent><ProfileForm key={resource.data.id} profile={resource.data} onSaved={resource.replace} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />Xác thực danh tính</span>
          <KycStatusBadge status={resource.data.kycStatus} />
        </CardTitle><CardDescription>Xác thực bằng CCCD hoặc Passport của bạn.</CardDescription></CardHeader>
        <CardContent><KycForm key={resource.data.id + resource.data.kycStatus} profile={resource.data}
          onSaved={resource.replace} onReload={resource.reload} /></CardContent>
      </Card>
    </div>}
  </div>
}
