import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatVndExact } from '@/lib/format'
import { cashoutInputSchema } from '../schemas/cashout.schema'
import type { CashOutInput } from '../types/funding.types'
export function CashOutForm({
  locked,
  onSubmit,
}: {
  locked: boolean
  onSubmit: (input: CashOutInput) => Promise<void>
}) {
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<CashOutInput>({
    resolver: zodResolver(cashoutInputSchema),
    defaultValues: { amount: '100000', destination: '' },
  })
  const amount = useWatch({ control, name: 'amount' })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <fieldset
        disabled={locked}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <legend className="px-2 font-bold">Điểm nhận mô phỏng</legend>
        <p className="text-sm text-muted-foreground">
          Không phải tài khoản ngân hàng đã liên kết. Chỉ nhập mã thử nghiệm,
          không nhập thông tin ngân hàng thật.
        </p>
        <label htmlFor="cashout-destination">
          Mã điểm nhận (không bắt buộc)
        </label>
        <Input
          id="cashout-destination"
          autoComplete="off"
          {...register('destination')}
        />
        {errors.destination && <p role="alert">{errors.destination.message}</p>}
      </fieldset>
      <fieldset
        disabled={locked}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <legend className="px-2 font-bold">Số tiền cần rút</legend>
        <label htmlFor="cashout-amount">Số tiền rút (VND)</label>
        <Input
          id="cashout-amount"
          inputMode="numeric"
          autoComplete="off"
          {...register('amount')}
          aria-invalid={Boolean(errors.amount)}
          className="h-16 text-center text-3xl md:text-3xl font-bold text-primary"
        />
        {errors.amount && <p role="alert">{errors.amount.message}</p>}
        <div className="flex flex-wrap gap-2">
          {['50000', '100000', '200000', '500000', '1000000'].map((value) => (
            <Button
              type="button"
              variant={amount === value ? 'default' : 'outline'}
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
      <Button type="submit" disabled={locked} className="w-full">
        Tạo lệnh rút mô phỏng
      </Button>
    </form>
  )
}
