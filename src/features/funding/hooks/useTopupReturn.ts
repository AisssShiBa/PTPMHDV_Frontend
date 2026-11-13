import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useAuthStore } from '@/features/auth'
import { fundingQueries, useTopupStatus } from '../api/funding.queries'
/** Correlate by exact server-owned code, never newest order or callback success flag. */
export function useTopupReturn(params: URLSearchParams) {
  const owner = useAuthStore((state) => state.user?.id) ?? ''
  const rawId = params.get('topupId')
  const code = params.get('vnp_TxnRef')
  const validId = rawId && z.uuid().safeParse(rawId).success ? rawId : undefined
  const shouldLookup =
    !rawId && Boolean(code && /^NAP[A-Z0-9]{1,64}$/.test(code))
  const history = useQuery({
    ...fundingQueries.history(owner),
    enabled: Boolean(owner && shouldLookup),
    staleTime: 0,
  })
  const matches = shouldLookup
    ? history.data?.filter((row) => row.code === code)
    : undefined
  const id = validId ?? (matches?.length === 1 ? matches[0].id : undefined)
  const status = useTopupStatus(id ?? '', Boolean(id))
  const mismatch = Boolean(code && status.data && status.data.code !== code)
  return {
    id,
    history,
    status,
    mismatch,
    resolving: shouldLookup && history.isFetching,
    ambiguous: Boolean(matches && matches.length !== 1),
  }
}
