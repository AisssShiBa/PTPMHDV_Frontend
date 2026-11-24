import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Wallet } from 'lucide-react'
import { PinModal, useAuthStore } from '@/features/auth'
import { useWalletMe } from '@/features/wallet'
import {
  useTransferFlow,
  TransferReceipt,
  TransferFailure,
  TransferForm,
  TransferQuoteReview,
  TransferSteps
} from '@/features/payment'
import { useRecipientLookup } from '@/features/user'
import { formatVnd } from '@/lib/format'
import { toast } from 'sonner'

export function TransferPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const authUserId = user?.id || ''

  // Số dư ví thực tế từ GET /api/wallets/me
  const { data: wallet } = useWalletMe()
  const availableBalance = wallet?.availableBalance ?? wallet?.balance ?? user?.balance ?? '0'

  // Hook tra cứu người nhận chuẩn bảo mật (404 / 429 cooldown)
  const {
    query: recipientQuery,
    changeQuery: setRecipientQuery,
    recipient,
    error: recipientError,
    loading: isLookingUp,
    remaining: cooldownRemaining,
    lookup: triggerLookup
  } = useRecipientLookup(authUserId)

  const [copiedTxn, setCopiedTxn] = useState(false)
  const {
    amount, message, quote, quoteCountdown, isQuoting, limitExceededError,
    checkoutPayment, isCheckingOut, hasUnresolvedCheckout, isConfirming, confirmationLocked,
    needsPin, checkStatus, completedTxn, failedTxn, currentStep, pinOpen, processingState,
    handleAmountChange, handleRecipientChange, handleMessageChange, handleRequestQuote,
    handleRefreshQuote, handleResetNewTransfer, handleBack,
    handleStartCheckout, handlePinSuccess, handlePinCancel, setPinModalOpen
  } = useTransferFlow({
    ownerId: authUserId,
    availableBalance,
    recipient,
    recipientQuery,
    onRecipientChange: setRecipientQuery
  })

  // Sao chép mã giao dịch
  const handleCopyTxnId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedTxn(true)
    toast.success('Đã sao chép mã giao dịch vào bộ nhớ tạm')
    setTimeout(() => setCopiedTxn(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header khu vực làm việc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Chuyển tiền P2P tức thì 24/7</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Chuyển tiền nội bộ & liên ví
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Giao dịch tức thì, miễn phí trọn đời tới mọi người dùng trong hệ sinh thái FinVault
          </p>
        </div>

        {/* Thẻ số dư ví hiện tại */}
        <div className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-2xl shadow-sm self-start sm:self-auto">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Số dư khả dụng</div>
            <div className="text-base font-bold text-foreground">{formatVnd(availableBalance)}</div>
          </div>
        </div>
      </div>

      <TransferSteps currentStep={currentStep} />

      {/* ======================================================== */}
      {/* BƯỚC 1: NHẬP THÔNG TIN NGƯỜI NHẬN, SỐ TIỀN & LẤY QUOTE   */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <TransferForm
          recipient={{
            query: recipientQuery,
            name: recipient?.maskedName ?? null,
            error: recipientError,
            loading: isLookingUp,
            cooldown: cooldownRemaining,
            onChange: handleRecipientChange,
            onLookup: triggerLookup
          }}
          transfer={{
            amount,
            message,
            availableBalance,
            limitError: limitExceededError,
            onAmountChange: handleAmountChange,
            onMessageChange: handleMessageChange
          }}
          isQuoting={isQuoting}
          onSubmit={handleRequestQuote}
        />
      )}

      {/* ======================================================== */}
      {/* BƯỚC 2: XÁC NHẬN BÁO GIÁ (60S) & CHUẨN BỊ NHẬP PIN       */}
      {/* ======================================================== */}
      {currentStep === 2 && quote && (
        <TransferQuoteReview
          quote={quote}
          countdown={quoteCountdown}
          details={{
            recipientName: recipient?.maskedName ?? 'Người nhận',
            recipientQuery,
            availableBalance,
            message
          }}
          activity={{
            isCheckingOut,
            isConfirming,
            isQuoting,
            hasCheckoutPayment: Boolean(checkoutPayment),
            hasUnresolvedCheckout,
            confirmationLocked
          }}
          progress={processingState}
          onRefreshQuote={handleRefreshQuote}
          onCheckout={handleStartCheckout}
          onCheckStatus={() => void checkStatus()}
          onBack={handleBack}
        />
      )}

      {/* ======================================================== */}
      {/* BƯỚC 3: BIÊN LAI CHUYỂN TIỀN THÀNH CÔNG                  */}
      {/* ======================================================== */}
      {currentStep === 3 && completedTxn && (
        <TransferReceipt
          receipt={completedTxn}
          copied={copiedTxn}
          onCopy={handleCopyTxnId}
          onNewTransfer={handleResetNewTransfer}
          onPrint={() => window.print()}
          onHome={() => navigate('/app')}
        />
      )}

      {/* ======================================================== */}
      {/* BƯỚC 3: MÀN HÌNH GIAO DỊCH THẤT BẠI                      */}
      {/* ======================================================== */}
      {currentStep === 3 && failedTxn && (
        <TransferFailure
          failure={failedTxn}
          onNewTransfer={handleResetNewTransfer}
          onViewHistory={() => navigate('/app/transactions')}
        />
      )}

      {/* Shared PIN Modal: Kích hoạt tại Bước 2 */}
      {checkoutPayment && (
        <PinModal
          key={`${checkoutPayment.id}:${needsPin ? 'renew' : 'initial'}`}
          open={pinOpen}
          onOpenChange={setPinModalOpen}
          title="Xác thực mã PIN giao dịch"
          description={`Xác nhận chuyển ${formatVnd(checkoutPayment.amount)} tới ${recipient?.maskedName || 'người nhận'}.`}
          paymentId={checkoutPayment.id}
          amount={checkoutPayment.amount}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      )}
    </div>
  )
}

export default TransferPage
