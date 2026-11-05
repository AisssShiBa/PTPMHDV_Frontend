import { type ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { errorMessage } from '@/lib/apiResponse'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T, unknown>
  skeleton?: ReactNode
  emptyFallback?: ReactNode
  isEmpty?: (data: T) => boolean
  children: ((data: T) => ReactNode) | ReactNode
}

/**
 * Component bọc query tự động quản lý Loading, Error và Empty state theo frontend_rules.md
 */
export function QueryBoundary<T>({
  query,
  skeleton,
  emptyFallback,
  isEmpty,
  children
}: QueryBoundaryProps<T>) {
  if (query.isLoading) {
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
    return (
      <div className="my-4 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center" role="alert">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h4 className="mt-2 text-sm font-semibold text-foreground">Không thể tải dữ liệu</h4>
        <p className="mt-1 text-xs text-muted-foreground">{errorMessage(query.error)}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Thử lại</span>
        </button>
      </div>
    )
  }

  const data = query.data as T

  // Kiểm tra empty data nếu có
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
