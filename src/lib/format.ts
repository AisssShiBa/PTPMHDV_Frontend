/**
 * Định dạng tiền tệ, ngày giờ và tính toán tiền tệ (BigInt) theo tiêu chuẩn FinVault
 */
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
} from './money'

export {
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
}

/**
 * Định dạng số tiền từ string (hoặc BigInt) sang định dạng VND chuẩn (vd: "1.000.000 ₫")
 * KHÔNG dùng Number().
 */
export function formatCurrency(amount: string | number | bigint | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫'
  return formatMoneyVnd(typeof amount === 'number' ? String(Math.floor(amount)) : amount)
}

/** Alias cho formatCurrency */
export const formatVnd = formatCurrency

/**
 * Định dạng số có dấu chấm phân cách (vd: "1.000.000")
 * KHÔNG dùng Number().
 */
export function formatNumber(value: string | number | bigint | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  return formatMoneyNumber(typeof value === 'number' ? String(Math.floor(value)) : value)
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
export function toBigIntSafe(amount: string | bigint | number | null | undefined): bigint {
  if (amount === null || amount === undefined) return 0n
  if (typeof amount === 'bigint') return amount
  try {
    return parseVndToBigInt(String(amount))
  } catch {
    return 0n
  }
}
