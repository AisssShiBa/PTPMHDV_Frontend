import type { KycStatus } from '../types/user.types'

const statuses: Record<KycStatus, { label: string; style: string }> = {
  NONE: { label: 'Chưa xác thực', style: 'bg-muted text-muted-foreground' },
  PENDING: { label: 'Đang chờ duyệt', style: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  APPROVED: { label: 'Đã xác thực', style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  REJECTED: { label: 'Bị từ chối', style: 'bg-destructive/10 text-destructive' }
}

export function KycStatusBadge({ status = 'NONE', className = '' }: { status?: KycStatus; className?: string }) {
  const display = statuses[status] ?? { label: 'Chưa rõ trạng thái', style: 'bg-muted text-muted-foreground' }
  return <span role="status" className={'inline-flex rounded-full px-3 py-1 text-xs font-medium ' + display.style + ' ' + className}>{display.label}</span>
}
