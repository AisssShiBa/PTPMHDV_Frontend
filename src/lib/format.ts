/**
 * Định dạng tiền tệ, ngày giờ và tính toán tiền tệ (BigInt) theo tiêu chuẩn FinVault
 */

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
})

const numberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0
})

/**
 * Định dạng số tiền từ string (hoặc number) sang định dạng VND chuẩn (vd: "1.000.000 ₫")
 */
export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫'
  const numericValue = typeof amount === 'number' ? amount : Number(amount)
  if (isNaN(numericValue)) return '0 ₫'
  return currencyFormatter.format(numericValue)
}

/** Alias cho formatCurrency */
export const formatVnd = formatCurrency

/**
 * Định dạng số có dấu chấm phân cách (vd: "1.000.000")
 */
export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (isNaN(numericValue)) return '0'
  return numberFormatter.format(numericValue)
}

/**
 * Định dạng thời gian hiển thị theo giờ Việt Nam (UTC+7)
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date)
}

/**
 * Che số điện thoại bảo mật (vd: 098****123)
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(-3)
}

/**
 * Chuyển đổi chuỗi tiền thành BigInt an toàn, loại bỏ ký tự không phải số
 */
export function toBigIntSafe(amount: string | null | undefined): bigint {
  if (!amount) return 0n
  const cleaned = amount.trim().replace(/[^0-9-]/g, '')
  if (!cleaned || cleaned === '-') return 0n
  try {
    return BigInt(cleaned)
  } catch {
    return 0n
  }
}

/**
 * Cộng hai chuỗi tiền tệ bằng BigInt
 */
export function addMoney(a: string, b: string): string {
  return (toBigIntSafe(a) + toBigIntSafe(b)).toString()
}

/**
 * Trừ hai chuỗi tiền tệ bằng BigInt (a - b)
 */
export function subtractMoney(a: string, b: string): string {
  return (toBigIntSafe(a) - toBigIntSafe(b)).toString()
}

/**
 * So sánh hai chuỗi tiền: -1 nếu a < b, 0 nếu a == b, 1 nếu a > b
 */
export function compareMoney(a: string, b: string): number {
  const bigA = toBigIntSafe(a)
  const bigB = toBigIntSafe(b)
  if (bigA < bigB) return -1
  if (bigA > bigB) return 1
  return 0
}

/**
 * Kiểm tra a > b
 */
export function isGreaterThan(a: string, b: string): boolean {
  return compareMoney(a, b) > 0
}

// Strict money helpers for Funding; legacy display helpers stay compatible.
export { isValidMoneyInput, parseVndToBigInt, normalizeVnd, formatVndExact } from './money'
