import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useTransferQuote } from './useTransferQuote'
import { useTransferCheckout } from './useTransferCheckout'
import { useTransferConfirmation } from './useTransferConfirmation'
import type { TransferReceiptData } from '../components/TransferReceipt'
import type { TransferFailureData } from '../components/TransferFailure'
import type { TransferQuoteProgress } from '../components/TransferQuoteReview'
import type { TransferStep } from '../components/TransferSteps'

interface TransferFlowInput {
  ownerId: string
  availableBalance: string
  recipient: { authUserId: string; maskedName: string } | null
  recipientQuery: string
  onRecipientChange: (value: string) => void
}

interface ReceiptSnapshot extends TransferReceiptData {
  ownerId: string
}

function useFlowState() {
  const [formStep, setFormStep] = useState<1 | 2>(1)
  const [amount, setAmount] = useState('50000')
  const [message, setMessage] = useState('Chuyển tiền FinVault')
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinDismissed, setPinDismissed] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null)
  return { formStep, setFormStep, amount, setAmount, message, setMessage,
    pinModalOpen, setPinModalOpen, pinDismissed, setPinDismissed, receipt, setReceipt }
}

type FlowState = ReturnType<typeof useFlowState>

function useErrorToast(message: string | null) {
  useEffect(() => { if (message) toast.error(message) }, [message])
}

function useTransferCore(input: TransferFlowInput, state: FlowState) {
  const quoteFlow = useTransferQuote({ destinationUserId: input.recipient?.authUserId ?? null,
    amount: state.amount, availableBalance: input.availableBalance })
  const checkoutFlow = useTransferCheckout({ destinationUserId: input.recipient?.authUserId ?? null,
    amount: state.amount, note: state.message, quote: quoteFlow.quote })
  const paymentId = checkoutFlow.checkoutPayment?.id ?? null
  const confirmation = useTransferConfirmation(paymentId)
  const { checkStatus } = confirmation
  const { checkoutPayment } = checkoutFlow
  useEffect(() => {
    if (checkoutPayment && confirmation.phase === 'idle'
      && (checkoutPayment.status !== 'PENDING' || Date.parse(checkoutPayment.holdExpiresAt) <= Date.now())) {
      void checkStatus()
    }
  }, [checkoutPayment, confirmation.phase, checkStatus])
  useErrorToast(quoteFlow.error)
  useErrorToast(checkoutFlow.error)
  useErrorToast(confirmation.phase === 'idle' ? confirmation.message : null)
  return { quoteFlow, checkoutFlow, confirmation, paymentId,
    locked: confirmation.isBusy || confirmation.phase === 'pending' }
}

type TransferCore = ReturnType<typeof useTransferCore>

function failureReason(status: string | null): string {
  if (status === 'EXPIRED') return 'Giao dịch đã hết thời gian hiệu lực.'
  if (status === 'CANCELLED') return 'Giao dịch đã bị hủy bỏ.'
  if (status === 'REFUNDED') return 'Giao dịch đã được hoàn tiền.'
  return 'Giao dịch không thành công hoặc bị từ chối từ hệ thống.'
}

function transferResult(input: TransferFlowInput, state: FlowState, core: TransferCore) {
  const { confirmation, paymentId, checkoutFlow } = core
  const receipt = state.receipt?.ownerId === input.ownerId && state.receipt.id === paymentId ? state.receipt : null
  const completedTxn: TransferReceiptData | null = confirmation.phase === 'success' && receipt ? {
    ...receipt, timestamp: confirmation.record?.createdAt ?? receipt.timestamp,
    amount: confirmation.record?.amount ?? receipt.amount, fee: confirmation.record?.fee ?? receipt.fee,
    message: confirmation.record?.note ?? receipt.message
  } : null
  const failedTxn: TransferFailureData | null = confirmation.phase === 'failed' && receipt ? {
    id: receipt.id, status: confirmation.status, reason: failureReason(confirmation.status)
  } : null
  const currentStep: TransferStep = completedTxn || failedTxn ? 3 : state.formStep
  const pinOpen = (confirmation.phase === 'idle' || confirmation.needsPin) && Boolean(receipt)
    && (state.pinModalOpen || (confirmation.needsPin && !state.pinDismissed))
  const processingState: TransferQuoteProgress | null = confirmation.phase === 'checking' || confirmation.phase === 'pending'
    ? { phase: 'confirm', isPolling: confirmation.phase === 'checking', message: confirmation.message }
    : checkoutFlow.processingMessage ? { phase: 'checkout', message: checkoutFlow.processingMessage } : null
  return { completedTxn, failedTxn, currentStep, pinOpen, processingState }
}

function formActions(input: TransferFlowInput, state: FlowState, core: TransferCore) {
  const { quoteFlow, checkoutFlow } = core
  const canEdit = () => !core.locked && checkoutFlow.resetCheckout()
  const handleAmountChange = (value: string) => {
    if (!canEdit()) return
    state.setAmount(value.replace(/\D/g, ''))
    quoteFlow.resetQuote()
  }
  const handleRecipientChange = (value: string) => {
    if (!canEdit()) return
    input.onRecipientChange(value)
    quoteFlow.resetQuote()
  }
  const handleMessageChange = (value: string) => { if (canEdit()) state.setMessage(value) }
  const handleRequestQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (core.locked) return
    if (await quoteFlow.requestQuote()) {
      state.setFormStep(2)
      toast.success('Báo giá giao dịch thành công.')
    }
  }
  const handleRefreshQuote = async () => {
    if (core.locked) return
    if (await quoteFlow.refreshQuote()) toast.success('Đã cập nhật báo giá giao dịch mới.')
    else if (!checkoutFlow.hasUnresolvedCheckout && !checkoutFlow.checkoutPayment) state.setFormStep(1)
  }
  const handleResetNewTransfer = () => {
    if (!canEdit()) return
    state.setFormStep(1)
    quoteFlow.resetQuote()
    state.setAmount('50000')
    state.setMessage('Chuyển tiền FinVault')
    state.setReceipt(null)
    state.setPinDismissed(false)
    state.setPinModalOpen(false)
  }
  const handleBack = () => { if (!core.locked && !checkoutFlow.hasUnresolvedCheckout) state.setFormStep(1) }
  return { handleAmountChange, handleRecipientChange, handleMessageChange, handleRequestQuote,
    handleRefreshQuote, handleResetNewTransfer, handleBack }
}

function paymentActions(input: TransferFlowInput, state: FlowState, core: TransferCore) {
  const handleStartCheckout = async () => {
    if (core.locked) return
    const result = await core.checkoutFlow.checkout()
    if (!result) return
    const snapshot: ReceiptSnapshot = {
      ownerId: input.ownerId, id: result.id, timestamp: new Date().toISOString(),
      recipientName: input.recipient?.maskedName || 'Người nhận', recipientPhone: input.recipientQuery,
      amount: result.amount, fee: core.quoteFlow.quote?.fee ?? '0', message: state.message.trim() || 'Chuyển tiền FinVault'
    }
    state.setReceipt(previous => previous?.ownerId === input.ownerId && previous.id === result.id ? previous : snapshot)
    if (result.status !== 'PENDING' || Date.parse(result.holdExpiresAt) <= Date.now()) return
    state.setPinDismissed(false)
    state.setPinModalOpen(true)
  }
  const handlePinSuccess = async (token: string) => {
    state.setPinModalOpen(false)
    state.setPinDismissed(false)
    await core.confirmation.confirm(token)
  }
  const handlePinCancel = () => { state.setPinModalOpen(false); state.setPinDismissed(true) }
  return { handleStartCheckout, handlePinSuccess, handlePinCancel, setPinModalOpen: state.setPinModalOpen }
}

export function useTransferFlow(input: TransferFlowInput) {
  const state = useFlowState()
  const core = useTransferCore(input, state)
  return {
    amount: state.amount, message: state.message,
    quote: core.quoteFlow.quote, quoteCountdown: core.quoteFlow.quoteCountdown,
    isQuoting: core.quoteFlow.isQuoting, limitExceededError: core.quoteFlow.limitExceededError,
    checkoutPayment: core.checkoutFlow.checkoutPayment, isCheckingOut: core.checkoutFlow.isCheckingOut,
    hasUnresolvedCheckout: core.checkoutFlow.hasUnresolvedCheckout,
    isConfirming: core.confirmation.isBusy, confirmationLocked: core.locked,
    needsPin: core.confirmation.needsPin, checkStatus: core.confirmation.checkStatus,
    ...transferResult(input, state, core),
    ...formActions(input, state, core),
    ...paymentActions(input, state, core)
  }
}
