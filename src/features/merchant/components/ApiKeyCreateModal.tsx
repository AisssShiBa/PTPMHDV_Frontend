import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { errorMessage } from '@/lib/apiResponse'
import { merchantApi } from '../api/merchant.api'
import type { KeyMetadata } from '../types/outlet.types'
export function ApiKeyCreateModal({
  merchantId,
  onMetadata,
  close,
}: {
  merchantId: string
  onMetadata: (metadata: KeyMetadata) => void
  close: () => void
}) {
  const [secret, setSecret] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const attempted = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  return (
    <Dialog open onOpenChange={close}>
      <DialogContent>
        <DialogTitle>Tạo API key</DialogTitle>
        <DialogDescription>
          Khóa chỉ hiển thị một lần. Lưu ở nơi an toàn. Đóng cửa sổ sẽ xóa bản
          hiển thị, không thu hồi khóa trên máy chủ.
        </DialogDescription>
        {!secret && (
          <Button
            disabled={pending || sent}
            onClick={async () => {
              if (attempted.current) return
              attempted.current = true
              setSent(true)
              setPending(true)
              try {
                const result = await merchantApi.createKey(merchantId)
                if (!active.current) return
                const { key, ...metadata } = result
                setSecret(key)
                onMetadata(metadata)
              } catch (error) {
                if (active.current)
                  setMessage(
                    errorMessage(error) +
                      ' Không tự tạo lại khóa; kết quả có thể chưa xác định.',
                  )
              } finally {
                if (active.current) setPending(false)
              }
            }}
          >
            Xác nhận tạo khóa
          </Button>
        )}
        {secret && (
          <>
            <label htmlFor="merchant-key-once">
              API key chỉ hiển thị lần này
            </label>
            <textarea
              id="merchant-key-once"
              readOnly
              value={secret}
              autoComplete="off"
              className="w-full break-all rounded border p-3"
            />
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret)
                  if (active.current) setMessage('Đã sao chép khóa.')
                } catch {
                  if (active.current)
                    setMessage(
                      'Không thể sao chép. Hãy chọn và lưu khóa thủ công.',
                    )
                }
              }}
            >
              Sao chép API key
            </Button>
          </>
        )}
        {message && <p role="status">{message}</p>}
      </DialogContent>
    </Dialog>
  )
}
