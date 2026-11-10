/**
 * FinVault Money Utility - Quản lý tiền tệ chuẩn BigInt duy nhất trong hệ thống
 * Tuân thủ quy tắc K18:
 * - Tiền luôn là kiểu string (VND nguyên dương).
 * - Tính toán và so sánh chỉ dùng BigInt.
 * - Tuyệt đối không dùng Number, parseFloat, parseInt, toFixed trên giá trị tiền.
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
 * Kiểm tra xem một chuỗi input người dùng nhập vào có phải số tiền VND nguyên hợp lệ không:
 * - Chỉ gồm các chữ số 0-9
 * - Không chứa dấu âm, dấu chấm, dấu phẩy, chữ cái, khoảng trắng
 */
export function isValidMoneyInput(value: string): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return /^\d+$/.test(trimmed)
}

/**
 * Parse một giá trị chuỗi VND hoặc BigInt sang BigInt an toàn.
 * Ném lỗi nếu chứa số âm, số thập phân (chấm/phẩy) hoặc ký tự không hợp lệ.
 */
export function parseVndToBigInt(value: string | bigint | null | undefined): bigint {
  if (value === null || value === undefined || value === '') return 0n
  if (typeof value === 'bigint') {
    if (value < 0n) throw new Error('Số tiền không thể là số âm')
    return value
  }
  if (typeof value !== 'string') {
    throw new Error('Giá trị tiền phải là kiểu chuỗi hoặc BigInt')
  }

  const trimmed = value.trim()
  if (!trimmed) return 0n

  // Nếu chuỗi chứa dấu phân cách hàng nghìn dạng '1.000.000' hoặc '1,000,000' thì cho phép nếu là định dạng hiển thị
  // Nhưng nếu có dấu thập phân hoặc số âm thì phải từ chối
  if (trimmed.startsWith('-')) {
    throw new Error('Số tiền không thể là số âm')
  }

  // Chặn số thập phân rõ ràng (ví dụ: 100.50 hoặc 100,5)
  if (/\.\d{1,2}$/g.test(trimmed) || /,\d{1,2}$/g.test(trimmed)) {
    // Nếu có 1-2 chữ số sau dấu chấm/phẩy -> đây là số thập phân, tiền VND không có xu/hào lẻ
    throw new Error('Tiền VND không chấp nhận số thập phân')
  }

  // Chuẩn hóa loại bỏ dấu chấm/phẩy phân cách hàng nghìn nếu có
  const digitsOnly = trimmed.replace(/[.,\sđ₫VNDvnd]/g, '')
  if (!/^\d+$/.test(digitsOnly)) {
    throw new Error('Chuỗi tiền chứa ký tự không hợp lệ')
  }

  return BigInt(digitsOnly)
}

/**
 * Định dạng số tiền sang chuẩn hiển thị VND (Ví dụ: "1.250.000 ₫" hoặc "0 ₫")
 * KHÔNG sử dụng Number(), định dạng trực tiếp từ BigInt qua Intl.NumberFormat.
 */
export function formatMoneyVnd(amount: string | bigint | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫'
  try {
    const bigVal = parseVndToBigInt(amount)
    return currencyFormatter.format(bigVal)
  } catch {
    return '0 ₫'
  }
}

/**
 * Định dạng số có dấu chấm phân cách hàng nghìn (Ví dụ: "1.250.000")
 * KHÔNG sử dụng Number(), định dạng trực tiếp từ BigInt.
 */
export function formatMoneyNumber(value: string | bigint | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  try {
    const bigVal = parseVndToBigInt(value)
    return numberFormatter.format(bigVal)
  } catch {
    return '0'
  }
}

/**
 * So sánh 2 số tiền:
 * -1 nếu a < b
 *  0 nếu a == b
 *  1 nếu a > b
 */
export function compareMoney(a: string | bigint | null | undefined, b: string | bigint | null | undefined): number {
  const bigA = parseVndToBigInt(a)
  const bigB = parseVndToBigInt(b)
  if (bigA < bigB) return -1
  if (bigA > bigB) return 1
  return 0
}

/**
 * Kiểm tra a > b
 */
export function isGreaterThan(a: string | bigint, b: string | bigint): boolean {
  return compareMoney(a, b) > 0
}

/**
 * Kiểm tra a >= b
 */
export function isGreaterThanOrEqual(a: string | bigint, b: string | bigint): boolean {
  return compareMoney(a, b) >= 0
}

/**
 * Cộng hai số tiền bằng BigInt và trả về chuỗi
 */
export function addMoney(a: string | bigint, b: string | bigint): string {
  return (parseVndToBigInt(a) + parseVndToBigInt(b)).toString()
}

/**
 * Trừ hai số tiền bằng BigInt (a - b) và trả về chuỗi.
 * Ném lỗi nếu a < b (không cho phép số dư âm).
 */
export function subtractMoney(a: string | bigint, b: string | bigint): string {
  const bigA = parseVndToBigInt(a)
  const bigB = parseVndToBigInt(b)
  if (bigA < bigB) {
    throw new Error('Kết quả trừ tiền không thể âm')
  }
  return (bigA - bigB).toString()
}

/**
 * Kiểm tra số tiền chuyển hợp lệ theo quy định nghiệp vụ:
 * - Phải là số nguyên dương > 0
 * - Tối thiểu (mặc định 1.000 đ)
 * - Tối đa theo hạn mức (nếu có truyền vào)
 */
export function validateTransferAmount(
  amount: string,
  availableBalance?: string | bigint,
  maxLimit?: string | bigint,
  minAmount: bigint = 1000n
): { valid: boolean; error?: string } {
  if (!isValidMoneyInput(amount)) {
    return { valid: false, error: 'Số tiền nhập vào không hợp lệ' }
  }

  let bigAmount: bigint
  try {
    bigAmount = parseVndToBigInt(amount)
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : 'Số tiền không hợp lệ' }
  }

  if (bigAmount < minAmount) {
    return {
      valid: false,
      error: `Số tiền chuyển tối thiểu là ${formatMoneyVnd(minAmount)}`
    }
  }

  if (availableBalance !== undefined) {
    const bigBalance = parseVndToBigInt(availableBalance)
    if (bigAmount > bigBalance) {
      return {
        valid: false,
        error: 'Số dư khả dụng trong ví không đủ để thực hiện giao dịch'
      }
    }
  }

  if (maxLimit !== undefined) {
    const bigLimit = parseVndToBigInt(maxLimit)
    if (bigAmount > bigLimit) {
      return {
        valid: false,
        error: `Số tiền vượt quá hạn mức cho phép (${formatMoneyVnd(bigLimit)})`
      }
    }
  }

  return { valid: true }
}

