# Bàn giao Feature: Utilities (Nạp điện thoại & Thanh toán hóa đơn)

## Cập nhật N16/N19 ngày 23/11/2026

Đã thêm UtilityOutbox và migration `202611230001_utility_outbox`. SUCCESS,
FAILED/REFUND_FAILED và REFUNDED ghi sự kiện cùng transaction với trạng thái/lịch
sử. Publisher có lease, SKIP LOCKED, broker confirm và eventId ổn định khi retry.
Notification đã đăng ký schema/binding/handler ba utility.order_*; Utilities
nhận payment.refunded để cập nhật REFUNDED ngay, giữ recovery làm đường dự phòng.

42 test Utilities trên PostgreSQL riêng PASS, gồm rollback thật khi outbox lỗi,
claim đồng thời và lost acknowledgement/dedupe. Live UI T1/T2 kiểm tiền, trạng
thái và thông báo. A7 dừng RabbitMQ, chạy recovery thật cho provider timeout,
khôi phục broker và replay cùng eventId: chỉ một Notification. Scope utilities kiểm cả DB và owner WebSocket: hai mẫu 372ms/90ms,
không phải p95. File result ghi rõ transport; không gọi API-only là UI test.

Deploy consumer/schema trước, rồi migration và Utilities image mới. Không tạo
sự kiện giả cho đơn lịch sử; không sửa chiết khấu 3% thành giảm tiền ví.


## Hiện trạng bàn giao 23/11/2026 — N16

Nguyên → Đạt/Hữu/Khoa. Phần kỹ thuật phía dưới mô tả luồng hiện có; các trạng thái nghiệm thu lịch sử không thay T1/T2 trên revision mới.

- `/app/utilities` → UtilitiesWorkspace qua `features/utilities/index.ts`. Adapter `features/utilities/api.ts`, TanStack Query trong `queries.ts`, factory `utilitiesKeys`; giữ nhãn Mô phỏng.
- POST `/api/utilities/topup`, GET `/api/utilities/bills/lookup`, POST `/api/utilities/bills/pay`, GET `/api/utilities/orders/{id}`; confirm qua Payment với X-Transaction-Token. Amount là string; bill dùng số tiền lookup, không cho UI tự thay.
- Create giữ Idempotency-Key theo intent, khóa gửi; PinModal dùng paymentId/amount server trả. Unknown confirm chuyển đọc order, không gửi lại token. Order polling dừng ở terminal; invalidate Wallet khi trạng thái xác định.
- Các trạng thái loading/error/empty/success của ví/lookup và các trạng thái đơn được mô tả bên dưới. REFUNDED cần đối chiếu tiền thật/ledger, không chỉ đổi nhãn UI. Chiết khấu 3% hiện ghi nhận, không phải giảm tiền thanh toán.
- Gateway source đã định tuyến utilities đúng service. Không dùng câu hỏi “có cần service token FE riêng” làm blocker: Web gửi Bearer qua Axios; Gateway tự thiết lập identity nội bộ.
- Kiểm web: T1 số đuôi 00 thành công; T2 đuôi 11 theo fixture provider dẫn tới hoàn; kiểm balance/ledger, double-click và retry cùng key. Chưa có T1/T2 UI mới trong lượt tài liệu; không tự kết luận event utility đã phát chỉ vì có mapper.
- Còn mở: recovery reload mất orderId khi chưa có list API đã xác nhận, và kiểm event/latency theo N19. [Contract hiện tại](../CONTRACT_OPEN_QUESTIONS.md).

### Chi tiết triển khai và ghi nhận trước cập nhật

---

## 1. Trang và Component đã dựng

- **Routes**:
  - `/app/utilities`: `UtilitiesPage` (trang mỏng) → `UtilitiesWorkspace`
- **Components** (`features/utilities/components`):
  - `UtilitiesWorkspace`: điều phối toàn bộ luồng — kiểm tra số dư ví, 2 tab `Nạp điện thoại di động` / `Thanh toán hóa đơn sinh hoạt`, gọi checkout, mở `PinModal`, xác nhận thanh toán, theo dõi đơn và hiển thị trạng thái cuối. Giữ `Idempotency-Key` trong `useRef` (bộ nhớ), khóa nút khi đang gửi.
  - `TopupForm`: nhập số điện thoại (chuẩn hoá `+84` → `0`) và chọn 1 trong 6 mệnh giá backend cho phép; hiển thị nhãn **Mô phỏng** và chiết khấu 3% chỉ để tham khảo.
  - `BillPaymentForm`: chọn nhà cung cấp (EVN/SAWACO/FPT), nhập mã khách hàng, gọi tra cứu hóa đơn thật; hiển thị thông tin hóa đơn trả về và nhãn **Mô phỏng**.
  - `PaymentSummary`: tóm tắt nguồn tiền, số tiền gốc, chiết khấu ghi nhận, phí 0 ₫, tổng thanh toán, số dư còn lại dự kiến; chặn thanh toán khi ví không đủ (so sánh bằng `BigInt` trong `lib/format`).
  - `OrderStatusPanel`: hiển thị trạng thái đơn theo state machine backend, làm rõ `REFUNDED` / `REFUND_FAILED`, mã đơn, mã nhà cung cấp, thời gian tạo/cập nhật, nút "Thực hiện giao dịch khác".
- **Hook / logic** (`features/utilities`):
  - `queries.ts`: `useBillLookup`, `useUtilityOrder` (polling bằng `refetchInterval`), `useCreateTopup`, `usePayBill`, `useConfirmUtilityPayment`.
  - `schemas.ts`: Zod cho số điện thoại, mệnh giá, mã nhà cung cấp/mã khách hàng, số tiền hóa đơn; `discountForAmount`, `topupIntent`/`billPayIntent`, `buildBillPayPayload`.
  - `idempotency.ts`: cùng nội dung giao dịch → dùng lại key; đổi nội dung → sinh key mới.
  - `errors.ts`: map mã lỗi backend sang tiếng Việt và phân loại lỗi có thể thử lại.
  - `status.ts`: nhãn trạng thái, trạng thái kết thúc, dừng polling.

## 2. Hook / API đã thay

| Tên | File định nghĩa | Endpoint | Phương thức | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `utilitiesApi.topup` | `features/utilities/api.ts` | `/api/utilities/topup` | POST | Body `{ phone, amount }`; bắt buộc header `Idempotency-Key` |
| `utilitiesApi.lookupBill` | cùng file | `/api/utilities/bills/lookup?provider&customerCode` | GET | Trả `{ provider, customerCode, customerName, amount, period }` |
| `utilitiesApi.payBill` | cùng file | `/api/utilities/bills/pay` | POST | Body `{ provider, customerCode, amount }`; `amount` **chỉ lấy từ kết quả tra cứu** |
| `utilitiesApi.getOrder` | cùng file | `/api/utilities/orders/{orderId}` | GET | `orderId` được `encodeURIComponent`; chỉ chủ đơn xem được |
| `useBillLookup` | `features/utilities/queries.ts` | `/api/utilities/bills/lookup` | GET | Key `utilitiesKeys.billLookup(request)`; `retry: false` |
| `useUtilityOrder` | cùng file | `/api/utilities/orders/{id}` | GET | Poll 2 giây/lần, dừng ở `SUCCESS`/`FAILED`/`REFUNDED`/`REFUND_FAILED` |
| `useCreateTopup` / `usePayBill` | cùng file | như trên | POST | Ghi đơn vừa tạo vào cache `utilitiesKeys.order(orderId)` |
| `useConfirmUtilityPayment` | cùng file | `/api/payments/{paymentId}/confirm` | POST | Dùng `paymentId` + `amount` backend trả về; token giao dịch chỉ nằm trong bộ nhớ |

### Luồng thanh toán

1. Người dùng nhập form → validate → so sánh số dư → gọi `topup` hoặc `bills/pay` kèm `Idempotency-Key`.
2. Đơn trả về có `paymentId` + `amount`; mở `PinModal` với đúng hai giá trị này.
3. `PinModal` xác thực PIN, trả `transactionToken` (chỉ truyền thẳng vào `paymentApi.confirmPayment`, không lưu state/storage).
4. Gọi `POST /api/payments/{paymentId}/confirm` với header `X-Transaction-Token`.
5. Poll `GET /api/utilities/orders/{orderId}` đến trạng thái cuối; khi kết thúc thì invalidate số dư ví.
6. `REFUNDED` hiển thị rõ "FinVault đã hoàn tiền vào ví"; `REFUND_FAILED` hiển thị liên hệ hỗ trợ kèm mã đơn.

### Chống trùng & thử lại

- Key gắn với "ý định" giao dịch: `TOPUP|phone|amount` hoặc `BILL|provider|customerCode|amount`.
- Lỗi không rõ kết quả khi tạo đơn (mất mạng, 408/502/504, `UPSTREAM_UNAVAILABLE`, `GATEWAY_TIMEOUT`) → hiện banner "Thử lại" và gửi lại **cùng key**.
- Lỗi 4xx xác định → không tự thử lại, hiển thị thông báo tiếng Việt theo mã lỗi.
- Lỗi không rõ kết quả khi xác nhận thanh toán → không xác nhận lại, chuyển sang theo dõi đơn.
- Nút thanh toán bị khóa trong suốt thời gian gửi để tránh double-click.

### Phân loại lỗi confirm (N16 / D1)

`classifyConfirmError` trong `errors.ts` chia lỗi `POST /api/payments/:id/confirm` thành 4 nhóm, không bao giờ tự confirm lại:

| Nhóm | Mã / trạng thái | UI |
| :--- | :--- | :--- |
| `RESUME_POLLING` | mất mạng, 408/502/504, `PAYMENT_PROCESSING`, `PAYMENT_ALREADY_CONFIRMED`, `TXN_TOKEN_REUSED`, `GATEWAY_TIMEOUT`, `UPSTREAM_UNAVAILABLE` | Banner "đang xử lý, không thực hiện lại" + poll đơn |
| `EXPIRED` | 410 / `PAYMENT_EXPIRED` | Poll đơn (BE đưa về `FAILED (PAYMENT_EXPIRED)`), **không** mở lại PIN |
| `REAUTH` | `TXN_TOKEN_EXPIRED` / `TXN_TOKEN_INVALID` / `TXN_TOKEN_MISSING` | Nút "Xác thực lại" với đúng `paymentId` + `amount` cũ |
| `FATAL` | 403 `FORBIDDEN`, 409 `CONFLICT`, còn lại | Báo lỗi tiếng Việt, không có nút xác thực lại |

### Polling và trạng thái treo (D2)

- 2 giây/lần cho tới trạng thái kết thúc.
- Ở `PROVIDER_PENDING` liên tục 60 giây (đo phía client) → giãn còn 10 giây/lần, `OrderStatusPanel` hiện ghi chú "Nhà cung cấp chưa phản hồi. Tiền đang được giữ, FinVault sẽ tự kiểm tra…" kèm mã đơn. Không hứa hoàn tiền.
- Lý do thất bại lấy từ `failureReason`: `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, `CHECKOUT_NOT_CREATED`, `PROVIDER_REJECTED`, `PAYMENT_REJECTED`, `REFUND_REJECTED`, `TIMEOUT`; mã lạ không hiển thị thô.

### Đơn chưa thanh toán (D3) và số dư (D4, D5)

- Đóng `PinModal` khi chưa xác thực → banner "Đơn đã tạo nhưng chưa thanh toán… (giữ tối đa 5 phút)" + nút **Thanh toán** mở lại PIN với đúng `paymentId`/`amount`. Không gọi checkout lại nên vẫn dùng cùng `Idempotency-Key`.
- Banner tự xoá khi đổi tab, đổi nội dung form, tra cứu hóa đơn khác, hoặc bấm "Thực hiện giao dịch khác".
- `walletKeys.me()` được invalidate ngay sau confirm thành công và mỗi khi `status` đơn đổi; client không tự cộng/trừ số dư.
- `orderId` chỉ nằm trong bộ nhớ: reload trang sẽ mất liên kết đơn (BE không có endpoint danh sách đơn). Xem câu hỏi hở cuối mục 3.

### Trạng thái UI

`QueryBoundary` cho ví: loading (`Đang tải thông tin ví…`), error (`Không thể tải dữ liệu` + nút thử lại), empty (`Chưa có thông tin ví`), success (workspace). Tra cứu hóa đơn có loading/error/empty/success riêng; đơn hàng có loading + 8 trạng thái backend.

### Kiểm thử luồng (N16)

`src/test/utilitiesFlow.test.tsx` (Vitest + MSW + Testing Library, chạy bằng `npm run test:unit`): PIN nhận đúng `paymentId`/`amount` từ đơn; confirm gửi `X-Transaction-Token` và token không nằm trong storage/Zustand; double-click chỉ 1 checkout; retry 502 dùng cùng key; chuỗi trạng thái + hoàn tiền + số dư ví; `PROVIDER_PENDING` quá 60 giây (renderHook + fake timers) bật `slowPolling` và giãn poll; 410/409/403 không mở lại PIN, `TXN_TOKEN_EXPIRED` có nút xác thực lại; bill dùng đúng số tiền lookup và map `BILL_NOT_FOUND`/504.

## 3. Câu hỏi hở Contract / TODO(contract)

- [x] **`PHONE_TOPUP` / `BILL_PAYMENT` đã được payment-service chấp nhận** trên `origin/main` (bbdf0e6 trở đi); utilities-service gọi checkout với `Idempotency-Key = util-<orderId>`. FE không cần đổi endpoint; TODO(contract) cũ đã bỏ.
- [ ] **Chiết khấu 3% chỉ được ghi nhận**: `amount` là mệnh giá đầy đủ, `discountAmount` được lưu trên đơn nhưng không trừ vào số tiền thanh toán và không cộng vào ví. UI ghi rõ "chiết khấu ghi nhận", không hiển thị như giảm giá. Cần xác nhận nghiệp vụ nếu muốn thực sự ưu đãi.
- [ ] **Không có endpoint danh mục nhà cung cấp**: `EVN`/`SAWACO`/`FPT` là bộ mã sandbox cố định trong `constants.ts`; backend chỉ validate hình thức chuỗi `[A-Za-z0-9._-]{2,32}`.
- [ ] **Không có trường nhà mạng / địa chỉ / hạn thanh toán**: API topup chỉ nhận `phone` + `amount`; bill lookup chỉ trả `provider`, `customerCode`, `customerName`, `amount`, `period`. Vì vậy bộ chọn nhà mạng, địa chỉ và hạn thanh toán hardcode của bản thiết kế đã bị bỏ (xem mục 4).
- [ ] **`amountFormatted`** có trong response mẫu nhưng không bắt buộc; UI luôn tự format từ `amount` bằng `formatVnd` để tránh lệch đơn vị.
- [x] **Gateway identity**: Web gửi Bearer access token trong bộ nhớ qua `lib/axios`; Gateway xác thực và thiết lập identity nội bộ cho Utilities. FE không tự tạo service token. Định tuyến Utilities đã sửa trong source; request/UI live vẫn cần kiểm riêng.
- [ ] **Hạn mức KYC**: backend trả `LIMIT_EXCEEDED`; UI chỉ map thông báo, chưa hiển thị trước hạn mức còn lại vì payment-service chưa có endpoint tra hạn mức dùng chung.

## 4. Thay đổi giao diện sau khi gắn API (nếu có)

- `src/pages/UtilitiesPage.tsx` (mock data, `setTimeout`, `Math.random`) được thay bằng trang mỏng render `UtilitiesWorkspace`; mọi dữ liệu lấy từ API thật.
- Bỏ bộ chọn nhà mạng viễn thông, địa chỉ/khách hàng mẫu, hạn thanh toán và nút chọn số điện thoại mẫu vì API không có các trường này.
- Bỏ số dư, mã đơn, mã giao dịch hardcode; tất cả lấy từ ví và đơn hàng thật.
- Giữ nguyên bố cục 2 cột và nhãn **Mô phỏng** bắt buộc tại cả hai tab (AGENTS.md §6.7).
- Chiết khấu đổi nhãn thành "Chiết khấu 3% (ghi nhận)" để không gây hiểu nhầm là số tiền được giảm.
- Lý do: các thành phần trên hiển thị dữ liệu không có nguồn từ API hoặc sai ngữ nghĩa contract. Thay đổi nằm trong phạm vi N16 đã được giao; chưa có xác nhận riêng ngoài kế hoạch tuần 4.
