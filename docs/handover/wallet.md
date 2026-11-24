# Bàn giao Wallet và lịch sử — K18/K20

## Cập nhật cấu trúc và live 23/11/2026

DashboardPage và TransactionsPage đã mỏng, ghép WalletDashboard/WalletTransactions
qua `features/wallet/index.ts`. Hook/query giữ nguyên; component trong feature
import nội bộ trực tiếp, Auth qua public entry. Các kiểm tra tiền/route cũ đã
chuyển theo file mới để không bỏ lọt logic sau khi tách trang. Browser kiểm
cursor, lọc lịch sử và P2P thật đã PASS. A1/A2/A9 đã chạy trên cụm riêng; K12
clone DOWN/UP cũng PASS với checksum giữ nguyên. W4 vẫn tạm giữ.

W4 đang TẠM GIỮ theo lựa chọn mới của Đạt: cần phân biệt sửa cache khi ledger
đúng với đảo một giao dịch gốc. Không thêm debit vào ledger chỉ để sửa cache;
chưa thay backend Wallet/Admin reconciliation trong lượt này. Lỗi heldBalance
đã ghi nhận vẫn chưa được sửa trong phạm vi đang tạm giữ.


Cập nhật 23/11/2026. Chủ feature: Khoa; Đạt review tích hợp Đ20. Mô tả working tree hiện tại, không thay nghiệm thu A1/A2/A9 hoặc toàn bộ UI.

## Trang, hook và API

- `/app` → `DashboardPage`; `/app/transactions` → `TransactionsPage`. Hai trang còn nhiều JSX/logic trong page; chưa kết luận đã mỏng chỉ từ việc không import axios.
- Public entry [features/wallet/index.ts](../../src/features/wallet/index.ts) export API, DTO, queries và `computeDashboardStats`.
- [wallet.api.ts](../../src/features/wallet/api/wallet.api.ts): `GET /api/wallets/me`; `GET /api/wallets/me/ledger` với cursor/limit, startDate/endDate/type/direction.
- [wallet.queries.ts](../../src/features/wallet/api/wallet.queries.ts): `useWalletMe`/`useMyWallet`, `useWalletLedger`/`useMyLedger`, `useInfiniteWalletLedger`/`useInfiniteMyLedger`; `walletKeys` có owner và filter. Trang lịch sử dùng hook infinite.
- Dashboard lấy balance/held/available và hạn mức ngày/tháng từ dữ liệu ví; `computeDashboardStats` xử lý chuỗi bằng BigInt. Dữ liệu API thiếu không được tự chứng nhận là hạn mức thật bằng 0.

## Cache, UI và dữ liệu

Query ví chỉ chạy khi có owner, gcTime 0; infinite query giữ cùng filter khi tải thêm. Đổi filter tạo key mới. Giao dịch kết thúc phải invalidate ví và ledger, không tự cộng trừ balance trong Auth store.

Dashboard có loading/error và trạng thái dữ liệu ví/ledger riêng; Transactions dùng QueryBoundary, bộ lọc, load-more, empty và chi tiết giao dịch. Số tiền là chuỗi VND/Decimal với phần lẻ zero; format qua `lib/format.ts`.

Các route `/:userId/balance|history` còn tồn tại ở backend với kiểm tra quyền, không phải đã xóa khỏi hệ thống. Web mới dùng `/me`; không gọi trực tiếp `/:userId/credit|debit|transfer` từ form USER. Admin/internal credit trong seed test là phạm vi khác.

## Cách kiểm tra

1. Đối chiếu số dư/hạn mức Dashboard với response `/wallets/me`, kiểm tài khoản không có dữ liệu và lỗi mạng.
2. Chọn khoảng ngày/loại/hướng trên Transactions: Network có filter; tải thêm giữ filter; đổi filter không trộn trang cũ.
3. Sau giao dịch, số dư và lịch sử phải đọc lại từ server; không chỉ đổi số trên UI.
4. Đổi tài khoản, kiểm không hiện dữ liệu ví cũ. USER đọc ví người khác phải bị chặn.
5. Các lệnh check/unit chỉ là gate tự động. A1/A2/A9 và filter trên Gateway/database thật cần evidence riêng.

## Việc còn mở

- Rà phần nghiệp vụ/render còn trong Dashboard/Transactions; bản thân độ dài file không phải bằng chứng lỗi tài chính.
- Backend filter đã có validation/query; thông tin “filter chưa có backend” ở báo cáo 15/11 là lịch sử.
- W4 thuộc K17/N18 được ghi riêng trong [admin.md](admin.md); quyết định bút toán đảo và lỗi heldBalance đang tạm gác theo yêu cầu của Đạt.
- [Handover K18 cũ](k18-web-wallet.md) giữ để đối chiếu revision, không phải chứng nhận mọi gate hiện tại đã PASS.
