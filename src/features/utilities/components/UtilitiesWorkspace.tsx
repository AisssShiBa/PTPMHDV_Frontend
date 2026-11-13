import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Receipt, RefreshCw, ShieldCheck, Smartphone, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { PinModal } from '@/features/auth/components/PinModal'
import { useWalletMe, walletKeys } from '@/features/wallet'
import { formatVnd, isGreaterThanOrEqual } from '@/lib/format'
import { BILL_PROVIDERS, billProviderLabel } from '../constants'
import {
  isRetryableCheckoutError,
  isRetryableConfirmError,
  utilitiesErrorMessage
} from '../errors'
import { resolveIdempotencyKey, type IntentKey } from '../idempotency'
import {
  useBillLookup,
  useConfirmUtilityPayment,
  useCreateTopup,
  usePayBill,
  useUtilityOrder
} from '../queries'
import {
  billLookupSchema,
  billPayIntent,
  billPaySchema,
  buildBillPayPayload,
  discountForAmount,
  topupFormSchema,
  topupIntent
} from '../schemas'
import { isTerminalOrderStatus } from '../status'
import type {
  BillLookupRequest,
  BillPayPayload,
  CheckoutAttempt,
  CheckoutKind,
  TopupPayload,
  UtilityNotice,
  UtilityOrderView
} from '../types'
import { BillPaymentForm } from './BillPaymentForm'
import { OrderStatusPanel } from './OrderStatusPanel'
import { PaymentSummary } from './PaymentSummary'
import { TopupForm } from './TopupForm'

function UtilitiesLoading({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex min-h-[220px] items-center justify-center rounded-xl border border-border bg-card/40"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  )
}

export function UtilitiesWorkspace() {
  const wallet = useWalletMe()

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Receipt className="h-4 w-4" />
            <span>Tiện ích đời sống &amp; Viễn thông</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Thanh toán hóa đơn &amp; Nạp điện thoại
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Nạp tiền điện thoại và thanh toán hóa đơn sinh hoạt qua ví FinVault
          </p>
        </div>

        <div className="flex items-center gap-3 self-start rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm sm:self-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Số dư khả dụng</div>
            <div className="text-base font-bold text-foreground">
              {wallet.data ? formatVnd(wallet.data.availableBalance) : '—'}
            </div>
          </div>
        </div>
      </div>

      <QueryBoundary
        query={wallet}
        skeleton={<UtilitiesLoading label="Đang tải thông tin ví…" />}
        isEmpty={(data) => !data}
        emptyFallback={
          <EmptyState
            title="Chưa có thông tin ví"
            description="Không tìm thấy ví FinVault của tài khoản này. Vui lòng tải lại trang hoặc đăng nhập lại."
          />
        }
      >
        {(data) => <UtilitiesWorkspaceContent balance={data.availableBalance} />}
      </QueryBoundary>
    </div>
  )
}

function UtilitiesWorkspaceContent({ balance }: { balance: string }) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<CheckoutKind>('TOPUP')

  const [topupPhone, setTopupPhone] = useState('')
  const [topupAmount, setTopupAmount] = useState<string>('100000')
  const [topupError, setTopupError] = useState<string | null>(null)

  const [billProvider, setBillProvider] = useState<string>(BILL_PROVIDERS[0].code)
  const [billCustomerCode, setBillCustomerCode] = useState('')
  const [billError, setBillError] = useState<string | null>(null)
  const [lookupRequest, setLookupRequest] = useState<BillLookupRequest | null>(null)

  const [pinOrder, setPinOrder] = useState<UtilityOrderView | null>(null)
  const [reauthOrder, setReauthOrder] = useState<UtilityOrderView | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [lastAttempt, setLastAttempt] = useState<CheckoutAttempt | null>(null)
  const [notice, setNotice] = useState<UtilityNotice | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const attemptKeyRef = useRef<IntentKey | null>(null)
  const executingRef = useRef(false)

  const billLookup = useBillLookup(lookupRequest)
  const createTopup = useCreateTopup()
  const payBill = usePayBill()
  const confirmPayment = useConfirmUtilityPayment()
  const orderQuery = useUtilityOrder(activeOrderId)
  const orderData = orderQuery.data

  useEffect(() => {
    if (orderData && isTerminalOrderStatus(orderData.status)) {
      void queryClient.invalidateQueries({ queryKey: walletKeys.me() })
    }
  }, [orderData, queryClient])

  const executeAttempt = async (attempt: CheckoutAttempt) => {
    if (executingRef.current) return
    executingRef.current = true
    setSubmitting(true)
    setNotice(null)
    try {
      const order =
        attempt.kind === 'TOPUP'
          ? await createTopup.mutateAsync({
              payload: attempt.payload as TopupPayload,
              idempotencyKey: attempt.key
            })
          : await payBill.mutateAsync({
              payload: attempt.payload as BillPayPayload,
              idempotencyKey: attempt.key
            })

      if (!order.paymentId) {
        setNotice({
          kind: 'error',
          text: 'Đơn hàng đã được tạo nhưng chưa có mã thanh toán. Vui lòng thử lại sau.'
        })
        return
      }
      setPinOrder(order)
    } catch (error) {
      if (isRetryableCheckoutError(error)) {
        setNotice({
          kind: 'retry',
          text: 'Yêu cầu đang được xử lý, vui lòng không thực hiện lại. Bấm "Thử lại" để gửi lại bằng cùng mã giao dịch.',
          action: 'CHECKOUT'
        })
      } else {
        setNotice({ kind: 'error', text: utilitiesErrorMessage(error) })
      }
    } finally {
      executingRef.current = false
      setSubmitting(false)
    }
  }

  const startAttempt = (attempt: CheckoutAttempt) => {
    setLastAttempt(attempt)
    void executeAttempt(attempt)
  }

  const handlePayTopup = () => {
    setTopupError(null)
    const parsed = topupFormSchema.safeParse({ phone: topupPhone, amount: topupAmount })
    if (!parsed.success) {
      setTopupError(parsed.error.issues[0]?.message ?? 'Thông tin nạp tiền chưa hợp lệ.')
      return
    }
    if (!isGreaterThanOrEqual(balance, parsed.data.amount)) {
      setTopupError('Số dư ví không đủ để thực hiện giao dịch này.')
      return
    }
    const payload: TopupPayload = parsed.data
    const intent = topupIntent(payload)
    attemptKeyRef.current = resolveIdempotencyKey(attemptKeyRef.current, intent)
    startAttempt({
      kind: 'TOPUP',
      intent,
      key: attemptKeyRef.current.key,
      payload
    })
  }

  const handlePayBill = () => {
    setBillError(null)
    if (!billLookup.data) {
      setBillError('Vui lòng tra cứu hóa đơn trước khi thanh toán.')
      return
    }
    const parsed = billPaySchema.safeParse({
      provider: billProvider,
      customerCode: billCustomerCode,
      amount: billLookup.data.amount
    })
    if (!parsed.success) {
      setBillError(parsed.error.issues[0]?.message ?? 'Thông tin hóa đơn chưa hợp lệ.')
      return
    }
    if (
      billLookup.data.provider !== parsed.data.provider ||
      billLookup.data.customerCode !== parsed.data.customerCode
    ) {
      setBillError('Thông tin hóa đơn đã thay đổi. Vui lòng tra cứu lại.')
      return
    }
    if (!isGreaterThanOrEqual(balance, parsed.data.amount)) {
      setBillError('Số dư ví không đủ để thanh toán hóa đơn này.')
      return
    }

    const payload = buildBillPayPayload({
      ...billLookup.data,
      provider: parsed.data.provider,
      customerCode: parsed.data.customerCode
    })
    const intent = billPayIntent(payload)
    attemptKeyRef.current = resolveIdempotencyKey(attemptKeyRef.current, intent)
    startAttempt({ kind: 'BILLS', intent, key: attemptKeyRef.current.key, payload })
  }

  const handlePay = () => {
    if (submitting) return
    if (activeTab === 'TOPUP') handlePayTopup()
    else handlePayBill()
  }

  const handleLookup = () => {
    setBillError(null)
    const parsed = billLookupSchema.safeParse({
      provider: billProvider,
      customerCode: billCustomerCode
    })
    if (!parsed.success) {
      setBillError(parsed.error.issues[0]?.message ?? 'Thông tin tra cứu chưa hợp lệ.')
      return
    }
    if (
      lookupRequest?.provider === parsed.data.provider &&
      lookupRequest.customerCode === parsed.data.customerCode
    ) {
      void billLookup.refetch()
      return
    }
    setLookupRequest(parsed.data)
  }

  const handlePinSuccess = async (transactionToken: string) => {
    const order = pinOrder
    if (!order?.paymentId) return
    setPinOrder(null)
    setReauthOrder(null)
    setSubmitting(true)
    try {
      await confirmPayment.mutateAsync({
        paymentId: order.paymentId,
        transactionToken
      })
      setActiveOrderId(order.orderId)
      setNotice(null)
    } catch (error) {
      if (isRetryableConfirmError(error)) {
        setNotice({
          kind: 'info',
          text: 'Thanh toán đang được xử lý. FinVault sẽ tự cập nhật kết quả, vui lòng không thực hiện lại.'
        })
        setActiveOrderId(order.orderId)
      } else {
        setReauthOrder(order)
        setNotice({
          kind: 'error',
          text: utilitiesErrorMessage(error),
          action: 'REAUTH'
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetryCheckout = () => {
    if (lastAttempt) void executeAttempt(lastAttempt)
  }

  const handleReauth = () => {
    if (reauthOrder) setPinOrder(reauthOrder)
  }

  const resetFlow = () => {
    setActiveOrderId(null)
    setPinOrder(null)
    setReauthOrder(null)
    setNotice(null)
    setLastAttempt(null)
    attemptKeyRef.current = null
    setLookupRequest(null)
    setTopupError(null)
    setBillError(null)
    void queryClient.invalidateQueries({ queryKey: walletKeys.me() })
  }

  if (activeOrderId) {
    return (
      <QueryBoundary
        query={orderQuery}
        skeleton={<UtilitiesLoading label="Đang tải trạng thái đơn hàng…" />}
      >
        {(order) => <OrderStatusPanel order={order} onReset={resetFlow} />}
      </QueryBoundary>
    )
  }

  const isTopup = activeTab === 'TOPUP'
  const currentAmount = isTopup ? topupAmount : billLookup.data?.amount ?? ''
  const currentDiscount = isTopup ? discountForAmount(topupAmount) : undefined
  const insufficient = Boolean(currentAmount) && !isGreaterThanOrEqual(balance, currentAmount)
  const serviceName = isTopup
    ? `Nạp điện thoại ${topupPhone || '—'}`
    : `${billProviderLabel(billProvider)}${
        billLookup.data ? ` - ${billLookup.data.customerCode}` : ''
      }`

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Button
          type="button"
          onClick={() => setActiveTab('TOPUP')}
          disabled={submitting}
          className={`h-11 cursor-pointer gap-2 rounded-xl px-5 text-xs font-semibold transition-all sm:text-sm ${
            isTopup
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Nạp điện thoại di động</span>
        </Button>
        <Button
          type="button"
          onClick={() => setActiveTab('BILLS')}
          disabled={submitting}
          className={`h-11 cursor-pointer gap-2 rounded-xl px-5 text-xs font-semibold transition-all sm:text-sm ${
            !isTopup
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Thanh toán hóa đơn sinh hoạt</span>
        </Button>
      </div>

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 text-xs font-medium ${
            notice.kind === 'error'
              ? 'border-destructive/20 bg-destructive/10 text-destructive'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          }`}
        >
          <span className="flex items-start gap-2">
            {notice.kind === 'error' ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            )}
            <span>{notice.text}</span>
          </span>
          {notice.action === 'CHECKOUT' && (
            <Button
              type="button"
              size="sm"
              onClick={handleRetryCheckout}
              disabled={submitting}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử lại
            </Button>
          )}
          {notice.action === 'REAUTH' && (
            <Button
              type="button"
              size="sm"
              onClick={handleReauth}
              disabled={submitting}
              className="h-8 gap-1.5 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Xác thực lại
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {isTopup ? (
            <TopupForm
              phone={topupPhone}
              amount={topupAmount}
              onPhoneChange={setTopupPhone}
              onAmountChange={setTopupAmount}
              disabled={submitting}
              error={topupError}
            />
          ) : (
            <BillPaymentForm
              provider={billProvider}
              customerCode={billCustomerCode}
              onProviderChange={(value) => {
                setBillProvider(value)
                setLookupRequest(null)
                setBillError(null)
              }}
              onCustomerCodeChange={(value) => {
                setBillCustomerCode(value)
                setLookupRequest(null)
                setBillError(null)
              }}
              onLookup={handleLookup}
              lookup={{
                data: billLookup.data,
                isLoading: billLookup.isLoading,
                isError: billLookup.isError,
                error: billLookup.error,
                refetch: () => {
                  void billLookup.refetch()
                }
              }}
              disabled={submitting}
              error={billError}
            />
          )}

          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-xs">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <span>
              Giao dịch tiện ích là mô phỏng học tập. Mọi thay đổi số dư được xác nhận bởi
              payment-service, không cập nhật cục bộ trên trình duyệt.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px] font-semibold">
              Nhãn mô phỏng
            </Badge>
            <span>Nạp điện thoại và thanh toán hóa đơn đều là giao dịch mô phỏng.</span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <PaymentSummary
            balance={balance}
            amount={currentAmount}
            discount={currentDiscount}
            serviceName={serviceName}
            insufficient={insufficient}
            submitting={submitting}
            onPay={handlePay}
          />
        </div>
      </div>

      <PinModal
        open={pinOrder !== null}
        onOpenChange={(open) => {
          if (!open) setPinOrder(null)
        }}
        title="Xác thực mã PIN thanh toán"
        description={
          pinOrder
            ? `Xác nhận thanh toán ${formatVnd(pinOrder.amount)} cho ${pinOrder.type === 'TELCO_TOPUP' ? `số ${pinOrder.target}` : `hóa đơn ${pinOrder.target}`}.`
            : undefined
        }
        paymentId={pinOrder?.paymentId ?? undefined}
        amount={pinOrder?.amount}
        onSuccess={(transactionToken) => {
          void handlePinSuccess(transactionToken)
        }}
        onCancel={() => setPinOrder(null)}
      />
    </>
  )
}
