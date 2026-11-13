# Tài Liệu Bàn Giao Kỹ Thuật: Feature Auth & PinModal (Nhiệm vụ Đ18 - Đ20)

> **Người phụ trách**: Đạt (@dat - Lead Security & Gateway)  
> **Dành cho**: Khoa (Payment/Transfer), Hữu (Funding/Withdraw), Nguyên (Utilities)  
> **Trạng thái**: Hoàn thành 100% kết nối API thật, Typecheck 0 lỗi, Unit tests pass 100%.

---

## 1. Các Trang & Component Đã Dựng & Hoàn Thiện

### 1.1. Routes & Màn hình chính
- `/sign-in`: `SignInPage` — Hỗ trợ đăng nhập kép bằng Email hoặc Username, có tích hợp trực tiếp **Mã QR thật** (`qrcode.react`) polling tự động 2s.
- `/sign-up`: `SignUpPage` — Đăng ký tài khoản người dùng mới kết nối API thật `POST /api/auth/signup`.
- `/qr-login`: `QrLoginPage` — Trang chuyên dụng đăng nhập mã QR với đếm ngược thời gian thực 120s.
- `/app/profile` (Tab "Bảo mật & PIN"): `ProfilePage` — Kiểm tra trạng thái mã PIN thật, thiết lập mã PIN lần đầu (`/api/auth/pin/setup`) và đổi mã PIN giao dịch (`/api/auth/pin/change`).

### 1.2. Component Dùng Chung (`features/auth/components`)
- `<PinModal />` (`features/auth/components/PinModal.tsx`): Popup nhập mã PIN 6 số có bàn phím số, tự động chuyển ô, che giấu ký tự, xử lý khóa tài khoản khi nhập sai 5 lần (`PIN_LOCKED`), và trả về `transactionToken` (ES256) dùng 1 lần trong 60 giây.

---

## 2. Danh Sách Endpoint & API Thật Đã Gắn

Tất cả API được đóng gói chuẩn tại `src/features/auth/api/auth.api.ts`:

| STT | Phương thức | Endpoint | Chức năng | Trả về |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `POST` | `/api/auth/signin` | Đăng nhập tài khoản (Email / Username) | `{ accessToken, user }` + HTTP-Only Cookie |
| 2 | `POST` | `/api/auth/signup` | Đăng ký tài khoản ví mới | `{ user }` |
| 3 | `POST` | `/api/auth/signout` | Đăng xuất và xóa phiên | `{ message }` |
| 4 | `POST` | `/api/auth/refresh` | Làm mới Access Token | `{ accessToken }` |
| 5 | `GET` | `/api/auth/pin/status` | Kiểm tra trạng thái mã PIN | `{ hasPin, isLocked, lockedUntil }` |
| 6 | `POST` | `/api/auth/pin/setup` | Thiết lập mã PIN lần đầu | `{ success: true }` |
| 7 | `POST` | `/api/auth/pin/change` | Đổi mã PIN giao dịch 6 số | `{ success: true }` |
| 8 | `POST` | `/api/auth/pin/verify` | Xác thực PIN nhận Transaction Token | `{ transactionToken, expiresInSeconds: 60 }` |
| 9 | `POST` | `/api/auth/qr-login/init` | Khởi tạo phiên mã QR mới (120s) | `{ qrId, nonce, pollSecret, expiresAt }` |
| 10 | `GET` | `/api/auth/qr-login/:id/status` | Polling trạng thái phiên QR | `{ status: 'PENDING' \| 'APPROVED' \| 'REJECTED' }` |
| 11 | `POST` | `/api/auth/qr-login/confirm` | Xác nhận duyệt phiên QR (kèm Token) | `{ message }` |

---

## 3. Hợp Đồng Tích Hợp `<PinModal />` Cho Đồng Đội

> ⚠️ **BẮT BUỘC ĐỌC KỸ TRƯỚC KHI GẮN VÀO CHUYỂN TIỀN / RÚT TIỀN / TIỆN ÍCH**

### 3.1. Bảng Props của `<PinModal />`
```tsx
import { PinModal } from '@/features/auth/components/PinModal'

interface PinModalProps {
  // Trạng thái hiển thị modal
  open: boolean

  // Hàm callback khi modal đóng/mở (ví dụ đóng do bấm nút X hoặc bấm ngoài)
  onOpenChange?: (open: boolean) => void

  // BẮT BUỘC: Mã giao dịch (paymentId hoặc transactionId)
  paymentId: string

  // BẮT BUỘC: Số tiền giao dịch (string hoặc number) để Backend khóa cứng Token vào đúng số tiền này
  amount: string | number

  // BẮT BUỘC: Callback khi người dùng nhập đúng PIN và nhận transactionToken 60s từ Backend
  onSuccess: (transactionToken: string) => void

  // Tùy chọn: Callback khi người dùng bấm nút Hủy
  onCancel?: () => void
}
```

### 3.2. Đoạn Code Mẫu Chuẩn Cho Khoa / Hữu / Nguyên

Dưới đây là mẫu chuẩn để nhúng vào màn hình Chuyển tiền (`TransferPage`), Rút tiền (`WithdrawPage`) hoặc Thanh toán hóa đơn (`UtilitiesPage`):

```tsx
import { useState } from 'react'
import { PinModal } from '@/features/auth/components/PinModal'
import { toast } from 'sonner'

export function MyTransactionFeature() {
  const [showPinModal, setShowPinModal] = useState(false)
  const [currentPaymentId, setCurrentPaymentId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('50000')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Khi người dùng bấm nút "Xác nhận chuyển / Rút tiền / Thanh toán"
  const handleInitiatePayment = () => {
    // Tạo hoặc lấy mã giao dịch tạm thời (ví dụ: UUID hoặc mã đơn hàng)
    const paymentId = crypto.randomUUID()
    setCurrentPaymentId(paymentId)
    // Mở popup nhập mã PIN
    setShowPinModal(true)
  }

  // 2. Nhận transactionToken từ PinModal sau khi nhập đúng 6 số PIN
  const handlePinSuccess = async (transactionToken: string) => {
    setShowPinModal(false)
    setIsSubmitting(true)

    try {
      // Gọi API thực hiện giao dịch của service bạn, đính kèm transactionToken vào body hoặc header
      /*
      await paymentApi.confirmTransfer({
        paymentId: currentPaymentId,
        amount: paymentAmount,
        transactionToken // ⚠️ Gửi Token này lên backend để Backend kiểm chứng chữ ký ES256
      })
      */
      toast.success('Giao dịch đã được thực hiện thành công!')
    } catch (err) {
      toast.error('Thực hiện giao dịch thất bại. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <button onClick={handleInitiatePayment} disabled={isSubmitting}>
        Xác nhận thực hiện giao dịch
      </button>

      {/* Nhúng PinModal */}
      <PinModal
        open={showPinModal}
        onOpenChange={setShowPinModal}
        paymentId={currentPaymentId}
        amount={paymentAmount}
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPinModal(false)}
      />
    </div>
  )
}
```

---

## 4. Các Quy Ước An Toàn & Bảo Mật Bắt Buộc (Security Rules)

1. **Hiệu lực của `transactionToken`**:
   - Token được sinh bằng thuật toán mật mã **ES256**.
   - Chỉ có hiệu lực duy nhất **60 giây** (`expiresInSeconds: 60`).
   - Chỉ dùng được **1 lần duy nhất** (One-Time Token). Khi backend đã dùng để duyệt giao dịch thì token đó lập tức hết hiệu lực.
2. **CẤM lưu trữ `transactionToken` hoặc `PIN`**:
   - Tuyệt đối **KHÔNG lưu vào `localStorage`** hay `sessionStorage`.
   - Chỉ lưu tạm thời trong biến state (bộ nhớ RAM) và gửi ngay lên API.
3. **Cơ chế khóa an toàn (`PIN_LOCKED`)**:
   - Nếu người dùng nhập sai PIN 5 lần liên tiếp, tài khoản sẽ bị khóa giao dịch trong 30 phút.
   - `PinModal` đã được lập trình sẵn cơ chế tự động đếm ngược và khóa ô nhập, đồng đội không cần code thêm logic đếm lần sai.

---

## 5. Công Cụ Hỗ Trợ Kiểm Tra Chất Lượng Code (Code Quality Gates)

Để đảm bảo code của cả nhóm không bị lỗi khi gộp nhánh, Đạt đã viết sẵn các công cụ:
- **Kiểm tra biên dịch Typescript**: `npm run typecheck` (Bắt buộc 0 lỗi gạch đỏ).
- **Kiểm tra tiêu chuẩn Trang Mỏng**: `node scripts/check-thin-pages.mjs` (Cấm gọi `axios` và cấm dùng `Number()` tính tiền trong `src/pages`).
- **Giả lập điện thoại quét mã QR**: `node scripts/qr-confirm.mjs` (Dùng để duyệt đăng nhập QR tự động).
