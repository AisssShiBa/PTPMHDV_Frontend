import { useRef, useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/apiResponse'
import { merchantApi } from '../api/merchant.api'
import { ApiKeyCreateModal } from './ApiKeyCreateModal'
import type { KeyMetadata } from '../types/outlet.types'
export function ApiKeyManager({
  merchantId,
  approved,
}: {
  merchantId: string
  approved: boolean
}) {
  const [open, setOpen] = useState(false)
  const [metadata, setMetadata] = useState<KeyMetadata>()
  const [keyId, setKeyId] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const busy = useRef(false)
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">Khóa tích hợp API</h2>
      <p>
        Không có danh sách toàn bộ khóa. Giữ keyId để thu hồi khi cần; không
        nhập raw API key vào ô thu hồi.
      </p>
      {approved && (
        <Button onClick={() => setOpen(true)}>Tạo API key mới</Button>
      )}
      {metadata && (
        <div className="break-all rounded-xl border p-3">
          <h3 className="font-bold">Metadata vừa thao tác trong phiên này</h3>
          <p>keyId: {metadata.keyId}</p>
          <p>Prefix: {metadata.prefix}</p>
          <p>
            {metadata.revokedAt
              ? 'Máy chủ đã xác nhận thu hồi.'
              : 'Máy chủ đã trả metadata tạo khóa.'}
          </p>
        </div>
      )}
      <label className="block" htmlFor="revoke-key-id">
        keyId cần thu hồi
      </label>
      <Input
        id="revoke-key-id"
        value={keyId}
        onChange={(event) => {
          setKeyId(event.target.value)
          setConfirm(false)
        }}
        disabled={pending}
        autoComplete="off"
      />
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!z.uuid().safeParse(keyId).success) {
            setMessage('Nhập keyId UUID hợp lệ.')
            return
          }
          setMessage(undefined)
          setConfirm(true)
        }}
      >
        Thu hồi khóa
      </Button>
      {confirm && (
        <div className="space-y-3">
          <p>
            Thu hồi khóa này sẽ ngăn khóa tiếp tục xác thực. Bạn có chắc chắn?
          </p>
          <Button
            disabled={pending}
            onClick={async () => {
              if (busy.current) return
              busy.current = true
              setPending(true)
              try {
                const result = await merchantApi.revokeKey(merchantId, keyId)
                setMetadata(result)
                setMessage('Máy chủ đã xác nhận thu hồi khóa.')
                setConfirm(false)
              } catch (error) {
                setMessage(errorMessage(error))
              } finally {
                busy.current = false
                setPending(false)
              }
            }}
          >
            Xác nhận thu hồi
          </Button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {open && (
        <ApiKeyCreateModal
          merchantId={merchantId}
          close={() => setOpen(false)}
          onMetadata={(data) => {
            setMetadata(data)
            setKeyId(data.keyId)
          }}
        />
      )}
    </section>
  )
}
