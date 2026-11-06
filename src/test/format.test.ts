import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatVnd,
  formatNumber,
  formatDateTime,
  maskPhone,
  toBigIntSafe,
  addMoney,
  subtractMoney,
  compareMoney,
  isGreaterThan
} from '@/lib/format'

describe('lib/format.ts', () => {
  it('định dạng tiền tệ chuẩn VND', () => {
    expect(formatCurrency('1000000')).toContain('1.000.000')
    expect(formatVnd('0')).toContain('0')
    expect(formatVnd(null)).toContain('0')
    expect(formatVnd(undefined)).toContain('0')
  })

  it('định dạng số có dấu chấm phân cách', () => {
    expect(formatNumber('1250000')).toBe('1.250.000')
    expect(formatNumber(0)).toBe('0')
  })

  it('che số điện thoại maskPhone', () => {
    expect(maskPhone('0912345678')).toBe('091****678')
    expect(maskPhone('123')).toBe('123')
    expect(maskPhone(null)).toBe('')
  })

  it('định dạng ngày giờ formatDateTime theo múi giờ Việt Nam', () => {
    const date = new Date('2026-11-05T12:00:00Z')
    const formatted = formatDateTime(date)
    expect(formatted).toBeTruthy()
    expect(formatDateTime(null)).toBe('')
  })

  describe('Tính toán tiền tệ bằng BigInt (không sai số dấu phẩy động)', () => {
    it('toBigIntSafe chuyển đổi chuỗi an toàn', () => {
      expect(toBigIntSafe('1.000.000')).toBe(1000000n)
      expect(toBigIntSafe(' 500000 ')).toBe(500000n)
      expect(toBigIntSafe(null)).toBe(0n)
      expect(toBigIntSafe('invalid')).toBe(0n)
    })

    it('addMoney cộng hai chuỗi tiền chính xác', () => {
      expect(addMoney('1000000', '500000')).toBe('1500000')
      expect(addMoney('999999999999999999', '1')).toBe('1000000000000000000')
    })

    it('subtractMoney trừ hai chuỗi tiền chính xác', () => {
      expect(subtractMoney('1000000', '200000')).toBe('800000')
    })

    it('compareMoney và isGreaterThan so sánh tiền chính xác', () => {
      expect(compareMoney('500000', '1000000')).toBe(-1)
      expect(compareMoney('1000000', '1000000')).toBe(0)
      expect(compareMoney('2000000', '1000000')).toBe(1)

      expect(isGreaterThan('2000000', '1000000')).toBe(true)
      expect(isGreaterThan('500000', '1000000')).toBe(false)
    })
  })
})
