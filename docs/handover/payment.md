# Bàn giao Feature: Payment (Chuyển tiền P2P & Thanh toán)

- **Trạng thái**: Đã hoàn thành theo chuẩn K18 (Commit K18-0 đến K18-9).
- **Chi tiết bàn giao**: Xem tài liệu chi tiết tại [k18-web-wallet.md](./k18-web-wallet.md).

## 1. Quy trình P2P 3 bước chuẩn
1. `GET /api/users/lookup?q=...`: Tra cứu người nhận bảo mật.
2. `POST /api/payments/p2p/quote`: Lấy báo giá (phí 0đ, hạn 60s, bắt lỗi 422 `LIMIT_EXCEEDED` theo 3 cấp `PER_TXN`, `PER_DAY`, `PER_MONTH`).
3. `POST /api/payments/p2p/checkout`: Khởi tạo đơn chuyển tiền kèm header `Idempotency-Key` (UUID v4 duy nhất).
4. `POST /api/auth/pin/verify`: Xác thực mã PIN giao dịch, nhận `transactionToken`.
5. `POST /api/payments/:id/confirm`: Xác nhận chuyển tiền qua header `X-Transaction-Token`.
6. Polling `GET /api/payments/:id`: Xử lý an toàn khi confirm gặp sự cố timeout/mạng (exponential backoff, trần 30s).
