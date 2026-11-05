import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, maskPhone } from '@/lib/format'

describe('format utilities', () => {
  it('formats currency correctly in VND', () => {
    expect(formatCurrency('1000000')).toContain('1.000.000')
    expect(formatCurrency(0)).toContain('0')
    expect(formatCurrency(null)).toBe('0 ₫')
  })

  it('formats numbers with dots separator', () => {
    expect(formatNumber('500000')).toBe('500.000')
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber('')).toBe('0')
  })

  it('masks phone numbers properly', () => {
    expect(maskPhone('0987654321')).toBe('098****321')
    expect(maskPhone('0123')).toBe('0123')
  })
})
