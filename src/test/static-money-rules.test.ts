import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Quy tắc quét tĩnh: chặn route ví cũ và Number cho tiền trong phạm vi K18 [K18-5]', () => {
  const K18_SOURCE_FILES = [
    'src/pages/DashboardPage.tsx',
    'src/features/wallet/api/wallet.api.ts',
    'src/features/wallet/api/wallet.queries.ts',
    'src/features/wallet/services/walletService.ts',
    'src/features/wallet/components/RealBalanceCard.tsx',
    'src/features/wallet/components/TopupModal.tsx',
  ]

  it('không chứa bất kỳ lời gọi nào tới route cũ /wallets/:userId/(transfer|credit|debit|history|balance)', () => {
    K18_SOURCE_FILES.forEach((file) => {
      const fullPath = path.resolve(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/transfer/)
        expect(content).not.toMatch(/\/wallets\/[a-zA-Z0-9_-]+\/transfer/)
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/credit/)
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/debit/)
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/history/)
        expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}\/balance/)
      }
    })
  })

  it('cấm tuyệt đối parseFloat và toFixed trên các file K18', () => {
    K18_SOURCE_FILES.forEach((file) => {
      const fullPath = path.resolve(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        expect(content).not.toMatch(/\bparseFloat\(/)
        expect(content).not.toMatch(/\.toFixed\(/)
      }
    })
  })

  it('cấm gọi Number() trên các biến tiền tệ amount, balance, availableBalance, heldBalance, dailyLimit, dailyUsed', () => {
    K18_SOURCE_FILES.forEach((file) => {
      const fullPath = path.resolve(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        expect(content).not.toMatch(/\bNumber\(\s*[^)]*(?:amount|balance|heldBalance|fee|limit|used)[^)]*\)/i)
      }
    })
  })

  it('DashboardPage chỉ sử dụng tiện ích formatVnd và BigInt từ lib/format hoặc lib/money', () => {
    const dashboardPath = path.resolve(process.cwd(), 'src/pages/DashboardPage.tsx')
    const content = fs.readFileSync(dashboardPath, 'utf-8')
    expect(content).toContain('formatVnd')
    expect(content).toContain('parseVndToBigInt')
    expect(content).toContain('useWalletMe')
    expect(content).toContain('useWalletLedger')
    expect(content).not.toMatch(/\/wallets\/\$\{[^}]+\}/)
    expect(content).not.toMatch(/\/wallets\/[a-zA-Z0-9_-]+\/(?:credit|debit|transfer|balance|history)/)
  })

  it('walletService đã xóa hoàn toàn các phương thức ví cũ', () => {
    const walletServicePath = path.resolve(process.cwd(), 'src/features/wallet/services/walletService.ts')
    const content = fs.readFileSync(walletServicePath, 'utf-8')
    expect(content).not.toMatch(/\bcredit\s*\(/)
    expect(content).not.toMatch(/\bdebit\s*\(/)
    expect(content).not.toMatch(/\btransfer\s*\(/)
    expect(content).not.toMatch(/\bbalance\s*\(/)
    expect(content).not.toMatch(/\bhistory\s*\(/)
  })
})
