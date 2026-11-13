/** Strict whole-VND input. Formatting separators are deliberately rejected. */
export function isValidMoneyInput(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d{0,17})$/.test(value)
}
export function parseVndToBigInt(value: string): bigint {
  if (!isValidMoneyInput(value)) throw new Error('Số tiền không hợp lệ.')
  return BigInt(value)
}
export function normalizeVnd(value: string): string {
  if (!/^(0|[1-9]\d{0,17})(\.0+)?$/.test(value))
    throw new Error('Số tiền phản hồi không hợp lệ.')
  return BigInt(value.split('.')[0]).toString()
}
export function formatVndExact(value: string): string {
  return new Intl.NumberFormat('vi-VN').format(BigInt(normalizeVnd(value)))
}
