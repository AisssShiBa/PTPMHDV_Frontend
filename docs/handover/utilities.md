# Bàn giao Feature: Utilities (Nạp điện thoại & Thanh toán hóa đơn)

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

### Trạng thái UI

`QueryBoundary` cho ví: loading (`Đang tải thông tin ví…`), error (`Không thể tải dữ liệu` + nút thử lại), empty (`Chưa có thông tin ví`), success (workspace). Tra cứu hóa đơn có loading/error/empty/success riêng; đơn hàng có loading + 8 trạng thái backend.

## 3. Câu hỏi hở Contract / TODO(contract)

- [ ] **`PHONE_TOPUP` / `BILL_PAYMENT` chưa được payment-service chấp nhận (K13)**: `payment.validation.ts` hiện chỉ nhận `CARD_TOPUP`, `BUS_TICKET`, `MOVIE_TICKET`, `TRAIN_TICKET`, `WALLET_TRANSFER`. Vì vậy checkout thật sẽ trả 4xx xác định và đơn chuyển `FAILED`. Frontend đã gọi đúng endpoint; cần backend bổ sung hai loại này để chạy T1/T2 thật.
- [ ] **Chiết khấu 3% chỉ được ghi nhận**: `amount` là mệnh giá đầy đủ, `discountAmount` được lưu trên đơn nhưng không trừ vào số tiền thanh toán và không cộng vào ví. UI ghi rõ "chiết khấu ghi nhận", không hiển thị như giảm giá. Cần xác nhận nghiệp vụ nếu muốn thực sự ưu đãi.
- [ ] **Không có endpoint danh mục nhà cung cấp**: `EVN`/`SAWACO`/`FPT` là bộ mã sandbox cố định trong `constants.ts`; backend chỉ validate hình thức chuỗi `[A-Za-z0-9._-]{2,32}`.
- [ ] **Không có trường nhà mạng / địa chỉ / hạn thanh toán**: API topup chỉ nhận `phone` + `amount`; bill lookup chỉ trả `provider`, `customerCode`, `customerName`, `amount`, `period`. Vì vậy bộ chọn nhà mạng, địa chỉ và hạn thanh toán hardcode của bản thiết kế đã bị bỏ (xem mục 4).
- [ ] **`amountFormatted`** có trong response mẫu nhưng không bắt buộc; UI luôn tự format từ `amount` bằng `formatVnd` để tránh lệch đơn vị.
- [ ] **Gateway token**: frontend không tự lấy token sang Gateway; mọi request đi qua `lib/axios` hiện có (Bearer access token trong bộ nhớ). Nếu Gateway yêu cầu service token riêng cho `/api/utilities` thì cần bổ sung ở tầng hạ tầng, không phải feature này.
- [ ] **Hạn mức KYC**: backend trả `LIMIT_EXCEEDED`; UI chỉ map thông báo, chưa hiển thị trước hạn mức còn lại vì payment-service chưa có endpoint tra hạn mức dùng chung.

## 4. Thay đổi giao diện sau khi gắn API (nếu có)

- `src/pages/UtilitiesPage.tsx` (mock data, `setTimeout`, `Math.random`) được thay bằng trang mỏng render `UtilitiesWorkspace`; mọi dữ liệu lấy từ API thật.
- Bỏ bộ chọn nhà mạng viễn thông, địa chỉ/khách hàng mẫu, hạn thanh toán và nút chọn số điện thoại mẫu vì API không có các trường này.
- Bỏ số dư, mã đơn, mã giao dịch hardcode; tất cả lấy từ ví và đơn hàng thật.
- Giữ nguyên bố cục 2 cột và nhãn **Mô phỏng** bắt buộc tại cả hai tab (AGENTS.md §6.7).
- Chiết khấu đổi nhãn thành "Chiết khấu 3% (ghi nhận)" để không gây hiểu nhầm là số tiền được giảm.
- Lý do: các thành phần trên hiển thị dữ liệu không có nguồn từ API hoặc sai ngữ nghĩa contract. Thay đổi nằm trong phạm vi N16 đã được giao; chưa có xác nhận riêng ngoài kế hoạch tuần 4.
