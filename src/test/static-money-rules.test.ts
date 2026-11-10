import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Quy tắc cấm Number cho tiền và gỡ bỏ route cũ [K18-7]', () => {
  const K18_SOURCE_FILES = [
    'src/pages/TransferPage.tsx',
    'src/pages/DashboardPage.tsx',
    'src/pages/TransactionsPage.tsx',
    'src/features/wallet/api/wallet.api.ts',
    'src/features/wallet/api/wallet.queries.ts',
    'src/features/wallet/services/walletService.ts',
    'src/features/wallet/components/RealBalanceCard.tsx',
    'src/features/wallet/components/TopupModal.tsx',
    'src/features/payment/api/payment.api.ts'
  ]

  it('không chứa bất kỳ lời gọi nào tới route cũ /wallets/:userId/transfer hoặc route ví bị chặn', () => {
    K18_SOURCE_FILES.forEach((file) => {
      const fullPath = path.resolve(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/transfer/)
        expect(content).not.toMatch(/\/wallets\/[a-zA-Z0-9_-]+\/transfer/)
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/credit/)
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/debit/)
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/history/)
      }
    })
  })

  it('cấm tuyệt đối parseFloat và toFixed trên trường tiền tệ', () => {
    K18_SOURCE_FILES.forEach((file) => {
      const fullPath = path.resolve(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        expect(content).not.toMatch(/\bparseFloat\(/)
        expect(content).not.toMatch(/\.toFixed\(/)
      }
    })
  })

  it('cấm gọi Number() trên các biến tiền tệ amount, balance, availableBalance, heldBalance', () => {
    K18_SOURCE_FILES.forEach((file) => {
      const fullPath = path.resolve(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        expect(content).not.toMatch(/\bNumber\(\s*[^)]*(?:amount|balance|heldBalance|fee|limit|used)[^)]*\)/i)
      }
    })
  })

  it('chỉ sử dụng tiện ích formatVnd và validate tiền từ lib/format', () => {
    const transferPage = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/TransferPage.tsx'), 'utf-8')
    expect(transferPage).toContain('formatVnd')
    expect(transferPage).toContain('validateTransferAmount')
    expect(transferPage).toContain('isValidMoneyInput')
  })
})
