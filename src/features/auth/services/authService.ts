/**
 * @deprecated Toàn bộ logic xác thực đã được gộp vào @/features/auth/api/auth.api
 * File này chỉ re-export phục vụ tương thích ngược (Single Source of Truth).
 */
export { authService, authApi, default } from '../api/auth.api'
