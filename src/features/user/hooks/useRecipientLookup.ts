import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { errorMessage } from '@/lib/apiResponse'
import { userService } from '../services/userService'
import { lookupRetryAt, recipientQuerySchema, type Recipient } from '../schemas/recipient.schema'

// Keep the server cooldown when closing/reopening the transfer dialog; no
// recipient queries or results are persisted in browser storage.
const cooldowns = new Map<string, number>()

export function useRecipientLookup(authUserId: string) {
  const [query, setQuery] = useState('')
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retryAt, setRetryAt] = useState(() => cooldowns.get(authUserId) ?? 0)
  const [now, setNow] = useState(Date.now)
  const request = useRef<AbortController | null>(null)
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000))

  useEffect(() => () => request.current?.abort(), [authUserId])
  useEffect(() => {
    if (!retryAt) return
    const tick = () => {
      const time = Date.now()
      setNow(time)
      if (time >= retryAt) { cooldowns.delete(authUserId); setRetryAt(0) }
    }
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [authUserId, retryAt])

  const changeQuery = (value: string) => {
    request.current?.abort(); request.current = null
    setQuery(value); setRecipient(null); setError(''); setLoading(false)
  }
  const lookup = async () => {
    if (request.current || (cooldowns.get(authUserId) ?? 0) > Date.now()) return
    const parsed = recipientQuerySchema.safeParse(query)
    setRecipient(null); setError('')
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    try {
      const result = await userService.lookupRecipient(parsed.data, controller.signal)
      if (controller.signal.aborted || useAuthStore.getState().user?.id !== authUserId) return
      if (result.authUserId === authUserId) {
        setError('Không tìm thấy người nhận phù hợp. Vui lòng kiểm tra lại email hoặc số điện thoại.')
        return
      }
      setRecipient(result)
    } catch (failure) {
      if (controller.signal.aborted || useAuthStore.getState().user?.id !== authUserId) return
      if (axios.isAxiosError(failure) && failure.response?.status === 429) {
        const deadline = lookupRetryAt(failure.response.headers['retry-after'])
        cooldowns.set(authUserId, deadline)
        setNow(Date.now()); setRetryAt(deadline)
      } else if (axios.isAxiosError(failure) && failure.response?.status === 404) {
        setError('Không tìm thấy người nhận phù hợp. Vui lòng kiểm tra lại email hoặc số điện thoại.')
      } else setError(errorMessage(failure))
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false) }
    }
  }
  return { query, changeQuery, recipient, error, loading, remaining, lookup }
}
