import { describe, it, expect } from 'vitest'
import {
  parseVndToBigInt,
  formatMoneyVnd,
  formatMoneyNumber,
  compareMoney,
  addMoney,
  subtractMoney,
  isGreaterThan,
  isGreaterThanOrEqual,
  isValidMoneyInput,
  validateTransferAmount
} from '@/lib/money'
import fs from 'node:fs'
import path from 'node:path'

describe('src/lib/money.ts - FinVault Money Utility Specification', () => {
  describe('parseVndToBigInt', () => {
    it('parse số 0 và giá trị rỗng thành 0n', () => {
      expect(parseVndToBigInt('0')).toBe(0n)
      expect(parseVndToBigInt('')).toBe(0n)
      expect(parseVndToBigInt(null)).toBe(0n)
      expect(parseVndToBigInt(undefined)).toBe(0n)
      expect(parseVndToBigInt(0n)).toBe(0n)
    })

    it('parse số tiền bình thường và dấu phân cách hàng nghìn', () => {
      expect(parseVndToBigInt('100000')).toBe(100000n)
      expect(parseVndToBigInt('1.250.000')).toBe(1250000n)
      expect(parseVndToBigInt('1,250,000 đ')).toBe(1250000n)
      expect(parseVndToBigInt('  500000  ')).toBe(500000n)
    })

    it('parse số tiền lớn vượt quá 2^53 (Number.MAX_SAFE_INTEGER) mà không mất độ chính xác', () => {
      // 2^53 - 1 = 9007199254740991
      const hugeAmountStr = '9007199254740993' // Lớn hơn MAX_SAFE_INTEGER
      const result = parseVndToBigInt(hugeAmountStr)
      expect(result).toBe(9007199254740993n)
      expect(result.toString()).toBe(hugeAmountStr)

      const evenLarger = '123456789012345678901234567890'
      expect(parseVndToBigInt(evenLarger).toString()).toBe(evenLarger)
    })

    it('từ chối số âm và ném lỗi', () => {
      expect(() => parseVndToBigInt('-1000')).toThrow(/âm/)
      expect(() => parseVndToBigInt(-50n)).toThrow(/âm/)
    })

    it('từ chối số thập phân (tiền VND không có xu/hào)', () => {
      expect(() => parseVndToBigInt('100.50')).toThrow(/thập phân/)
      expect(() => parseVndToBigInt('100,5')).toThrow(/thập phân/)
    })

    it('từ chối đầu vào rác hoặc chứa chữ cái không hợp lệ', () => {
      expect(() => parseVndToBigInt('abc')).toThrow(/không hợp lệ/)
      expect(() => parseVndToBigInt('1000xyz')).toThrow(/không hợp lệ/)
    })
  })

  describe('formatMoneyVnd & formatMoneyNumber', () => {
    it('định dạng chuẩn VND kèm ký hiệu tiền tệ', () => {
      expect(formatMoneyVnd('1000000')).toContain('1.000.000')
      expect(formatMoneyVnd(1000000n)).toContain('1.000.000')
      expect(formatMoneyVnd('0')).toContain('0')
      expect(formatMoneyVnd(null)).toContain('0')
    })

    it('định dạng số tiền lớn vượt 2^53 chính xác tuyệt đối không qua Number', () => {
      const huge = 9007199254740993n
      const formatted = formatMoneyNumber(huge)
      expect(formatted).toBe('9.007.199.254.740.993')
    })
  })

  describe('Phép toán & So sánh BigInt', () => {
    it('so sánh tiền chính xác', () => {
      expect(compareMoney('100000', '200000')).toBe(-1)
      expect(compareMoney('200000', '100000')).toBe(1)
      expect(compareMoney('100000', '100000')).toBe(0)
      expect(isGreaterThan('500000', '200000')).toBe(true)
      expect(isGreaterThanOrEqual('200000', '200000')).toBe(true)
    })

    it('cộng và trừ bằng BigInt', () => {
      expect(addMoney('100000', '250000')).toBe('350000')
      expect(subtractMoney('500000', '200000')).toBe('300000')
      expect(() => subtractMoney('100000', '200000')).toThrow(/không thể âm/)
    })
  })

  describe('isValidMoneyInput & validateTransferAmount', () => {
    it('chỉ chấp nhận chuỗi số nguyên hợp lệ', () => {
      expect(isValidMoneyInput('50000')).toBe(true)
      expect(isValidMoneyInput('0')).toBe(true)
      expect(isValidMoneyInput('-50000')).toBe(false)
      expect(isValidMoneyInput('50.000')).toBe(false)
      expect(isValidMoneyInput('50,000')).toBe(false)
      expect(isValidMoneyInput('50000a')).toBe(false)
      expect(isValidMoneyInput('')).toBe(false)
    })

    it('validate số tiền chuyển theo số dư và hạn mức', () => {
      // Dưới mức tối thiểu 1000đ
      expect(validateTransferAmount('500', '1000000').valid).toBe(false)
      // Vượt số dư
      expect(validateTransferAmount('1500000', '1000000').valid).toBe(false)
      // Vượt hạn mức
      expect(validateTransferAmount('600000', '1000000', '500000').valid).toBe(false)
      // Hợp lệ
      expect(validateTransferAmount('200000', '1000000', '500000').valid).toBe(true)
    })
  })

  describe('Kiểm tra tĩnh (Static Guard) - Không dùng Number/parseFloat/parseInt trên trường tiền trong K18', () => {
    it('quét các file K18 để đảm bảo không vi phạm dùng Number cho tiền', () => {
      const k18Files = [
        path.resolve(__dirname, '../lib/money.ts'),
        path.resolve(__dirname, '../lib/format.ts')
      ]

      const forbiddenRegex = /(?:parseFloat|parseInt|\bNumber)\s*\(\s*(?:amount|balance|fee|availableBalance|heldBalance|limit|remaining|used)/i

      for (const file of k18Files) {
        if (!fs.existsSync(file)) continue
        const content = fs.readFileSync(file, 'utf8')
        const lines = content.split('\n')
        lines.forEach((line, index) => {
          // Bỏ qua comment
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
          const match = forbiddenRegex.exec(line)
          if (match) {
            throw new Error(`Phát hiện dùng Number/parseFloat trên tiền tại ${file}:${index + 1} -> "${line.trim()}"`)
          }
        })
      }
    })
  })
})
