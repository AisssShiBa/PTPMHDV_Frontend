import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { formatVndExact } from '@/lib/format'
import { fundingQueries } from '../api/funding.queries'
import { topupLabels } from './topupLabels'
export function TopupHistory() {
  const owner = useAuthStore((state) => state.user?.id) ?? ''
  const query = useQuery(fundingQueries.history(owner))
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-bold">Lịch sử nạp tiền</h2>
        <button
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch()
          }}
        >
          Tải lại
        </button>
      </div>
      <QueryBoundary
        query={query}
        emptyFallback={<p>Chưa có yêu cầu nạp tiền.</p>}
      >
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border border-border p-3">
                <Link
                  className="block break-all text-primary underline"
                  to={'/app/topup/result?topupId=' + row.id}
                >
                  {row.code}
                </Link>
                <p>{formatVndExact(row.amount)} ₫</p>
                <p>{topupLabels[row.status]}</p>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
    </section>
  )
}
