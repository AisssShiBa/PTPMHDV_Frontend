/**
 * Contract của admin-service (N13) cho đối soát ví.
 * Shape lấy từ services/admin-service/src/services/walletReconciliationClient.ts.
 */

export type ReconciliationRunMode = 'quick' | 'full'

export type AdjustmentDirection = 'CREDIT' | 'DEBIT'

export interface ReconciliationAnomaly {
  id: string
  reportId?: number
  type: string
  walletId?: number | null
  transactionId?: string | null
  detail?: unknown
}

export interface ReconciliationReport {
  id: number
  runAt?: string
  totalWallets?: number
  anomaliesFound?: number
  systemBalanceExpected?: string
  systemBalanceActual?: string
  isBalanced: boolean
  anomalies: ReconciliationAnomaly[]
}

export interface ReconciliationReportPage {
  items: ReconciliationReport[]
  page: number
  limit: number
  total: number
}

export interface AdjustAnomalyPayload {
  direction: AdjustmentDirection
  amount: string
  reason: string
}

export interface AdjustAnomalyResult {
  anomalyId: string
  status: 'SUCCEEDED'
  referenceId: string
  transactionId: string | null
  replayed: boolean
}

/** Nhãn tiếng Việt cho 4 loại anomaly; loại lạ rơi về nhãn mặc định. */
export const ANOMALY_LABELS: Record<string, string> = {
  NEGATIVE_BALANCE: 'Số dư âm',
  BALANCE_DRIFT_QUICK: 'Lệch số dư (đối soát nhanh)',
  BALANCE_DRIFT_FULL: 'Lệch số dư (đối soát đầy đủ)',
  TRANSACTION_UNBALANCED: 'Bút toán không cân'
}

export function anomalyLabel(type: string): string {
  return ANOMALY_LABELS[type] ?? 'Loại bất thường khác'
}
