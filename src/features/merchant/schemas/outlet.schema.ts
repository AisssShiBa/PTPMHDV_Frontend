import { z } from 'zod'
export const outletInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nhập tên điểm bán.')
      .max(200, 'Tên tối đa 200 ký tự.'),
    code: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9_-]{3,64}$/,
        'Mã gồm 3–64 chữ, số, dấu gạch ngang hoặc gạch dưới.',
      ),
  })
  .strict()
export const outletSchema = z.object({
  id: z.uuid(),
  merchantId: z.uuid(),
  name: z.string(),
  code: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const outletPageSchema = z.object({
  content: z.array(outletSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
})
export const qrSchema = z.object({
  version: z.literal(1),
  merchantId: z.uuid(),
  outletId: z.uuid(),
  outletCode: z.string(),
  issuedAt: z.number().int().positive(),
  token: z
    .string()
    .min(1)
    .max(2048)
    .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
  signature: z.string(),
  algorithm: z.literal('HMAC-SHA256'),
})
export const keyMetadataSchema = z.object({
  id: z.uuid(),
  keyId: z.uuid(),
  prefix: z.string(),
  revokedAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
})
export const createdKeySchema = keyMetadataSchema.extend({
  key: z.string().min(1).max(256),
})
