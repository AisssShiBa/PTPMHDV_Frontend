import { parseVndToBigInt, compareMoney } from '@/lib/format'
import type { WalletMe, LedgerPage } from '../types/wallet.types'

export interface DashboardStats {
  rawBalance: string
  heldBalance: string
  hasHeldBalance: boolean
  walletDisplayId: string
  tier: number
  hasDailyLimit: boolean
  dailyLimitStr: string
  dailyUsedStr: string
  remainingDaily: string
  dailyPercentUsed: number
  hasMonthlyLimit: boolean
  monthlyLimitStr: string
  monthlyUsedStr: string
  remainingMonthly: string
  monthlyPercentUsed: number
  recentTransactions: NonNullable<LedgerPage['items']>
}

export interface ComputeDashboardParams {
  wallet?: WalletMe
  user?: { id?: string; balance?: string; kycTier?: number } | null
  ledgerData?: LedgerPage
}

export function computeDashboardStats({
  wallet,
  user,
  ledgerData
}: ComputeDashboardParams): DashboardStats {
  const rawBalance = wallet?.availableBalance ?? wallet?.balance ?? user?.balance ?? '0'
  const heldBalance = wallet?.heldBalance ?? '0'
  const hasHeldBalance = compareMoney(heldBalance, '0') > 0
  const walletDisplayId = wallet?.walletId || wallet?.id || user?.id || 'FV-PRIMARY'
  const tier = wallet?.kycTier ?? user?.kycTier ?? 0

  // 1. Hạn mức ngày
  const hasDailyLimit = Boolean(wallet?.dailyLimit && wallet.dailyLimit.trim() !== '')
  const dailyLimitStr = hasDailyLimit ? wallet!.dailyLimit! : '0'
  const dailyUsedStr = hasDailyLimit ? wallet?.dailyUsed || '0' : '0'
  let remainingDaily = '0'
  let dailyPercentUsed = 0

  if (hasDailyLimit) {
    try {
      const bigDailyLimit = parseVndToBigInt(dailyLimitStr)
      const bigDailyUsed = parseVndToBigInt(dailyUsedStr)
      if (bigDailyLimit > 0n) {
        const rem = bigDailyLimit > bigDailyUsed ? bigDailyLimit - bigDailyUsed : 0n
        remainingDaily = rem.toString()
        const pct = (bigDailyUsed * 100n) / bigDailyLimit
        dailyPercentUsed = pct > 100n ? 100 : Math.min(100, Math.max(0, +pct.toString()))
      }
    } catch {
      dailyPercentUsed = 0
    }
  }

  // 2. Hạn mức tháng
  const hasMonthlyLimit = Boolean(wallet?.monthlyLimit && wallet.monthlyLimit.trim() !== '')
  const monthlyLimitStr = hasMonthlyLimit ? wallet!.monthlyLimit! : '0'
  const monthlyUsedStr = hasMonthlyLimit ? wallet?.monthlyUsed || '0' : '0'
  let remainingMonthly = '0'
  let monthlyPercentUsed = 0

  if (hasMonthlyLimit) {
    try {
      const bigMonthlyLimit = parseVndToBigInt(monthlyLimitStr)
      const bigMonthlyUsed = parseVndToBigInt(monthlyUsedStr)
      if (bigMonthlyLimit > 0n) {
        const rem = bigMonthlyLimit > bigMonthlyUsed ? bigMonthlyLimit - bigMonthlyUsed : 0n
        remainingMonthly = rem.toString()
        const pct = (bigMonthlyUsed * 100n) / bigMonthlyLimit
        monthlyPercentUsed = pct > 100n ? 100 : Math.min(100, Math.max(0, +pct.toString()))
      }
    } catch {
      monthlyPercentUsed = 0
    }
  }

  const recentTransactions = ledgerData?.items ?? []

  return {
    rawBalance,
    heldBalance,
    hasHeldBalance,
    walletDisplayId,
    tier,
    hasDailyLimit,
    dailyLimitStr,
    dailyUsedStr,
    remainingDaily,
    dailyPercentUsed,
    hasMonthlyLimit,
    monthlyLimitStr,
    monthlyUsedStr,
    remainingMonthly,
    monthlyPercentUsed,
    recentTransactions
  }
}

