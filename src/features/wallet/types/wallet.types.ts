// d:\PTPMHDV\Frontend\src\features\wallet\types\wallet.types.ts

export interface WalletBalance {
  id: string
  userId: string
  ownerType: 'USER' | 'MERCHANT' | 'SYSTEM'
  balance: string
  heldBalance: string
  availableBalance: string
  currency: string
  status: 'ACTIVE' | 'LOCKED'
  createdAt: string
  updatedAt: string
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
