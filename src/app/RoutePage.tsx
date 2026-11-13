import { Suspense, type ComponentType } from 'react'
import { Loader2 } from 'lucide-react'

export function RoutePage({ page: Component }: { page: ComponentType }) {
  return <Suspense fallback={<div className="flex h-64 items-center justify-center" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
    <Component />
  </Suspense>
}
