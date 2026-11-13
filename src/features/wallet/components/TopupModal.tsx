import { X } from 'lucide-react'
import { TopupForm } from '@/features/funding'
interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}
export function TopupModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nạp tiền vào ví"
        className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Nạp tiền vào ví</h2>
          <button aria-label="Đóng" onClick={onClose}>
            <X />
          </button>
        </div>
        <TopupForm />
      </div>
    </div>
  )
}
