import axios from 'axios'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/apiResponse'
import { merchantApi } from '../api/merchant.api'
import { merchantKeys } from '../api/merchant.queries'
import { outletInputSchema } from '../schemas/outlet.schema'
import type { OutletInput } from '../types/outlet.types'
export function OutletCreateForm({
  owner,
  merchantId,
}: {
  owner: string
  merchantId: string
}) {
  const client = useQueryClient()
  const latch = useRef(false)
  const [unknown, setUnknown] = useState(false)
  const [message, setMessage] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OutletInput>({
    resolver: zodResolver(outletInputSchema),
    defaultValues: { name: '', code: '' },
  })
  const submit = async (input: OutletInput) => {
    if (latch.current || unknown) return
    latch.current = true
    setMessage(undefined)
    try {
      await merchantApi.createOutlet(merchantId, input)
      reset()
      setMessage('Máy chủ đã tiếp nhận điểm bán.')
    } catch (error) {
      setMessage(errorMessage(error))
      setUnknown(
        !axios.isAxiosError(error) ||
          !error.response ||
          error.response.status >= 500,
      )
    } finally {
      latch.current = false
      void client.invalidateQueries({
        queryKey: merchantKeys.outlets(owner, merchantId),
      })
    }
  }
  return (
    <form
      className="space-y-3 rounded-xl border border-border p-4"
      onSubmit={(event) => {
        void handleSubmit(submit)(event)
      }}
    >
      <h3 className="font-bold">Tạo điểm bán</h3>
      <label htmlFor="outlet-name">Tên điểm bán</label>
      <Input
        id="outlet-name"
        {...register('name')}
        disabled={isSubmitting || unknown}
      />
      {errors.name && <p role="alert">{errors.name.message}</p>}
      <label htmlFor="outlet-code">Mã điểm bán</label>
      <Input
        id="outlet-code"
        {...register('code')}
        disabled={isSubmitting || unknown}
      />
      {errors.code && <p role="alert">{errors.code.message}</p>}
      {message && <p role="status">{message}</p>}
      {unknown && (
        <p>
          Kiểm tra danh sách điểm bán trước khi tạo yêu cầu khác. Không tự gửi
          lại yêu cầu có kết quả chưa rõ.
        </p>
      )}
      <Button disabled={isSubmitting || unknown}>Tạo điểm bán</Button>
    </form>
  )
}
