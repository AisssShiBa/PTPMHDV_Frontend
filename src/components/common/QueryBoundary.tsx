import { type ReactNode } from 'react'
import { errorMessage } from '@/lib/apiResponse'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface QueryLike<T> {
  data?: T
  isLoading?: boolean
  isPending?: boolean
  isError?: boolean
  error?: unknown
  refetch?: () => unknown
}

interface QueryBoundaryProps<T> {
  query: QueryLike<T>
  skeleton?: ReactNode
  emptyFallback?: ReactNode
  errorFallback?: ReactNode | ((error: unknown, refetch?: () => unknown) => ReactNode)
  isEmpty?: (data: T) => boolean
  children: ((data: T) => ReactNode) | ReactNode
}

/**
 * Component bọc query tự động quản lý 4 trạng thái: Loading, Error, Empty, Success
 */
export function QueryBoundary<T>({
  query,
  skeleton,
  emptyFallback,
  errorFallback,
  isEmpty,
  children
}: QueryBoundaryProps<T>) {
  const isLoading = query.isLoading ?? query.isPending ?? false

  if (isLoading) {
    return skeleton ? (
      <>{skeleton}</>
    ) : (
      <div className="flex h-32 w-full items-center justify-center text-muted-foreground" role="status">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>Đang tải dữ liệu…</span>
        </div>
      </div>
    )
  }

  if (query.isError) {
    if (errorFallback) {
      return typeof errorFallback === 'function' ? <>{errorFallback(query.error, query.refetch)}</> : <>{errorFallback}</>
    }

    return (
      <div className="my-4 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center" role="alert">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h4 className="mt-2 text-sm font-semibold text-foreground">Không thể tải dữ liệu</h4>
        <p className="mt-1 text-xs text-muted-foreground">{errorMessage(query.error)}</p>
        {query.refetch && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => query.refetch?.()}
            className="mt-4"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Thử lại</span>
          </Button>
        )}
      </div>
    )
  }

  const data = query.data as T

  const checkEmpty = isEmpty
    ? isEmpty(data)
    : Array.isArray(data)
      ? data.length === 0
      : data === null || data === undefined

  if (checkEmpty && emptyFallback) {
    return <>{emptyFallback}</>
  }

  return <>{typeof children === 'function' ? children(data) : children}</>
}
