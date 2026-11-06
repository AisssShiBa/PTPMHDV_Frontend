import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paymentService } from '@/features/payment/services/paymentService'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function TopupResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'LOADING' | 'SUCCESS' | 'FAILED'>('LOADING')
  const [message, setMessage] = useState('Đang kiểm tra trạng thái giao dịch...')
  const calledRef = useRef(false)

  useEffect(() => {
    const vnp_ResponseCode = searchParams.get('vnp_ResponseCode')
    const vnp_TxnRef = searchParams.get('vnp_TxnRef')

    if (calledRef.current) return
    calledRef.current = true

    if (vnp_ResponseCode !== '00') {
      setStatus('FAILED')
      setMessage('Thanh toán thất bại hoặc đã bị huỷ bởi người dùng.')
      return
    }

    if (vnp_TxnRef) {
      // FIX CHO LOCALHOST: Gọi giả lập IPN (Webhook) từ Frontend
      // Vì VNPAY không thể gọi http://localhost:3000 được, ta dùng luôn FE để đẩy query params này về BE đóng vai trò như Webhook.
      fetch(`http://localhost:3000/api/payments/topups/vnpay/ipn${window.location.search}`)
        .then(() => {
          // Sau khi giả lập Webhook gọi xong, gọi API poll trạng thái để lấy dữ liệu mới nhất
          return paymentService.getTopupStatus(vnp_TxnRef)
        })
        .then((res: any) => {
          if (res.status === 'APPROVED') {
            setStatus('SUCCESS')
            setMessage('Nạp tiền thành công! Tiền đã được cộng vào ví của bạn.')
          } else if (res.status === 'FAILED' || res.status === 'REJECTED' || res.status === 'EXPIRED') {
            setStatus('FAILED')
            setMessage('Giao dịch thất bại hoặc đã hết hạn.')
          } else {
            setStatus('SUCCESS')
            setMessage('Thanh toán thành công. Hệ thống đang xử lý cộng tiền...')
          }
        })
        .catch(() => {
          setStatus('SUCCESS')
          setMessage('Thanh toán thành công. Đang cập nhật số dư...')
        })
    } else {
      setStatus('SUCCESS')
      setMessage('Thanh toán thành công.')
    }
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center animate-in fade-in duration-300">
      {status === 'LOADING' && (
        <>
          <Loader2 className="size-16 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Đang xử lý...</h2>
        </>
      )}
      
      {status === 'SUCCESS' && (
        <>
          <CheckCircle2 className="size-20 text-emerald-500 mb-4" />
          <h2 className="text-3xl font-bold text-emerald-500 mb-2">Giao dịch thành công</h2>
        </>
      )}

      {status === 'FAILED' && (
        <>
          <XCircle className="size-20 text-rose-500 mb-4" />
          <h2 className="text-3xl font-bold text-rose-500 mb-2">Giao dịch thất bại</h2>
        </>
      )}
      
      <p className="text-muted-foreground text-lg mb-8">{message}</p>
      
      <button
        onClick={() => navigate('/wallet')}
        className="px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
      >
        Quay lại Ví của bạn
      </button>
    </div>
  )
}
