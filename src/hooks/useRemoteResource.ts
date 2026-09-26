import { useCallback, useEffect, useRef, useState } from 'react'

type Resource<T> =
  | { key: string; status: 'loading'; data?: undefined; error?: undefined }
  | { key: string; status: 'success'; data: T; error?: undefined }
  | { key: string; status: 'error'; data?: undefined; error: unknown }

export function useRemoteResource<T>(key: string, load: (key: string, signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<Resource<T>>({ key, status: 'loading' })
  const request = useRef(0)
  useEffect(() => {
    const controller = new AbortController()
    const version = ++request.current
    setState({ key, status: 'loading' })
    void load(key, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted && request.current === version) setState({ key, status: 'success', data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted && request.current === version) setState({ key, status: 'error', error })
      }
    )
    return () => { controller.abort(); request.current += 1 }
  }, [key, load, revision])
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const replace = useCallback((value: T | ((previous: T | undefined) => T)) => {
    request.current += 1
    setState((previous) => {
      const data = typeof value === 'function'
        ? (value as (previous: T | undefined) => T)(previous.key === key ? previous.data : undefined)
        : value
      return { key, status: 'success', data }
    })
  }, [key])
  const current: Resource<T> = state.key === key ? state : { key, status: 'loading' }
  return { ...current, reload, replace }
}
