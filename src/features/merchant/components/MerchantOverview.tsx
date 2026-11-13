import { Link } from 'react-router-dom'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { useAuthStore } from '@/features/auth'
import { useMyMerchant } from '../api/merchant.queries'
import { MerchantTools } from './MerchantTools'
import { MerchantRegisterForm } from './MerchantRegisterForm'
import { MerchantStatusCard } from './MerchantStatusCard'
export function MerchantOverview({
  registration = false,
}: {
  registration?: boolean
}) {
  const owner = useAuthStore((state) => state.user?.id)
  return (
    <MerchantOverviewSession
      key={owner}
      owner={owner ?? ''}
      registration={registration}
    />
  )
}
function MerchantOverviewSession({
  owner,
  registration,
}: {
  owner: string
  registration: boolean
}) {
  const query = useMyMerchant()
  const reload = () => {
    void query.refetch()
  }
  const empty = registration ? (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-5 text-xl font-bold">Thông tin đăng ký</h2>
      <MerchantRegisterForm
        authUserId={owner}
        onRegistered={() => {
          void query.refetch()
        }}
        onCheck={reload}
      />
    </section>
  ) : (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">Bạn chưa đăng ký đối tác</h2>
      <p>Đăng ký để gửi hồ sơ xét duyệt đối tác FinVault.</p>
      <Link className="text-primary underline" to="/merchant/register">
        Đăng ký đối tác
      </Link>
    </section>
  )
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">
          {registration ? 'Đăng ký đối tác' : 'Cổng đối tác'}
        </h1>
        <p className="text-muted-foreground">
          Quản lý hồ sơ và trạng thái xét duyệt đối tác của tài khoản hiện tại.
        </p>
      </header>
      <QueryBoundary
        query={query}
        isEmpty={(value) => value === null}
        emptyFallback={empty}
      >
        {(merchant) =>
          merchant && (
            <div className="space-y-6">
              <MerchantStatusCard merchant={merchant} onReload={reload} />
              <MerchantTools
                key={[owner, merchant.id, merchant.status].join(':')}
                owner={owner}
                merchant={merchant}
              />
            </div>
          )
        }
      </QueryBoundary>
      <nav className="flex gap-4">
        <Link to="/app">Về ví</Link>
        {registration && <Link to="/merchant">Về cổng đối tác</Link>}
      </nav>
    </div>
  )
}
