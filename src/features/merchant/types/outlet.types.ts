import type { z } from 'zod'
import type {
  outletSchema,
  outletInputSchema,
  outletPageSchema,
  qrSchema,
  keyMetadataSchema,
} from '../schemas/outlet.schema'
export type Outlet = z.infer<typeof outletSchema>
export type OutletInput = z.infer<typeof outletInputSchema>
export type OutletPage = z.infer<typeof outletPageSchema>
export type OutletQr = z.infer<typeof qrSchema>
export type KeyMetadata = z.infer<typeof keyMetadataSchema>
