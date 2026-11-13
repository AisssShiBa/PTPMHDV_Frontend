import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { walletKeys } from '@/features/wallet'
import { fundingApi, validate } from '../api/funding.api'
import { fundingError, FundingError } from '../api/funding.errors'
import { fundingKeys } from '../api/funding.queries'
import { cashoutInputSchema } from '../schemas/cashout.schema'
import type {
  CashOutInput,
  CashOutRecord,
  FundingPhase,
} from '../types/funding.types'
import { createFundingIntent } from './fundingIntent'
export function useCashOutFlow() {
  const owner = useAuthStore((state) => state.user?.id)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const client = useQueryClient()
  const session = useRef({
    owner,
    intent: createFundingIntent(),
    confirming: false,
    confirmationSent: false,
    order: undefined as CashOutRecord | undefined,
  })
  const [view, setView] = useState<{
    owner?: string
    phase: FundingPhase
    order?: CashOutRecord
    canConfirm: boolean
  }>({ phase: 'IDLE', canConfirm: false })
  const current = () =>
    Boolean(
      mounted.current && owner && useAuthStore.getState().user?.id === owner,
    )
  const update = (phase: FundingPhase) => {
    if (current())
      setView({
        owner,
        phase,
        order: session.current.order,
        canConfirm: Boolean(
          session.current.order?.status === 'REQUESTED' &&
          !session.current.confirmationSent,
        ),
      })
  }
  function accept(order: CashOutRecord, phase: FundingPhase = 'CHECKING') {
    if (!current()) return
    if (order.userId !== owner) throw new FundingError('INVALID_RESPONSE', true)
    session.current.order = order
    client.setQueryData(fundingKeys.cashout(owner!, order.id), order)
    void client.invalidateQueries({ queryKey: walletKeys.all })
    update(phase)
    return order
  }
  async function create(input: CashOutInput) {
    if (!current()) return
    if (session.current.owner !== owner)
      session.current = {
        owner,
        intent: createFundingIntent(),
        confirming: false,
        confirmationSent: false,
        order: undefined,
      }
    const state = session.current
    const payload = validate(cashoutInputSchema, input)
    const key = state.intent.acquire(payload)
    if (state.order) {
      state.intent.release()
      throw new FundingError('FUNDING_RECONCILE_REQUIRED')
    }
    update('CREATING')
    try {
      return accept(await fundingApi.createCashOut(payload, key))
    } catch (error) {
      update(fundingError(error).outcomeUnknown ? 'UNKNOWN' : 'ERROR')
      throw error
    } finally {
      state.intent.release()
    }
  }
  async function reconcile(id?: string) {
    const orderId = id ?? session.current.order?.id
    if (!current() || !orderId || session.current.confirming) return
    if (session.current.owner !== owner)
      session.current = {
        owner,
        intent: createFundingIntent(),
        confirming: false,
        confirmationSent: true,
        order: undefined,
      }
    // Recovered orders are read-only: a lost confirmation outcome must not authorize another POST.
    if (!session.current.order || session.current.order.id !== orderId)
      session.current.confirmationSent = true
    try {
      return accept(await fundingApi.getCashOut(orderId))
    } catch (error) {
      update('UNKNOWN')
      throw error
    }
  }
  async function confirm(transactionToken: string) {
    const state = session.current
    if (!current() || state.owner !== owner || !state.order)
      throw new FundingError('FUNDING_ORDER_REQUIRED')
    if (
      state.confirming ||
      state.confirmationSent ||
      state.order.status !== 'REQUESTED'
    )
      throw new FundingError('FUNDING_RECONCILE_REQUIRED')
    state.confirming = true
    state.confirmationSent = true
    update('CONFIRMING')
    try {
      return accept(
        await fundingApi.confirmCashOut(state.order.id, transactionToken),
      )
    } catch (error) {
      update('UNKNOWN')
      // Read once immediately; never retain/replay the token. Polling continues via status queries.
      if (current()) {
        try {
          const order = await fundingApi.getCashOut(state.order.id)
          if (
            current() &&
            fundingError(error).code === 'TRANSACTION_TOKEN_EXPIRED' &&
            order.status === 'REQUESTED'
          )
            state.confirmationSent = false
          accept(order, 'UNKNOWN')
        } catch {
          /* Preserve the confirmation error and unknown outcome. */
        }
      }
      throw error
    } finally {
      state.confirming = false
    }
  }
  const visible =
    view.owner === owner
      ? view
      : { phase: 'IDLE' as const, order: undefined, canConfirm: false }
  return { ...visible, create, confirm, reconcile }
}
