// d:\PTPMHDV\Frontend\src\features\wallet\types\wallet.types.ts

export interface WalletBalance {
  id: string
  userId: string
  ownerType: 'USER' | 'MERCHANT' | 'SYSTEM'
  balance: string
  heldBalance: string
  availableBalance: string
  currency?: string
  status?: 'ACTIVE' | 'LOCKED'
  createdAt?: string
  updatedAt?: string
}

export interface WalletMe {
  id?: string
  walletId?: string
  userId: string
  balance: string
  availableBalance: string
  heldBalance: string
  status?: string
  dailyLimit?: string
  dailyUsed?: string
  monthlyLimit?: string
  monthlyUsed?: string
  kycTier?: number
}

export interface LedgerItem {
  id: string
  transactionId?: string
  direction: 'CREDIT' | 'DEBIT' | 'IN' | 'OUT'
  amount: string
  balanceAfter: string
  referenceId?: string
  transferType?: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'P2P_TRANSFER' | 'ADJUSTMENT' | string
  counterpartyWalletId?: string
  counterpartyUserId?: string
  counterpartyName?: string
  counterpartyMasked?: string
  description?: string
  note?: string
  createdAt: string
}

export interface LedgerPage {
  items: LedgerItem[]
  nextCursor: string | null
}

export interface WalletHistoryItem {
  id: string
  walletId: string
  amount: string
  direction: 'CREDIT' | 'DEBIT'
  transferType: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'P2P_TRANSFER' | 'ADJUSTMENT'
  referenceId: string
  createdAt: string
}

export interface WalletTransferResult {
  transactionId: string
  replayed: boolean
  fromBalance: string
  toBalance: string
}
