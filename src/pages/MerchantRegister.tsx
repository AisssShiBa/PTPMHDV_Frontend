import { Store } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResourceError, ResourceLoading } from '@/components/common/ResourceState'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { merchantService } from '@/features/merchant/services/merchantService'
import { MerchantRegisterForm } from '@/features/merchant/components/MerchantRegisterForm'
import { MerchantStatusCard } from '@/features/merchant/components/MerchantStatusCard'
import { useRemoteResource } from '@/hooks/useRemoteResource'
import { errorMessage } from '@/lib/apiResponse'

const loadMerchant = (_owner: string, signal: AbortSignal) => merchantService.getMyMerchant(signal)

export default function MerchantRegister() {
  const user = useAuthStore((state) => state.user)
  return user ? <MerchantContent key={user.id} authUserId={user.id} /> : null
}
function MerchantContent({ authUserId }: { authUserId: string }) {
  const resource = useRemoteResource(authUserId, loadMerchant)
  return <div className="mx-auto max-w-2xl space-y-6">
    <header className="space-y-2">
      <p className="text-sm font-medium text-primary">Đối tác FinVault</p>
      <h1 className="text-3xl font-bold tracking-tight">Đăng ký đối tác</h1>
      <p className="text-sm text-muted-foreground">Gửi thông tin thương hiệu và theo dõi kết quả xét duyệt của bạn.</p>
    </header>
    {resource.status === 'loading' && <ResourceLoading message="Đang kiểm tra thông tin đối tác…" />}
    {resource.status === 'error' && <ResourceError message={errorMessage(resource.error)} onRetry={resource.reload} />}
    {resource.status === 'success' && (resource.data
      ? <MerchantStatusCard merchant={resource.data} onReload={resource.reload} />
      : <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Store className="size-5 text-primary" />Thông tin đăng ký</CardTitle>
          <CardDescription>Bạn chưa đăng ký đối tác. Bắt đầu bằng tên thương hiệu của bạn.</CardDescription></CardHeader>
        <CardContent><MerchantRegisterForm authUserId={authUserId} onRegistered={resource.replace} onCheck={resource.reload} /></CardContent>
      </Card>)}
  </div>
}
