import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDevState } from './devState'

export interface FixtureQueryOptions {
  delayMs?: number
  enabled?: boolean
}

export interface FixtureQueryResult<T> {
  data: T | undefined
  isLoading: boolean
  isPending: boolean
  isError: boolean
  error: Error | null
  isSuccess: boolean
  refetch: () => Promise<void>
}

/**
 * useFixtureQuery giả lập TanStack Query cho dữ liệu mock,
 * có độ trễ delayMs và tự động phản hồi theo ?state=loading|empty|error qua useDevState
 */
export function useFixtureQuery<T>(
  fixtureData: T | (() => T),
  options: FixtureQueryOptions = {}
): FixtureQueryResult<T> {
  const { delayMs = 250, enabled = true } = options
  const devState = useDevState()

  const rawData = useMemo(() => {
    return typeof fixtureData === 'function' ? (fixtureData as () => T)() : fixtureData
  }, [fixtureData])

  const [hasCompleted, setHasCompleted] = useState<boolean>(false)
  const [iteration, setIteration] = useState(0)

  const refetch = useCallback(async () => {
    setHasCompleted(false)
    setIteration((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!enabled || devState === 'loading') {
      return
    }

    const timer = setTimeout(() => {
      setHasCompleted(true)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [delayMs, enabled, devState, iteration])

  if (devState === 'loading' || !enabled || !hasCompleted) {
    const isActivelyLoading = enabled && (devState === 'loading' || !hasCompleted)
    return {
      data: undefined,
      isLoading: isActivelyLoading,
      isPending: isActivelyLoading,
      isError: false,
      error: null,
      isSuccess: false,
      refetch
    }
  }

  if (devState === 'error') {
    return {
      data: undefined,
      isLoading: false,
      isPending: false,
      isError: true,
      error: new Error('Lỗi giả lập qua tham số URL (?state=error). Vui lòng thử lại.'),
      isSuccess: false,
      refetch
    }
  }

  if (devState === 'empty') {
    const emptyValue = (Array.isArray(rawData) ? [] : null) as unknown as T
    return {
      data: emptyValue,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: true,
      refetch
    }
  }

  return {
    data: rawData,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: true,
    refetch
  }
}

export interface FixtureMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
  delayMs?: number
}

export interface FixtureMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isPending: boolean
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
  reset: () => void
}

/**
 * useFixtureMutation giả lập TanStack Mutation cho thao tác mock
 */
export function useFixtureMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData> | TData,
  options: FixtureMutationOptions<TData, TVariables> = {}
): FixtureMutationResult<TData, TVariables> {
  const { delayMs = 300, onSuccess, onError } = options
  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsError(false)
    setIsSuccess(false)
    setError(null)
  }, [])

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsPending(true)
      setIsError(false)
      setIsSuccess(false)
      setError(null)

      try {
        await new Promise((res) => setTimeout(res, delayMs))
        const res = await mutationFn(variables)
        setIsPending(false)
        setIsSuccess(true)
        onSuccess?.(res, variables)
        return res
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setIsPending(false)
        setIsError(true)
        setError(errorObj)
        onError?.(errorObj, variables)
        throw errorObj
      }
    },
    [delayMs, mutationFn, onSuccess, onError]
  )

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {})
    },
    [mutateAsync]
  )

  return {
    mutate,
    mutateAsync,
    isPending,
    isLoading: isPending,
    isError,
    isSuccess,
    error,
    reset
  }
}
