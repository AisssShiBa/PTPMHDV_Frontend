import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/apiResponse'
import { useKycDocuments } from '../api/admin.queries'

/**
 * Xem ảnh CCCD hai mặt qua endpoint có ghi audit.
 * URL ảnh chỉ nằm trong bộ nhớ (React Query cache/state); không ghi localStorage,
 * sessionStorage hay log.
 */
export function AdminKycDocumentsViewer({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false)
  const documents = useKycDocuments(userId, visible)

  return (
    <section aria-label="Ảnh hồ sơ KYC" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => setVisible((current) => !current)}>
          {visible ? 'Ẩn ảnh CCCD' : 'Xem hai mặt CCCD'}
        </Button>
        {documents.isError && (
          <Button type="button" variant="ghost" size="sm" onClick={() => void documents.refetch()}>
            Thử lại
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Mỗi lần tải ảnh được ghi vào nhật ký kiểm toán.
        </p>
      </div>

      {visible && documents.isLoading && (
        <p className="text-sm text-muted-foreground" role="status">
          Đang tải ảnh CCCD…
        </p>
      )}

      {visible && documents.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(documents.error)}
        </p>
      )}

      {visible && documents.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['frontUrl', 'backUrl'] as const).map((side) => (
              <figure key={side} className="space-y-2">
                <figcaption className="text-sm font-semibold">
                  {side === 'frontUrl' ? 'Mặt trước' : 'Mặt sau'}
                </figcaption>
                <img
                  src={documents.data[side]}
                  alt={side === 'frontUrl' ? 'CCCD mặt trước' : 'CCCD mặt sau'}
                  referrerPolicy="no-referrer"
                  className="h-64 w-full rounded-xl border border-border bg-muted/30 object-contain"
                />
              </figure>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ảnh có hiệu lực đến{' '}
            {new Date(documents.data.expiresAt).toLocaleTimeString('vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh'
            })}{' '}
            (giờ Việt Nam).
          </p>
        </>
      )}
    </section>
  )
}
