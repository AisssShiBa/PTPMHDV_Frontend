import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth'
import { fundingApi } from '../api/funding.api'
import { fundingError } from '../api/funding.errors'
import type { FundingPhase } from '../types/funding.types'
import { createFundingIntent } from './fundingIntent'
export function useTopupFlow() {
  const owner = useAuthStore((state) => state.user?.id)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const session = useRef({ owner, intent: createFundingIntent() })
  const [view, setView] = useState<{ owner?: string; phase: FundingPhase }>({
    phase: 'IDLE',
  })
  const setPhase = (phase: FundingPhase) => setView({ owner, phase })
  async function create(amount: string) {
    if (
      !mounted.current ||
      !owner ||
      useAuthStore.getState().user?.id !== owner
    )
      return
    if (session.current.owner !== owner)
      session.current = { owner, intent: createFundingIntent() }
    const intent = session.current.intent
    const key = intent.acquire({ amount })
    setPhase('CREATING')
    try {
      const result = await fundingApi.createTopup(amount, key)
      if (!mounted.current || useAuthStore.getState().user?.id !== owner) return
      setPhase('REDIRECTING')
      return result
    } catch (error) {
      const failure = fundingError(error)
      if (mounted.current && useAuthStore.getState().user?.id === owner) {
        setPhase(failure.outcomeUnknown ? 'UNKNOWN' : 'ERROR')
        if (!failure.outcomeUnknown && session.current.intent === intent)
          session.current = { owner, intent: createFundingIntent() }
      }
      throw error
    } finally {
      intent.release()
    }
  }
  return { phase: view.owner === owner ? view.phase : 'IDLE', create }
}
