export class MerchantError extends Error {
  readonly code: string
  constructor(code: string) {
    super('Chưa thể xác nhận thông tin đối tác. Vui lòng tải lại trạng thái.')
    this.name = 'MerchantError'
    this.code = code
  }
}
