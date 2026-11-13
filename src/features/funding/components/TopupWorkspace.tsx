import { useWalletBalance } from '@/features/wallet'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { formatVndExact } from '@/lib/format'
import { TopupForm } from './TopupForm'
import { TopupHistory } from './TopupHistory'
export function TopupWorkspace() {
  const wallet = useWalletBalance()
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold">Nạp tiền vào ví</h1>
        <p className="mt-2 text-muted-foreground">
          Thanh toán thử nghiệm qua VNPAY Sandbox.
        </p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopupForm />
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 font-bold">Số dư khả dụng</h2>
            <QueryBoundary query={wallet}>
              {(balance) => (
                <p className="text-xl font-bold">
                  {formatVndExact(balance.availableBalance)} ₫
                </p>
              )}
            </QueryBoundary>
          </section>
          <TopupHistory />
        </aside>
      </div>
    </div>
  )
}
