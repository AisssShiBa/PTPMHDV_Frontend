import { Store } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResourceError, ResourceLoading } from '@/components/common/ResourceState'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { merchantService } from '@/features/merchant/services/merchantService'
import { MerchantRegisterForm } from '@/features/merchant/components/MerchantRegisterForm'
import { MerchantStatusCard } from '@/features/merchant/components/MerchantStatusCard'
import { errorMessage } from '@/lib/apiResponse'
import type { MerchantRecord } from '@/features/merchant/types/merchant.types'

export default function MerchantRegister() {
  const user = useAuthStore((state) => state.user)
  return user ? <MerchantContent key={user.id} authUserId={user.id} /> : null
}

function MerchantContent({ authUserId }: { authUserId: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['merchant', 'me', authUserId] as const

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => merchantService.getMyMerchant(signal),
    enabled: Boolean(authUserId)
  })

  const replace = (merchant: MerchantRecord) => {
    queryClient.setQueryData(queryKey, merchant)
  }

  const reload = () => {
    void query.refetch()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Đối tác FinVault</p>
        <h1 className="text-3xl font-bold tracking-tight">Đăng ký đối tác</h1>
        <p className="text-sm text-muted-foreground">Gửi thông tin thương hiệu và theo dõi kết quả xét duyệt của bạn.</p>
      </header>

      {query.isLoading && <ResourceLoading message="Đang kiểm tra thông tin đối tác…" />}

      {query.isError && (
        <ResourceError message={errorMessage(query.error)} onRetry={reload} />
      )}

      {query.isSuccess && (
        query.data ? (
          <MerchantStatusCard merchant={query.data} onReload={reload} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="size-5 text-primary" />
                Thông tin đăng ký
              </CardTitle>
              <CardDescription>Bạn chưa đăng ký đối tác. Bắt đầu bằng tên thương hiệu của bạn.</CardDescription>
            </CardHeader>
            <CardContent>
              <MerchantRegisterForm authUserId={authUserId} onRegistered={replace} onCheck={reload} />
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}
