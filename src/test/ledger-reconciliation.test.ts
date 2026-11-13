import { describe, it, expect } from 'vitest'
import { toBigIntSafe } from '@/lib/money'
import { formatVnd } from '@/lib/format'
import type { LedgerItem } from '@/features/wallet/types/wallet.types'

/**
 * Hàm kiểm tra tính toán toàn vẹn đối soát số dư của sổ cái (Reconciliation Invariant)
 * Quy tắc:
 * 1. Số dư sau của bút toán mới nhất (items[0].balanceAfter) PHẢI bằng số dư hiện tại của ví (currentBalance).
 * 2. Với mọi cặp bút toán liên tiếp (i, i+1) theo thứ tự thời gian giảm dần (mới -> cũ):
 *    - Nếu items[i] là CREDIT: balanceAfter[i] = balanceAfter[i+1] + amount[i]
 *    - Nếu items[i] là DEBIT:  balanceAfter[i] = balanceAfter[i+1] - amount[i]
 * 3. Tuyệt đối không dùng Number(), chỉ dùng BigInt an toàn.
 */
function verifyLedgerReconciliation(
  currentBalance: string,
  items: LedgerItem[]
): {
  isBalanced: boolean
  totalCredits: bigint
  totalDebits: bigint
  mismatches: string[]
} {
  const currentBalBig = toBigIntSafe(currentBalance)
  let totalCredits = 0n
  let totalDebits = 0n
  const mismatches: string[] = []

  if (items.length === 0) {
    return {
      isBalanced: true,
      totalCredits: 0n,
      totalDebits: 0n,
      mismatches: []
    }
  }

  // 1. Kiểm tra số dư hiện tại khớp với balanceAfter của bút toán mới nhất
  const latestBalBig = toBigIntSafe(items[0].balanceAfter)
  if (latestBalBig !== currentBalBig) {
    mismatches.push(
      `Bút toán mới nhất (id=${items[0].id}) có balanceAfter=${items[0].balanceAfter} lệch với currentBalance=${currentBalance}`
    )
  }

  // 2. Kiểm tra chuỗi phương trình biến động số dư qua từng bước
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const amountBig = toBigIntSafe(item.amount)

    if (item.direction === 'CREDIT') {
      totalCredits += amountBig
    } else {
      totalDebits += amountBig
    }

    if (i < items.length - 1) {
      const prevItem = items[i + 1]
      const currBalAfter = toBigIntSafe(item.balanceAfter)
      const prevBalAfter = toBigIntSafe(prevItem.balanceAfter)

      let expectedBalAfter: bigint
      if (item.direction === 'CREDIT') {
        expectedBalAfter = prevBalAfter + amountBig
      } else {
        expectedBalAfter = prevBalAfter - amountBig
      }

      if (currBalAfter !== expectedBalAfter) {
        mismatches.push(
          `Lệch số dư tại bút toán ${item.id} (${item.direction} ${item.amount}): thực tế=${item.balanceAfter}, kỳ vọng=${expectedBalAfter.toString()}`
        )
      }
    }
  }

  return {
    isBalanced: mismatches.length === 0,
    totalCredits,
    totalDebits,
    mismatches
  }
}

describe('Kiểm thử đối soát số dư Ledger với tài khoản Seed [K22-3]', () => {
  // Dữ liệu hạt giống (Seed Accounts)
  const SEED_AN = {
    email: 'an@demo.vn',
    tier: 2,
    initialBalance: '1250000'
  }
  const SEED_BINH = {
    email: 'binh@demo.vn',
    tier: 1,
    initialBalance: '300000'
  }
  const SEED_CHI = {
    email: 'chi@demo.vn',
    tier: 0,
    initialBalance: '100000'
  }

  it('tài khoản hạt giống An (Cấp 2, khởi tạo 1.250.000đ): đối soát đúng sau chuỗi giao dịch P2P và thanh toán', () => {
    // Giả lập lịch sử tài khoản An:
    // 0. Khởi tạo: 1.250.000đ
    // 1. Chuyển cho Bình: -60.000đ -> còn 1.190.000đ
    // 2. Chuyển cho Chi: -40.000đ -> còn 1.150.000đ
    // 3. Nhận hoàn tiền: +10.000đ -> thành 1.160.000đ
    const currentBalance = '1160000'
    const ledgerAn: LedgerItem[] = [
      {
        id: 'an_tx_03',
        walletId: 'wallet_an',
        direction: 'CREDIT',
        amount: '10000',
        balanceAfter: '1160000',
        transferType: 'TOPUP',
        note: 'Hoàn tiền giao dịch',
        createdAt: '2026-11-10T15:00:00Z'
      },
      {
        id: 'an_tx_02',
        walletId: 'wallet_an',
        direction: 'DEBIT',
        amount: '40000',
        balanceAfter: '1150000',
        transferType: 'TRANSFER',
        note: 'Chuyển tiền cho Chi',
        createdAt: '2026-11-10T14:30:00Z'
      },
      {
        id: 'an_tx_01',
        walletId: 'wallet_an',
        direction: 'DEBIT',
        amount: '60000',
        balanceAfter: '1190000',
        transferType: 'TRANSFER',
        note: 'Chuyển tiền cho Bình',
        createdAt: '2026-11-10T14:00:00Z'
      },
      {
        id: 'an_tx_00_seed',
        walletId: 'wallet_an',
        direction: 'CREDIT',
        amount: SEED_AN.initialBalance,
        balanceAfter: SEED_AN.initialBalance,
        transferType: 'TOPUP',
        note: 'Số dư ban đầu seed hệ thống',
        createdAt: '2026-11-01T00:00:00Z'
      }
    ]

    const result = verifyLedgerReconciliation(currentBalance, ledgerAn)
    expect(result.isBalanced).toBe(true)
    expect(result.mismatches).toHaveLength(0)
    expect(result.totalDebits).toBe(100000n) // 60.000 + 40.000
    expect(result.totalCredits).toBe(1260000n) // 1.250.000 + 10.000
  })

  it('tài khoản hạt giống Bình (Cấp 1, khởi tạo 300.000đ): nhận 60.000đ từ An, đối soát số dư tăng chuẩn xác ở cả 2 đầu', () => {
    // Giả lập lịch sử tài khoản Bình:
    // 0. Khởi tạo: 300.000đ
    // 1. Nhận từ An: +60.000đ -> thành 360.000đ
    // 2. Nạp thêm tiền VNPAY: +100.000đ -> thành 460.000đ
    const currentBalance = '460000'
    const ledgerBinh: LedgerItem[] = [
      {
        id: 'binh_tx_02',
        walletId: 'wallet_binh',
        direction: 'CREDIT',
        amount: '100000',
        balanceAfter: '460000',
        transferType: 'TOPUP',
        note: 'Nạp tiền VNPAY',
        createdAt: '2026-11-10T15:30:00Z'
      },
      {
        id: 'binh_tx_01',
        walletId: 'wallet_binh',
        direction: 'CREDIT',
        amount: '60000',
        balanceAfter: '360000',
        transferType: 'TRANSFER',
        counterpartyMasked: 'An Nguyễn',
        note: 'Nhận từ An',
        createdAt: '2026-11-10T14:00:00Z'
      },
      {
        id: 'binh_tx_00_seed',
        walletId: 'wallet_binh',
        direction: 'CREDIT',
        amount: SEED_BINH.initialBalance,
        balanceAfter: SEED_BINH.initialBalance,
        transferType: 'TOPUP',
        note: 'Số dư ban đầu seed',
        createdAt: '2026-11-01T00:00:00Z'
      }
    ]

    const result = verifyLedgerReconciliation(currentBalance, ledgerBinh)
    expect(result.isBalanced).toBe(true)
    expect(result.mismatches).toHaveLength(0)
    expect(result.totalCredits).toBe(460000n)
    expect(result.totalDebits).toBe(0n)
  })

  it('tài khoản hạt giống Chi (Cấp 0, khởi tạo 100.000đ): nhận tiền và chi trả đúng Invariant', () => {
    // Giả lập lịch sử tài khoản Chi:
    // 0. Khởi tạo: 100.000đ
    // 1. Nhận từ An: +40.000đ -> 140.000đ
    // 2. Thanh toán hóa đơn: -50.000đ -> 90.000đ
    const currentBalance = '90000'
    const ledgerChi: LedgerItem[] = [
      {
        id: 'chi_tx_02',
        walletId: 'wallet_chi',
        direction: 'DEBIT',
        amount: '50000',
        balanceAfter: '90000',
        transferType: 'PAYMENT',
        note: 'Thanh toán tiền điện',
        createdAt: '2026-11-10T16:00:00Z'
      },
      {
        id: 'chi_tx_01',
        walletId: 'wallet_chi',
        direction: 'CREDIT',
        amount: '40000',
        balanceAfter: '140000',
        transferType: 'TRANSFER',
        note: 'Nhận tiền từ An',
        createdAt: '2026-11-10T14:30:00Z'
      },
      {
        id: 'chi_tx_00_seed',
        walletId: 'wallet_chi',
        direction: 'CREDIT',
        amount: SEED_CHI.initialBalance,
        balanceAfter: SEED_CHI.initialBalance,
        transferType: 'TOPUP',
        note: 'Số dư ban đầu seed',
        createdAt: '2026-11-01T00:00:00Z'
      }
    ]

    const result = verifyLedgerReconciliation(currentBalance, ledgerChi)
    expect(result.isBalanced).toBe(true)
    expect(result.mismatches).toHaveLength(0)
  })

  it('phát hiện chính xác bất thường lệch số dư (BALANCE_DRIFT) khi số dư bị sửa đổi sai', () => {
    const corruptedLedger: LedgerItem[] = [
      {
        id: 'drift_tx_02',
        walletId: 'wallet_an',
        direction: 'DEBIT',
        amount: '60000',
        balanceAfter: '1200000', // Sai: 1.250.000 - 60.000 phải là 1.190.000, không phải 1.200.000
        transferType: 'TRANSFER',
        createdAt: '2026-11-10T14:00:00Z'
      },
      {
        id: 'drift_tx_01',
        walletId: 'wallet_an',
        direction: 'CREDIT',
        amount: '1250000',
        balanceAfter: '1250000',
        transferType: 'TOPUP',
        createdAt: '2026-11-01T00:00:00Z'
      }
    ]

    const result = verifyLedgerReconciliation('1200000', corruptedLedger)
    expect(result.isBalanced).toBe(false)
    expect(result.mismatches.length).toBeGreaterThan(0)
    expect(result.mismatches[0]).toContain('Lệch số dư tại bút toán drift_tx_02')
  })

  it('xử lý an toàn chuỗi số từ Postgres Decimal(20,2) có đuôi .00 mà không dùng Number()', () => {
    // Postgres trả về DECIMAL(20,2) ví dụ "1250000.00", "60000.00"
    const currentBalance = '1190000.00'
    const ledgerSqlDecimal: LedgerItem[] = [
      {
        id: 'sql_tx_02',
        walletId: 'wallet_sql',
        direction: 'DEBIT',
        amount: '60000.00',
        balanceAfter: '1190000.00',
        transferType: 'TRANSFER',
        createdAt: '2026-11-10T14:00:00Z'
      },
      {
        id: 'sql_tx_01',
        walletId: 'wallet_sql',
        direction: 'CREDIT',
        amount: '1250000.00',
        balanceAfter: '1250000.00',
        transferType: 'TOPUP',
        createdAt: '2026-11-01T00:00:00Z'
      }
    ]

    const result = verifyLedgerReconciliation(currentBalance, ledgerSqlDecimal)
    expect(result.isBalanced).toBe(true)
    expect(result.mismatches).toHaveLength(0)
    expect(formatVnd(result.totalDebits.toString())).toMatch(/60\.000[\s\u00A0]*₫/)
  })

  it('đối soát liên tục qua ranh giới phân trang cursor giữa Trang 1 và Trang 2', () => {
    // Trang 1 (mới hơn)
    const page1: LedgerItem[] = [
      {
        id: 'page1_tx_02',
        walletId: 'w_paged',
        direction: 'CREDIT',
        amount: '50000',
        balanceAfter: '350000',
        transferType: 'TOPUP',
        createdAt: '2026-11-10T12:00:00Z'
      },
      {
        id: 'page1_tx_01',
        walletId: 'w_paged',
        direction: 'DEBIT',
        amount: '100000',
        balanceAfter: '300000',
        transferType: 'TRANSFER',
        createdAt: '2026-11-10T11:00:00Z'
      }
    ]

    // Trang 2 (cũ hơn, tiếp nối cursor)
    const page2: LedgerItem[] = [
      {
        id: 'page2_tx_02',
        walletId: 'w_paged',
        direction: 'CREDIT',
        amount: '200000',
        balanceAfter: '400000', // 400.000 - 100.000 (từ page1_tx_01) = 300.000 -> Khớp!
        transferType: 'TOPUP',
        createdAt: '2026-11-10T10:00:00Z'
      },
      {
        id: 'page2_tx_01',
        walletId: 'w_paged',
        direction: 'CREDIT',
        amount: '200000',
        balanceAfter: '200000',
        transferType: 'TOPUP',
        createdAt: '2026-11-09T09:00:00Z'
      }
    ]

    // Ghép 2 trang lại
    const fullLedger = [...page1, ...page2]
    const result = verifyLedgerReconciliation('350000', fullLedger)

    expect(result.isBalanced).toBe(true)
    expect(result.mismatches).toHaveLength(0)
    expect(result.totalCredits).toBe(450000n)
    expect(result.totalDebits).toBe(100000n)
  })
})
