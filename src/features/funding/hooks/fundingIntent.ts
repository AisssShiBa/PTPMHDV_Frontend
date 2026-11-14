import { FundingError } from '../api/funding.errors'
/** One immutable intent per mounted flow; retries share its UUID. */
export function createFundingIntent() {
  let payload: string | undefined
  let key: string | undefined
  let busy = false
  return {
    acquire(value: unknown) {
      if (busy) throw new FundingError('FUNDING_BUSY')
      const next = JSON.stringify(value)
      if (payload !== undefined && next !== payload)
        throw new FundingError('FUNDING_INTENT_CHANGED')
      payload = next
      key ??= crypto.randomUUID()
      busy = true
      return key
    },
    release() {
      busy = false
    },
  }
}
