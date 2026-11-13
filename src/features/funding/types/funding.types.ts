import type { z } from 'zod'
import type {
  topupSchema,
  createdTopupSchema,
  topupStatusSchema,
} from '../schemas/topup.schema'
import type {
  cashoutSchema,
  cashoutInputSchema,
  cashoutStatusSchema,
} from '../schemas/cashout.schema'
export type TopupRecord = z.infer<typeof topupSchema>
export type CreateTopupResponse = z.infer<typeof createdTopupSchema>
export type TopupStatus = z.infer<typeof topupStatusSchema>
export type CashOutRecord = z.infer<typeof cashoutSchema>
export type CashOutInput = z.infer<typeof cashoutInputSchema>
export type CashOutStatus = z.infer<typeof cashoutStatusSchema>
export type FundingPhase =
  | 'IDLE'
  | 'CREATING'
  | 'REDIRECTING'
  | 'CHECKING'
  | 'CONFIRMING'
  | 'UNKNOWN'
  | 'ERROR'
export const isTopupTerminal = (status: TopupStatus) =>
  ['APPROVED', 'REJECTED', 'FAILED', 'EXPIRED'].includes(status)
export const isCashOutTerminal = (status: CashOutStatus) =>
  status === 'SUCCEEDED' || status === 'FAILED'
