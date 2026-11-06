import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/apiResponse'
import { adminService } from '../services/adminService'
import type { AdminKycDocuments } from '../types/admin.types'

export function AdminKycDocumentsViewer({ userId }: { userId: string }) {
  const [documents, setDocuments] = useState<AdminKycDocuments | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef<AbortController | null>(null)
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => { request.current?.abort(); clearTimeout(expiry.current) }, [userId])
  const open = async () => {
    if (request.current && !request.current.signal.aborted) return
    const controller = new AbortController()
    request.current = controller
    clearTimeout(expiry.current)
    setLoading(true); setError(''); setDocuments(null)
    try {
      const data = await adminService.getKycDocuments(userId, controller.signal)
      if (controller.signal.aborted) return
      const remaining = Date.parse(data.expiresAt) - Date.now()
      if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 2147483647 ||
        ![data.frontUrl, data.backUrl].every((url) => ['http:', 'https:'].includes(new URL(url).protocol))) {
        throw new Error('Invalid document response')
      }
      setDocuments(data)
      expiry.current = setTimeout(() => {
        setDocuments(null)
        setError('Liên kết xem ảnh đã hết hạn. Vui lòng tải lại ảnh.')
      }, remaining)
    } catch (reason) {
      if (!controller.signal.aborted) setError(errorMessage(reason))
    } finally {
      if (!controller.signal.aborted) { setLoading(false); request.current = null }
    }
  }
  return <section aria-label="Ảnh hồ sơ KYC" className="space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" disabled={loading} onClick={() => void open()}>
        {loading ? 'Đang tải ảnh…' : documents ? 'Tải lại ảnh CCCD' : 'Xem hai mặt CCCD'}
      </Button>
      <p className="text-xs text-muted-foreground">Mỗi lần tải ảnh được ghi vào nhật ký kiểm toán.</p>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {documents && <>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['frontUrl', 'backUrl'] as const).map((side) => <figure key={side} className="space-y-2">
          <figcaption className="text-sm font-semibold">{side === 'frontUrl' ? 'Mặt trước' : 'Mặt sau'}</figcaption>
          <img src={documents[side]} alt={side === 'frontUrl' ? 'CCCD mặt trước' : 'CCCD mặt sau'} referrerPolicy="no-referrer"
            className="h-64 w-full rounded-xl border border-border bg-muted/30 object-contain"
            onError={() => { setDocuments(null); clearTimeout(expiry.current); setError('Không tải được ảnh. Vui lòng tải lại ảnh CCCD.') }} />
        </figure>)}
      </div>
      <p className="text-xs text-muted-foreground">Ảnh có hiệu lực đến {new Date(documents.expiresAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ Việt Nam).</p>
      <Button type="button" variant="ghost" onClick={() => { setDocuments(null); clearTimeout(expiry.current) }}>Ẩn ảnh CCCD</Button>
    </>}
  </section>
}
