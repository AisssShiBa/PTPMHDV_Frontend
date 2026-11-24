import { useEffect, useState } from 'react'
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
  const [now, setNow] = useState(Date.now)
  const expiresAt = Date.parse(documents.data?.expiresAt ?? '')
  const expired = Boolean(documents.data) && (!Number.isFinite(expiresAt) || expiresAt <= now)
  useEffect(() => {
    if (!visible || !Number.isFinite(expiresAt)) return
    // Refresh the clock after suspended/background tabs resume as well.
    const updateClock = () => setNow(Date.now())
    const timer = expiresAt > now
      ? setTimeout(updateClock, Math.min(Math.max(0, expiresAt - Date.now()), 2147483647))
      : undefined
    window.addEventListener('focus', updateClock)
    document.addEventListener('visibilitychange', updateClock)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', updateClock)
      document.removeEventListener('visibilitychange', updateClock)
    }
  }, [visible, expiresAt, now])

  return (
    <section aria-label="Ảnh hồ sơ KYC" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => { setNow(Date.now()); setVisible(current => !current) }}>
          {visible ? 'Ẩn ảnh CCCD' : 'Xem hai mặt CCCD'}
        </Button>
        {(documents.isError || (visible && expired)) && (
          <Button type="button" variant="ghost" size="sm" disabled={documents.isFetching} onClick={() => void documents.refetch()}>
            {expired ? 'Tải lại ảnh' : 'Thử lại'}
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

      {visible && expired && <p role="status" className="text-sm text-muted-foreground">Liên kết xem ảnh đã hết hạn. Vui lòng tải lại ảnh.</p>}

      {visible && !expired && !documents.isError && documents.data && (
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
