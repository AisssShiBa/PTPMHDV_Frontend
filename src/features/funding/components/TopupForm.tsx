import { useState } from 'react'
import { useAuthStore } from '@/features/auth'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/apiResponse'
import { formatVndExact } from '@/lib/format'
import { topupInputSchema } from '../schemas/topup.schema'
import { useTopupFlow } from '../hooks/useTopupFlow'
import { topupNavigation, validateTopupRedirect } from '../api/topupRedirect'
export function TopupForm() {
  const owner = useAuthStore((state) => state.user?.id)
  return <TopupFormSession key={owner ?? 'anonymous'} />
}
function TopupFormSession() {
  const flow = useTopupFlow()
  const [error, setError] = useState<string>()
  const [createdId, setCreatedId] = useState<string>()
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<{ amount: string }>({
    resolver: zodResolver(topupInputSchema),
    defaultValues: { amount: '100000' },
  })
  const amount = useWatch({ control, name: 'amount' })
  const busy =
    ['CREATING', 'REDIRECTING', 'UNKNOWN'].includes(flow.phase) ||
    Boolean(createdId)
  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (input) => {
        setError(undefined)
        try {
          const result = await flow.create(input.amount)
          if (!result) return
          setCreatedId(result.topupId)
          const target = validateTopupRedirect(result.paymentUrl)
          topupNavigation.redirect(target)
        } catch (reason) {
          setError(errorMessage(reason))
        }
      })}
    >
      <fieldset
        disabled={busy}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <legend className="px-2 font-bold">Số tiền muốn nạp</legend>
        <label htmlFor="topup-amount" className="text-sm">
          Nhập số tiền nạp (VND)
        </label>
        <Input
          id="topup-amount"
          inputMode="numeric"
          autoComplete="off"
          {...register('amount')}
          aria-invalid={Boolean(errors.amount)}
          aria-describedby="topup-amount-help"
          className="h-16 text-center text-3xl md:text-3xl font-bold text-primary"
        />
        <p id="topup-amount-help" className="text-sm text-muted-foreground">
          {errors.amount?.message ??
            'Từ 10.000 đến 100.000.000 đồng; nhập chữ số, không nhập dấu phân cách.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {['50000', '100000', '200000', '500000', '1000000'].map((value) => (
            <Button
              variant={amount === value ? 'default' : 'outline'}
              type="button"
              key={value}
              onClick={() =>
                setValue('amount', value, { shouldValidate: true })
              }
            >
              {formatVndExact(value)} ₫
            </Button>
          ))}
        </div>
      </fieldset>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-bold">Phương thức thanh toán</h2>
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
          <strong>VNPAY Sandbox</strong>
          <p className="mt-2 text-sm text-muted-foreground">
            Thanh toán thử nghiệm qua cổng VNPAY. Kết quả được xác nhận từ máy
            chủ.
          </p>
        </div>
      </section>
      {import.meta.env.VITE_USE_MOCK === 'true' && (
        <p role="status">
          Mô phỏng HTTP: không phải giao dịch VNPAY sandbox thực.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 p-4">
          {error}
        </p>
      )}
      {flow.phase === 'UNKNOWN' && (
        <p role="status">
          Chưa rõ yêu cầu đã được tạo hay chưa. Kiểm tra lịch sử trước khi thực
          hiện giao dịch khác.
        </p>
      )}
      {createdId && (
        <Link
          className="block text-primary underline"
          to={'/app/topup/result?topupId=' + createdId}
        >
          Kiểm tra lệnh vừa tạo
        </Link>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {flow.phase === 'CREATING'
          ? 'Đang tạo yêu cầu…'
          : createdId
            ? 'Đã tạo yêu cầu'
            : flow.phase === 'REDIRECTING'
              ? 'Đang chuyển tới VNPAY…'
              : 'Tiếp tục tới VNPAY'}
      </Button>
    </form>
  )
}
