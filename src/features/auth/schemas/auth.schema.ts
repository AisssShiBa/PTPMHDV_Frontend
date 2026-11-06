import { z } from 'zod'

/**
 * Regex kiểm tra mã PIN chuẩn ngân hàng/Fintech: Đúng 6 ký tự số từ 0-9
 */
export const PIN_REGEX = /^\d{6}$/

/**
 * 1. Login Schema
 * Áp dụng cho màn hình Đăng nhập (SignInPage)
 * Hỗ trợ người dùng nhập email hoặc tên đăng nhập
 */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email hoặc tên đăng nhập')
    .max(100, 'Tài khoản không được vượt quá 100 ký tự'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .max(128, 'Mật khẩu không được vượt quá 128 ký tự'),
  remember: z.boolean().optional().default(false)
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * 2. Register Schema
 * Áp dụng cho màn hình Đăng ký tài khoản (SignUpPage)
 * Chuẩn theo Backend DTO: Chỉ nhận email và password, không yêu cầu họ tên hay SĐT thừa
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập địa chỉ email')
      .email('Địa chỉ email không đúng định dạng'),
    password: z
      .string()
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .max(128, 'Mật khẩu tối đa 128 ký tự'),
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng nhập lại mật khẩu để xác nhận'),
    terms: z
      .boolean()
      .refine((val) => val === true, {
        message: 'Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật'
      })
      .default(true)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['confirmPassword']
  })

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * DTO gửi lên Backend đăng ký (chỉ email và password)
 */
export interface RegisterDto {
  email: string
  password: string
}

/**
 * Chuyển đổi dữ liệu form đăng ký sang DTO chuẩn của Backend
 */
export function toRegisterDto(input: RegisterInput): RegisterDto {
  return {
    email: input.email.trim(),
    password: input.password
  }
}

/**
 * 3. Verify PIN Schema
 * Áp dụng cho modal xác thực mã PIN giao dịch (PinModal)
 */
export const verifyPinSchema = z.object({
  pin: z
    .string()
    .regex(PIN_REGEX, 'Mã PIN phải bao gồm đúng 6 chữ số (0-9)'),
  paymentId: z.string().optional(),
  amount: z.string().optional()
})

export type VerifyPinInput = z.infer<typeof verifyPinSchema>

/**
 * 4. Setup PIN Schema
 * Thiết lập mã PIN lần đầu
 */
export const setupPinSchema = z
  .object({
    pin: z
      .string()
      .regex(PIN_REGEX, 'Mã PIN phải bao gồm đúng 6 chữ số (0-9)'),
    confirmPin: z
      .string()
      .regex(PIN_REGEX, 'Mã PIN xác nhận phải bao gồm đúng 6 chữ số (0-9)')
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: 'Mã PIN xác nhận không trùng khớp',
    path: ['confirmPin']
  })

export type SetupPinInput = z.infer<typeof setupPinSchema>

/**
 * 5. Change PIN Schema
 * Đổi mã PIN bảo mật
 */
export const changePinSchema = z
  .object({
    oldPin: z
      .string()
      .regex(PIN_REGEX, 'Mã PIN hiện tại phải gồm đúng 6 chữ số'),
    newPin: z
      .string()
      .regex(PIN_REGEX, 'Mã PIN mới phải gồm đúng 6 chữ số'),
    confirmNewPin: z
      .string()
      .regex(PIN_REGEX, 'Xác nhận mã PIN mới phải gồm đúng 6 chữ số')
  })
  .refine((data) => data.newPin === data.confirmNewPin, {
    message: 'Mã xác nhận PIN mới không trùng khớp',
    path: ['confirmNewPin']
  })
  .refine((data) => data.oldPin !== data.newPin, {
    message: 'Mã PIN mới không được trùng với mã PIN hiện tại',
    path: ['newPin']
  })

export type ChangePinInput = z.infer<typeof changePinSchema>

