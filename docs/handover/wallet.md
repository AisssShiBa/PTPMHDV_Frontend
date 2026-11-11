# Bàn giao Feature: Wallet (Ví & Sổ cái)

- **Trạng thái**: Đã hoàn thành theo chuẩn K18 (Commit K18-0 đến K18-9).
- **Chi tiết bàn giao**: Xem tài liệu chi tiết tại [k18-web-wallet.md](./k18-web-wallet.md).

## 1. Endpoints chính thức qua Gateway
- `GET /api/wallets/me`: Lấy số dư và hạn mức ví của chính người dùng đăng nhập.
- `GET /api/wallets/me/ledger?limit=...&cursor=...`: Lấy biến động số dư theo phân trang cursor.

## 2. Loại bỏ route cũ
- Đã gỡ bỏ toàn bộ các route cũ: `POST /wallets/:userId/transfer` (G10), `POST /wallets/:userId/credit`, `POST /wallets/:userId/debit`, `GET /wallets/:userId/balance`, `GET /wallets/:userId/history`.

## 3. Tiền tệ
- Tiền luôn là `string` số nguyên VND, tính toán bằng `BigInt`, định dạng qua `lib/format.ts`. Cấm tuyệt đối `Number()` trên tiền.
