// d:\PTPMHDV\Frontend\src\features\user\components\KycStatusBadge.tsx
import React from 'react'
import type { KycStatus } from '../types/user.types'
import { CheckCircle2, Clock, AlertCircle, ShieldAlert } from 'lucide-react'

interface Props {
  status?: KycStatus
  className?: string
}

export const KycStatusBadge: React.FC<Props> = ({ status = 'NONE', className = '' }) => {
  switch (status) {
    case 'APPROVED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 ${className}`}>
          <CheckCircle2 className="size-3.5" />
          <span>Đã xác thực KYC</span>
        </span>
      )
    case 'PENDING':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 border border-amber-500/30 ${className}`}>
          <Clock className="size-3.5" />
          <span>Đang chờ duyệt KYC</span>
        </span>
      )
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 border border-rose-500/30 ${className}`}>
          <AlertCircle className="size-3.5" />
          <span>KYC bị từ chối</span>
        </span>
      )
    case 'NONE':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border ${className}`}>
          <ShieldAlert className="size-3.5" />
          <span>Chưa xác thực KYC</span>
        </span>
      )
  }
}
