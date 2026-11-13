import { BadgeCheck, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/features/auth'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUserProfile } from '../hooks/useUserProfile'
import { useKycStatus } from '../api/user.queries'
import type { KycStatus, UserProfile } from '../types/user.types'
import { ProfileForm } from './ProfileForm'
import { KycForm } from './KycForm'

const statusLabels: Record<KycStatus, string> = {
  NONE: 'Chưa nộp hồ sơ',
  PENDING: 'Đang chờ xét duyệt',
  APPROVED: 'Đã được xác thực',
  REJECTED: 'Hồ sơ bị từ chối'
}

export function UserProfilePanel() {
  const authUserId = useAuthStore((state) => state.user?.id)
  return authUserId
    ? <AccountProfile key={authUserId} authUserId={authUserId} />
    : <p role="status" className="p-6 text-sm text-muted-foreground">Vui lòng đăng nhập để xem hồ sơ.</p>
}

function AccountProfile({ authUserId }: { authUserId: string }) {
  const profile = useUserProfile(authUserId)
  const kyc = useKycStatus(authUserId)
  const reload = async () => {
    const [profileResult, kycResult] = await Promise.all([profile.refetch(), kyc.refetch()])
    return profileResult.isSuccess && kycResult.isSuccess
  }
  const savedKyc = (saved: UserProfile) => {
    if (useAuthStore.getState().user?.id !== authUserId) return
    void profile.replace(saved)
    void kyc.submitted(saved)
  }
  return <div className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-4 w-4" /> Bảo mật & định danh
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hồ sơ & Xác minh danh tính (KYC)</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quản lý thông tin cá nhân và theo dõi hồ sơ xác thực.</p>
      </div>
      <Button variant="outline" onClick={() => { void reload() }} disabled={profile.isFetching || kyc.isFetching}>
        <RefreshCw className="h-4 w-4" /> Làm mới trạng thái
      </Button>
    </header>
    <QueryBoundary query={profile} skeleton={<ProfileSkeleton />} isEmpty={(data) => !data}
      emptyFallback={<p role="status">Hồ sơ chưa sẵn sàng. Vui lòng làm mới trạng thái sau.</p>}>
      {(data) => <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
            <CardDescription>Email đăng nhập và thông tin liên hệ của bạn.</CardDescription>
          </CardHeader>
          <CardContent><ProfileForm key={data.authUserId} profile={data} onSaved={(saved) => { void profile.replace(saved) }} /></CardContent>
        </Card>
        <Card className="h-fit lg:col-span-2">
          <CardHeader>
            <CardTitle>Xác minh danh tính</CardTitle>
            <CardDescription>Nộp hai mặt giấy tờ JPEG hoặc PNG, tối đa 5 MiB mỗi ảnh.</CardDescription>
          </CardHeader>
          <CardContent>
            <QueryBoundary query={kyc} skeleton={<ProfileSkeleton />} isEmpty={(status) => !status}
              emptyFallback={<p role="status">Chưa có thông tin trạng thái xác thực. Vui lòng làm mới trạng thái.</p>}>
              {(status) => <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-primary/5 p-4" aria-live="polite">
                  <p className="flex items-center gap-2 font-semibold text-primary"><BadgeCheck className="h-5 w-5" />Cấp xác thực: {status.kycTier}</p>
                  <p className="text-sm">{statusLabels[status.kycStatus]}</p>
                </div>
                <KycForm key={data.authUserId + ':' + status.kycStatus} profile={{ ...data, ...status }}
                  rejectionReason={status.kycRejectReason} onSaved={savedKyc} onReload={reload} />
                <p className="text-xs text-muted-foreground">Cấp xác thực do hệ thống cung cấp. Ảnh giấy tờ đã gửi chỉ được xem qua liên kết có thời hạn.</p>
              </div>}
            </QueryBoundary>
          </CardContent>
        </Card>
      </div>}
    </QueryBoundary>
  </div>
}

function ProfileSkeleton() {
  return <div role="status" aria-label="Đang tải hồ sơ" className="space-y-4 p-4">
    <div className="h-6 w-40 animate-pulse rounded bg-muted" />
    <div className="h-10 w-full animate-pulse rounded bg-muted" />
    <div className="h-10 w-full animate-pulse rounded bg-muted" />
    <span className="sr-only">Đang tải dữ liệu…</span>
  </div>
}
