import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/apiResponse'
import { userService } from '../services/userService'

export function KycDocumentViewer({ authUserId }: { authUserId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef<AbortController | null>(null)
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => { request.current?.abort(); clearTimeout(expiry.current) }, [authUserId])
  const open = async () => {
    request.current?.abort()
    clearTimeout(expiry.current)
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError(''); setUrl(null)
    try {
      const document = await userService.getKycDocument(authUserId, controller.signal)
      if (controller.signal.aborted) return
      const parsed = new URL(document.url)
      if (!['http:', 'https:'].includes(parsed.protocol) || !(document.expiresIn > 0)) throw new Error('Invalid document URL')
      setUrl(document.url)
      expiry.current = setTimeout(() => {
        setUrl(null)
        setError('Liên kết xem ảnh đã hết hạn. Bạn có thể mở lại ảnh.')
      }, document.expiresIn * 1000)
    } catch (reason) {
      if (!controller.signal.aborted) setError(errorMessage(reason))
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }
  return <div className="space-y-3 border-t border-border pt-4">
    <Button type="button" variant="outline" disabled={loading} onClick={() => void open()}>
      {loading ? 'Đang mở ảnh…' : url ? 'Tải lại ảnh giấy tờ' : 'Xem giấy tờ đã gửi'}
    </Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {url && <div className="space-y-2">
      <img src={url} alt="Giấy tờ xác thực đã gửi" referrerPolicy="no-referrer"
        className="max-h-80 w-full rounded-lg border border-border object-contain"
        onError={() => { setUrl(null); setError('Không tải được ảnh. Vui lòng mở lại ảnh giấy tờ.') }} />
      <Button type="button" variant="ghost" onClick={() => { setUrl(null); clearTimeout(expiry.current) }}>Đóng ảnh</Button>
    </div>}
  </div>
}
