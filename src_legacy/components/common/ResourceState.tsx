import { AlertCircle, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ResourceLoading({ message = 'Đang tải thông tin…' }: { message?: string }) {
  return <div role="status" className="flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-muted-foreground">
    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />{message}
  </div>
}

export function ResourceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="space-y-4 rounded-xl border border-destructive/30 bg-card p-6">
    <p className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="size-5 shrink-0" aria-hidden="true" />{message}</p>
    <Button variant="outline" onClick={onRetry}>Thử tải lại</Button>
  </div>
}
