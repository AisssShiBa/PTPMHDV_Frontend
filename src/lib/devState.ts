import { useSearchParams } from 'react-router-dom'

export type DevState = 'loading' | 'empty' | 'error' | null

/**
 * Hook useDevState đọc ?state=loading|empty|error trên URL
 * Chỉ hoạt động khi ở môi trường DEV (import.meta.env.DEV)
 */
export function useDevState(): DevState {
  const [searchParams] = useSearchParams()

  if (!import.meta.env.DEV) return null

  const state = searchParams.get('state')
  if (state === 'loading' || state === 'empty' || state === 'error') {
    return state
  }

  return null
}
