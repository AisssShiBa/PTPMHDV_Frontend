# BÁO CÁO BÀN GIAO VÀ NGHIỆM THU NHIỆM VỤ K18: WEB — VÍ, CHUYỂN TIỀN, LỊCH SỬ

- **Dự án**: FinVault Web (ví điện tử mô phỏng).
- **Nhánh Git**: `feat/k18-web-wallet`.
- **Phạm vi nhiệm vụ**: K18 — Ví, Chuyển tiền P2P, Sổ cái & Lịch sử biến động số dư.

---

## 1. TỔNG QUAN CÁC TRANG VÀ THÀNH PHẦN HOÀN TẤT

### 1.1. `DashboardPage` ([`src/pages/DashboardPage.tsx`](file:///d:/PTPMHDV_Frontend/src/pages/DashboardPage.tsx))
- **Số dư ví thực tế**: Tích hợp gọi `GET /api/wallets/me` qua `useWalletMe()`. Hiển thị số dư khả dụng (`availableBalance`), số dư đang giữ (`heldBalance`), tiền tệ VND.
- **Hạn mức giao dịch**: Hiển thị hạn mức ngày và hạn mức tháng theo đúng KYC Tier của người dùng (`kycTier` 0, 1, 2). Thanh tiến trình và tỷ lệ phần trăm được tính toán chính xác bằng `BigInt`.
- **Giao dịch gần đây**: Tích hợp gọi `GET /api/wallets/me/ledger?limit=5` qua `useWalletLedger({ limit: 5 })`.
- **Xử lý 4 trạng thái UI**: Loading (skeleton), Error (thông báo lỗi và nút thử lại), Empty (khi chưa có giao dịch), Success.

### 1.2. `TransferPage` ([`src/pages/TransferPage.tsx`](file:///d:/PTPMHDV_Frontend/src/pages/TransferPage.tsx))
Quy trình chuyển tiền P2P 3 bước an toàn:
1. **Bước 1: Tra cứu người nhận & Báo giá**:
   - Tra cứu người nhận bảo mật qua `GET /api/users/lookup?q=...` (hỗ trợ hủy request bằng `AbortController`, che tên hiển thị `maskedName`, lỗi 404 chung không lộ ID nội bộ).
   - Ô nhập tiền chỉ nhận chữ số nguyên, từ chối số âm, số thập phân, 0, hoặc vượt quá số dư khả dụng.
   - Gọi lấy báo giá qua `POST /api/payments/p2p/quote` (phí 0đ, thời hạn hiệu lực 60 giây).
   - Xử lý mã lỗi `422 LIMIT_EXCEEDED` theo 3 cấp (`PER_TXN`, `PER_DAY`, `PER_MONTH`), hiển thị rõ ràng số tiền còn lại và nút nâng cấp KYC.
2. **Bước 2: Xác nhận báo giá, Checkout & Xác thực PIN**:
   - Hiển thị đồng hồ đếm ngược 60 giây của báo giá. Nếu quá 60s, nút bị khóa kèm thông báo yêu cầu lấy lại báo giá mới.
   - Bấm "Xác nhận chuyển tiền" $\rightarrow$ gọi `POST /api/payments/p2p/checkout` gửi kèm header `Idempotency-Key` (UUID v4 duy nhất cho mỗi ý định chuyển tiền).
   - Server khóa giữ tiền (hold) trong 5 phút $\rightarrow$ mở `PinModal` nhập mã PIN 6 số ảo.
   - Gọi `POST /api/auth/pin/verify` xác thực PIN với `{ pin, paymentId, amount }` $\rightarrow$ nhận `transactionToken` (JWT sống 60 giây, dùng 1 lần).
   - Mã PIN được tự động xóa khỏi bộ nhớ ngay lập tức sau khi gửi; xử lý chuẩn các lỗi `PIN_INVALID` (hiển thị số lần thử còn lại), `PIN_LOCKED` (đếm ngược thời gian mở khóa), `PIN_NOT_SET`.
   - Gọi `POST /api/payments/:id/confirm` qua header `X-Transaction-Token` để hoàn tất thanh toán.
   - Nếu `transactionToken` hết hạn 60s (`TXN_TOKEN_EXPIRED`), hệ thống giữ nguyên `paymentId` và mở lại `PinModal` cho người dùng nhập lại mã PIN mà không tạo checkout mới.
3. **Bước 3: Biên lai chuyển tiền thành công hoặc Màn thất bại**:
   - Màn biên lai thành công với đầy đủ mã giao dịch, số tiền, thông tin người nhận, thời gian UTC+7, nút sao chép và nút in/tải biên lai.
   - Cập nhật tức thì số dư ví qua `queryClient.invalidateQueries(walletKeys.all)`.

### 1.3. Xử lý Timeout và An toàn mạng (Safe Retry & Polling)
- **Timeout tại Bước Checkout**:
  - Khi gặp lỗi mạng hoặc timeout (`ECONNABORTED`, 504, 502, 503, 408), giao diện KHÔNG hiển thị "thất bại".
  - Hiển thị banner cảnh báo màu vàng: *"Giao dịch đang được xử lý, vui lòng không thực hiện lại"*.
  - Nút *"Thử lại"* gửi lại checkout với CÙNG khóa `Idempotency-Key` (nhận lại `replayed: true` từ server).
- **Timeout tại Bước Confirm**:
  - Tuyệt đối KHÔNG gọi lại confirm bằng `transactionToken` cũ (tránh lỗi `409 TXN_TOKEN_REUSED`).
  - Hệ thống tự động chuyển sang cơ chế Polling `GET /api/payments/:id` với exponential backoff (1s, 2s, 4s, trần thời gian 30s).
  - Khi poll ra trạng thái cuối (`SUCCESS` $\rightarrow$ hiển thị biên lai; `FAILED`/`EXPIRED`/`CANCELLED` $\rightarrow$ hiển thị màn thất bại).
  - Nếu quá trần 30s mà trạng thái vẫn `PENDING`: giữ thông báo "Giao dịch đang xử lý", cung cấp nút "Kiểm tra lại" và liên kết tới trang Lịch sử giao dịch.

### 1.4. `TransactionsPage` ([`src/pages/TransactionsPage.tsx`](file:///d:/PTPMHDV_Frontend/src/pages/TransactionsPage.tsx))
- **Gọi API sổ cái qua Cursor**: `useInfiniteWalletLedger(20)` gọi `GET /api/wallets/me/ledger?limit=20&cursor=...`.
- Ghép trang phân trang cursor tuần tự không trùng lặp `id`, tự động ẩn nút "Tải thêm giao dịch" khi hết trang và hiển thị thông báo kết thúc.
- Định dạng tiền tệ hoàn toàn bằng `formatVnd()` (BigInt), thời gian hiển thị chuẩn UTC+7, nhãn giao dịch trực quan (+ màu xanh, - màu đỏ/xám), bảo mật không lộ ID nội bộ của người khác.
- Modal chi tiết giao dịch kèm nút sao chép mã tham chiếu.

---

## 2. QUY TẮC TIỀN TỆ & GỠ BỎ ROUTE CŨ

1. **Chuỗi số nguyên VND & BigInt duy nhất**:
   - Toàn bộ giá trị tiền tệ từ API đến UI là kiểu `string` số nguyên VND.
   - Toàn bộ phép tính cộng, trừ, so sánh, kiểm tra hạn mức được thực hiện bằng `BigInt` thông qua thư viện [`src/lib/format.ts`](file:///d:/PTPMHDV_Frontend/src/lib/format.ts) và [`src/lib/money.ts`](file:///d:/PTPMHDV_Frontend/src/lib/money.ts).
   - Cấm triệt để `Number()`, `parseFloat()`, `parseInt()`, `.toFixed()` trên mọi trường tiền.
   - Kiểm tra tĩnh tự động: [`src/test/static-money-rules.test.ts`](file:///d:/PTPMHDV_Frontend/src/test/static-money-rules.test.ts).
2. **Gỡ bỏ toàn bộ route cũ và route bị gateway chặn**:
   - Gỡ bỏ hoàn toàn route G10 cũ `POST /wallets/:userId/transfer`.
   - Gỡ bỏ các route `POST /wallets/:userId/credit`, `POST /wallets/:userId/debit`, `GET /wallets/:userId/history`, `GET /wallets/:userId/balance`.
   - Toàn bộ thao tác ví chuyển sang hai endpoint chuẩn gateway duy nhất: `GET /api/wallets/me` và `GET /api/wallets/me/ledger`.
   - Cập nhật [`src/features/wallet/components/RealBalanceCard.tsx`](file:///d:/PTPMHDV_Frontend/src/features/wallet/components/RealBalanceCard.tsx) và [`src/features/wallet/components/TopupModal.tsx`](file:///d:/PTPMHDV_Frontend/src/features/wallet/components/TopupModal.tsx).

---

## 3. KẾT QUẢ NGHIỆM THU KỊCH BẢN A1, A2, A9 QUA GIAO DIỆN

Bộ kiểm thử tự động toàn diện được cài đặt tại [`src/test/acceptance-k18.test.tsx`](file:///d:/PTPMHDV_Frontend/src/test/acceptance-k18.test.tsx):

| Mã | Kịch bản nghiệm thu | Kỳ vọng | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **A1** | 20 request chuyển song song, mỗi cái 60.000đ trên ví 100.000đ | Đúng 1 request thành công, 19 request bị từ chối với lỗi `INSUFFICIENT_FUNDS`, số dư ví cuối cùng còn đúng 40.000đ | 1 thành công (201), 19 từ chối 422, số dư hiển thị trên giao diện là `40.000 ₫` | **PASS** |
| **A2** | Bấm xác nhận 2 lần liên tiếp cùng `Idempotency-Key` | Chỉ tạo đúng 1 payment trên server, lần 2 trả về `replayed: true`, UI không tạo giao dịch thứ hai và không crash | Server trả về cùng `paymentId`, `replayed: true`, UI mở đúng 1 luồng nhập PIN duy nhất | **PASS** |
| **A9 (a)** | User Chi (KYC Cấp 0, ví 1.100.000đ) chuyển 600.000đ | Bị từ chối 422 `LIMIT_EXCEEDED` với `limitType: PER_TXN`, hiển thị "Bạn còn được chuyển tối đa 200.000 ₫", số dư ví giữ nguyên 1.100.000đ | Giao dịch bị chặn ở Bước 1, hiển thị thông báo hạn mức và còn lại `200.000 ₫`, số dư ví nguyên vẹn | **PASS** |
| **A9 (b)** | Chuyển 2 x 200.000đ thành công, lần thứ 3 chuyển tiếp 200.000đ | Lần 1 và 2 thành công (đã dùng 400.000đ / 500.000đ ngày). Lần thứ 3 bị từ chối 422 `LIMIT_EXCEEDED` với `limitType: PER_DAY`, hiển thị còn lại 100.000đ | Lần 3 bị chặn tại giao diện, hiển thị hạn mức ngày và còn lại `100.000 ₫`, chi tiêu dừng ở 400.000đ | **PASS** |

---

## 4. DANH SÁCH COMMITS TRÊN NHÁNH `feat/k18-web-wallet`

1. **`153ba76`** - `docs(web): chot thiet ke vi, chuyen tien, lich su [K18-0]`
2. **`b544b77`** - `feat(web): tien ich tien BigInt va api-client chuan K18 [K18-1]`
3. **`a806ac2`** - `feat(web): tich hop so du va han muc DashboardPage [K18-2]`
4. **`447e9f7`** - `feat(web): transfer step 1 recipient lookup and quote [K18-3]`
5. **`50de632`** - `feat(web): transfer step 2 checkout pin confirm [K18-4]`
6. **`bc00847`** - `feat(web): safe retry and timeout polling [K18-5]`
7. **`d56359d`** - `feat(web): transactions page cursor ledger [K18-6]`
8. **`05a13d1`** - `refactor(web): remove legacy wallet routes and ban Number for money [K18-7]`
9. **`dbf4d13`** - `test(web): acceptance scenarios A1 A2 A9 through ui [K18-8]`
10. **`HEAD`** - `docs(web): hoan tat tai lieu va bao cao nghiem thu K18 [K18-9]`

---

## 5. TỔNG KẾT KIỂM TRA CHẤT LƯỢNG

- **Vitest Unit & Acceptance Tests**: **11 test files, 59/59 tests PASS** (100%).
- **Package `@finvault/api-client` Tests**: **14/14 tests PASS** (100%).
- **TypeScript Strict Check (`tsc -b --noEmit`)**: **0 errors (Exit code 0)**.
- **Production Build (`tsc -b && vite build`)**: **Thành công 100% trong 1.70s**, 2,128 modules transformed.
