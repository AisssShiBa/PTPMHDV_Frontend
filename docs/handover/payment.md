# Bàn giao Payment/P2P — K19, phối hợp PIN Đ18 và nền Đ20

Cập nhật 23/11/2026 theo working tree FE nền `464b017`, BE nền `bfbbf74`, chưa phải nghiệm thu trên main. Khoa nhận phần Payment; Đạt bàn giao PIN, Auth và các hook/component dùng chung. [Bản K18 trước đây](k18-web-wallet.md) là bằng chứng lịch sử, không thay kết quả UI sau refactor.

## Trang và public entry

`/app/transfer` → [TransferPage.tsx](../../src/pages/TransferPage.tsx). Import nghiệp vụ từ [features/payment/index.ts](../../src/features/payment/index.ts), người nhận từ `features/user`, PIN từ `features/auth`. Page giữ ghép UI, điều hướng, copy/in biên lai; API nằm trong feature.

| Khối | Trách nhiệm |
| --- | --- |
| `TransferForm` | Người nhận, amount chuỗi VND, ghi chú, trạng thái lookup/cooldown và lấy báo giá |
| `TransferQuoteReview` | Xác nhận báo giá, đếm hạn, checkout và trạng thái chưa rõ kết quả |
| `TransferSteps` | Thanh bước nhập → xác nhận → kết quả |
| `TransferReceipt` / `TransferFailure` | Kết quả thành công hoặc trạng thái kết thúc; không tạo biên lai thành công từ timer |
| `useTransferFlow` | Điều phối form, quote, checkout, PIN, kết quả và reset |
| `useTransferQuote` | Báo giá đúng intent, thời hạn server; bỏ phản hồi cũ |
| `useTransferCheckout` | Khóa gửi đồng thời, giữ intent/key khi chưa rõ kết quả, bind payment server trả |
| `useTransferConfirmation` | Token một lần, đọc trạng thái phục hồi có budget 30 giây, chặn kết quả sai tài khoản/đơn |

## API và cache

Axios singleton có base `/api`; adapter dùng các path dưới đây. Không thêm `/api` lần nữa trong lời gọi.

| Bước | Endpoint | Dữ liệu/quy tắc |
| --- | --- | --- |
| Lookup | `GET /api/users/lookup?q=...` | `useRecipientLookup` trả Auth ID và maskedName; không dùng profile ID |
| Quote | `POST /api/payments/p2p/quote` | Amount và recipient theo DTO; hết hạn lấy từ `expiresAt` |
| Checkout | `POST /api/payments/p2p/checkout` | Header `Idempotency-Key`, body intent giữ nguyên khi retry |
| PIN | `POST /api/auth/pin/verify` | PIN + paymentId + amount của checkout; trả transactionToken TTL 60 giây |
| Confirm | `POST /api/payments/{id}/confirm` | Adapter FE dùng header `X-Transaction-Token`; `fundingNoReplay: true` |
| Status | `GET /api/payments/{id}` | Chỉ đọc khi phục hồi, không tạo checkout thay thế |

Source: [payment.api.ts](../../src/features/payment/api/payment.api.ts), [payment.queries.ts](../../src/features/payment/api/payment.queries.ts). `paymentKeys` phân tách owner và payment ID. Mutation `retry:false`, `gcTime:0`; status query không tự refetch khi focus/reconnect. Hook kiểm owner trước/sau request. Kết quả cuối invalidate `walletKeys.all` để đọc lại số dư/ledger.

Quote backend có thể trả `fee: 0` dạng number; adapter chỉ chuẩn hóa ngoại lệ zero này thành chuỗi `'0'`, kiểm amount khớp request và expiresAt hợp lệ. Không chuyển các số tiền tùy ý bằng Number.

## PIN, retry và trạng thái UI

- Chỉ mở PinModal sau checkout, với paymentId/amount thật. PIN và transactionToken không ghi storage/log/biên lai.
- Cùng ý định chưa rõ kết quả phải retry checkout với cùng key. Không tự tạo key mới hoặc đổi recipient/amount để vượt trạng thái unknown.
- Confirm không tự replay POST khi mất mạng/401. Token đã dùng không gửi lại; hash chống replay nằm trong RAM. Token mới chỉ được yêu cầu sau khi GET xác nhận đơn PENDING theo luồng hook.
- Budget polling hết vẫn là chưa rõ kết quả và có nút kiểm tra; không suy ra FAILED/SUCCESS.
- Dừng/bỏ kết quả khi unmount hoặc đổi tài khoản. Form, quote, PIN, processing, receipt/failure là các trạng thái riêng; ví/lookup lỗi không được giả thành dữ liệu thành công.

## Cách kiểm tra và giới hạn

1. Đăng nhập bằng tài khoản test đủ tiền/PIN, chuyển 60.000đ cho người nhận khác; kiểm lookup, quote, checkout, verify và confirm trong Network.
2. Kiểm PinModal dùng đúng ID/amount; chỉ có một checkout khi double-click. Thử timeout checkout bằng môi trường test: retry giữ key/body.
3. Thử lỗi confirm: GET trạng thái phục hồi, không tự gửi lại token. Đổi tài khoản khi request đang chờ không được hiện biên lai của user trước.
4. Sau SUCCESS, đối chiếu số dư/ledger hai bên và refresh trang. Các ca token replay/expiry A4 cần backend/harness riêng, không suy ra từ thao tác UI đơn lẻ.
5. Chạy `npm run check`, `npm run test:unit`; Đ22 còn cần browser và phase3-live trên cùng revision. Không ghi P2P UI đã PASS từ seed/API test.

## Phần còn mở

Khoa xác nhận K19/A1/A2/A9 và P2P qua UI sau refactor; Đạt phối hợp A3/A4/Đ22. Intent chỉ trong RAM: reload sau mất response checkout không có nghĩa đã biết kết quả; contract lookup theo key chưa được tự bổ sung. Xem [câu hỏi contract](../CONTRACT_OPEN_QUESTIONS.md).
