import { useCallback, useId, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useRemoteResource<T>(key: string, load: (key: string, signal: AbortSignal) => Promise<T>) {
  const owner = useId()
  const client = useQueryClient()
  const [revision, setRevision] = useState(0)
  const queryKey = ['remote-resource', owner, key, revision] as const
  const query = useQuery({ queryKey, queryFn: ({ signal }) => load(key, signal), gcTime: 0, retry: false })
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const replace = (value: T | ((previous: T | undefined) => T)) => {
    void client.cancelQueries({ queryKey, exact: true })
    client.setQueryData<T>(queryKey, value)
  }
  return { key, status: query.isPending ? 'loading' as const : query.status, data: query.data, error: query.error, reload, replace }
}
