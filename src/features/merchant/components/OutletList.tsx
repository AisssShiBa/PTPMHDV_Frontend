import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { merchantQueries } from '../api/merchant.queries'
import { OutletCreateForm } from './OutletCreateForm'
import { OutletQrCard } from './OutletQrCard'
import type { Outlet } from '../types/outlet.types'
export function OutletList({
  owner,
  merchantId,
  businessName,
}: {
  owner: string
  merchantId: string
  businessName: string
}) {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Outlet>()
  const query = useQuery(merchantQueries.outlets(owner, merchantId, page))
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">Điểm bán và mã QR</h2>
      <OutletCreateForm owner={owner} merchantId={merchantId} />
      <Button
        variant="outline"
        onClick={() => {
          void query.refetch()
        }}
        disabled={query.isFetching}
      >
        Tải lại điểm bán
      </Button>
      <QueryBoundary
        query={query}
        isEmpty={(data) => data.content.length === 0}
        emptyFallback={<p>Chưa có điểm bán.</p>}
      >
        {(data) => (
          <>
            <ul className="space-y-3">
              {data.content.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0 break-all">
                    <strong>{row.name}</strong>
                    <p>{row.code}</p>
                  </div>
                  <Button variant="outline" onClick={() => setSelected(row)}>
                    Xem QR {row.code}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Trang trước
              </Button>
              <span>
                Trang {data.page}/{data.totalPages}
              </span>
              <Button
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
            </div>
          </>
        )}
      </QueryBoundary>
      {selected && (
        <OutletQrCard
          merchantId={merchantId}
          businessName={businessName}
          outlet={selected}
          close={() => setSelected(undefined)}
        />
      )}
    </section>
  )
}
