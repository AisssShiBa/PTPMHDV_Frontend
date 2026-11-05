/**
 * Định dạng tiền tệ và dữ liệu hiển thị theo tiêu chuẩn FinVault
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
 * Định dạng số tiền từ string (hoặc number hiển thị) sang định dạng VND chuẩn (vd: "1.000.000 ₫")
 */
export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫'
  const numericValue = typeof amount === 'number' ? amount : Number(amount)
  if (isNaN(numericValue)) return '0 ₫'
  return currencyFormatter.format(numericValue)
}

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
 * Định dạng thời gian hiển thị theo giờ Việt Nam
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
    year: 'numeric'
  }).format(date)
}

/**
 * Che số điện thoại bảo mật (vd: 098****123)
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(-3)
}
