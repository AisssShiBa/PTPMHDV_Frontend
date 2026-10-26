import { z } from 'zod'

export const recipientQuerySchema = z.string().trim().min(1, 'Vui lòng nhập email hoặc số điện thoại người nhận.')
  .max(254, 'Thông tin tra cứu tối đa 254 ký tự.')
  .refine((value) => z.email().safeParse(value).success || /^\+?\d[\d ().-]{3,28}\d$/.test(value),
    'Vui lòng nhập email đầy đủ hoặc số điện thoại hợp lệ.')

export const recipientSchema = z.object({
  authUserId: z.uuid(),
  maskedName: z.string().trim().min(1).max(200)
})
export type Recipient = z.infer<typeof recipientSchema>

// Retry-After can be seconds or an HTTP date. Missing/inaccessible headers use
// the backend's documented 60-second lookup window.
export function lookupRetryAt(header: unknown, now = Date.now()): number {
  if (typeof header !== 'string' && typeof header !== 'number') return now + 60_000
  const value = String(header).trim()
  if (!value) return now + 60_000
  const seconds = /^\d+$/.test(value) ? Number(value) : NaN
  const deadline = Number.isFinite(seconds) ? now + seconds * 1000 : Date.parse(value)
  return Number.isFinite(deadline) && deadline > now ? deadline : now + 60_000
}
