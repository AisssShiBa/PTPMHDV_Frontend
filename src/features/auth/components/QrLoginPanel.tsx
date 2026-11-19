import { AlertCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useQrLogin } from '../hooks/useQrLogin'
import { useAuthStore } from '../stores/useAuthStore'
import type { User } from '../types/auth.types'

interface QrLoginPanelProps {
  enabled?: boolean
  compact?: boolean
  onApproved: (user: User) => void
}

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

function renderQrContent(qr: ReturnType<typeof useQrLogin>, loading: boolean, compact: boolean) {
  if (loading) return (
    <div role="status" className="space-y-3 text-muted-foreground">
      <Loader2 aria-hidden="true" className="mx-auto h-8 w-8 motion-safe:animate-spin" />
      <p className="text-sm">Đang tạo mã QR bảo mật...</p>
    </div>
  )
  if (qr.initError) return (
    <div className="space-y-3">
      <AlertCircle aria-hidden="true" className="mx-auto h-8 w-8 text-destructive" />
      <p role="alert" className="text-sm text-destructive">{qr.initError}</p>
      <Button type="button" size="sm" className="min-h-11" onClick={qr.refreshQrSession}>Thử tạo lại mã QR</Button>
    </div>
  )
  if (qr.isExpired || qr.isRejected) return (
    <div className="space-y-3">
      <AlertCircle aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
      <p role="status" className="text-sm font-semibold">{qr.isRejected ? 'Yêu cầu đăng nhập bị từ chối' : 'Mã QR đã hết hạn'}</p>
      <Button type="button" size="sm" className="min-h-11" onClick={qr.refreshQrSession}>
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        {qr.isRejected ? 'Tạo mã QR khác' : 'Làm mới mã QR'}
      </Button>
    </div>
  )
  if (qr.qrData) return (
    <QRCodeSVG value={qr.qrPayload} size={compact ? 180 : 200} level="H" marginSize={4}
      title="Mã QR đăng nhập FinVault" role="img" aria-label="Mã QR đăng nhập FinVault" className="max-w-full" />
  )
  return (
    <div className="space-y-3">
      <p role="status" className="text-sm text-muted-foreground">Mã QR chưa sẵn sàng.</p>
      <Button type="button" size="sm" className="min-h-11" onClick={qr.refreshQrSession}>Tạo mã QR</Button>
    </div>
  )
}

export function QrLoginPanel({ enabled = true, compact = false, onApproved }: QrLoginPanelProps) {
  const qr = useQrLogin({ enabled, onApproved })
  const authBusy = useAuthStore(state => state.loading || Boolean(state.user || state.accessToken))
  if (!enabled) return null
  const loading = qr.isLoading || authBusy
  const showCountdown = qr.qrData && !loading && !qr.initError && !qr.isExpired && !qr.isRejected

  return (
    <section aria-label="Đăng nhập bằng mã QR" aria-busy={loading} className="space-y-4 text-center">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        <span>Bảo mật không dùng mật khẩu</span>
      </div>
      <div className={cn('mx-auto flex min-h-64 w-full max-w-64 items-center justify-center rounded-2xl border-2 border-primary/20 bg-background p-4', compact && 'min-h-56 max-w-56 p-3')}>
        {renderQrContent(qr, loading, compact)}
      </div>
      {showCountdown && (
        <p role="timer" aria-live="off" aria-label="Thời gian còn lại của mã QR" className="text-xs text-muted-foreground">
          Mã QR có hiệu lực trong <strong className="font-semibold text-foreground">{formatCountdown(qr.countdown)}</strong>
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Mở FinVault trên điện thoại, quét mã và xác nhận đăng nhập.
      </p>
    </section>
  )
}
