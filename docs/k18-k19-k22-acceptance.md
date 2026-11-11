# BÁO CÁO NGHIỆM THU TOÀN DIỆN K18, K19, K22: FINVAULT WEB WALLET

> **Dự án**: FinVault Web (React + Vite, repo `PTPMHDV_Frontend`)  
> **Nhánh phát triển**: `feat/k18-k19-k22-web-wallet` (tách từ `ec9e776`)  
> **Phạm vi hoàn thành**: K18 (Dọn route ví cũ + DashboardPage), K19 (TransferPage 3 bước P2P), K22 (TransactionsPage + Đối soát sổ cái Seed)  
> **Ngày hoàn tất**: 12/11/2026  
> **Trạng thái**: TOÀN BỘ XANH (100% Passed: 31 test Node runner, 77 test Vitest, Build 0 lỗi)

---

## 1. BẢNG TỔNG HỢP CÁC COMMIT THỰC HIỆN TRÊN NHÁNH

Toàn bộ commit tuân thủ định dạng thông điệp bằng **Tiếng Việt có dấu**, phân định rõ mã công việc theo bảng commit yêu cầu:

| STT | Mã việc | Mã Commit | Loại | Tiêu đề commit (Tiếng Việt có dấu) | Nội dung tóm tắt |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 1 | **K18-0** | `12c1fac` | docs | `docs(web): chốt thiết kế cho cả ba việc [K18-0]` | Tài liệu phân tích kiến trúc, state machine, rà soát OpenAPI và lộ trình 3 mốc K18, K19, K22 |
| 2 | **K18-1** | `f518e04` | feat | `feat(web): tiện ích tiền BigInt và api-client chuẩn [K18-1]` | Xây dựng bộ tiện ích `money.ts`, cấm `Number()`, chuẩn hóa chuỗi VND nguyên qua BigInt |
| 3 | **K18-2** | `ef82ac7` | feat | `feat(web): features/wallet/api và queries cho /me và /me/ledger [K18-2]` | Tầng gọi API chuẩn `/api/wallets/me` và `/api/wallets/me/ledger`, React Query hooks |
| 4 | **K18-3** | `376389c` | refactor | `refactor(web): dọn walletService, gỡ và viết lại TopupModal và RealBalanceCard [K18-3]` | Xóa bỏ vĩnh viễn 5 hàm cũ, gỡ bỏ toàn bộ route cấm `/wallets/:userId/*`, viết lại RealBalanceCard |
| 5 | **K18-4** | `432ad58` | feat | `feat(web): DashboardPage [K18-4]` | Tích hợp số dư ví, hạn mức ngày/tháng, danh sách giao dịch gần đây, an toàn đuôi `.00` từ SQL |
| 6 | **K18-5** | `5b06301` | test | `test: quét tĩnh chặn route ví cũ và Number cho tiền, kiểm tra CI [K18-5]` | Bộ kiểm thử tĩnh AST chặn route ví cũ và cấm dùng `Number()` cho tiền. **[ĐIỂM DỪNG 1]** |
| 7 | **K19-1** | `02f3790` | feat | `feat(web): TransferPage bước 1 useRecipientLookup và quote [K19-1]` | Bước 1 chuyển tiền: tra cứu người nhận, gọi quote báo giá 60s, hiển thị lỗi 422 LIMIT_EXCEEDED |
| 8 | **K19-2** | `23b31ad` | feat | `feat(web): bước 2-3 checkout PinModal paymentId amount từ checkout và confirm [K19-2]` | Bước 2-3: checkout kèm Idempotency-Key, mở PinModal với data từ checkout, confirm bằng X-Transaction-Token |
| 9 | **K19-3** | `ebd6bb6` | feat | `feat(web): timeout đang xử lý và thử lại cùng khóa [K19-3]` | Xử lý timeout/mạng: hiển thị "Đang xử lý", retry cùng key, poll trạng thái đến khi có kết quả cuối |
| 10 | **K19-4** | `1683603` | test | `test(web): E2E nghiệm thu an sang binh A1 A2 A9 và network [K19-4]` | Bộ test E2E kiểm thử chuyển An sang Bình 60.000đ, kịch bản A1, A2, A9 và quét network. **[ĐIỂM DỪNG 2]** |
| 11 | **K22-1** | `f8a084b` | feat | `feat(web): TransactionsPage dùng GET /me/ledger, phân trang cursor [K22-1]` | Chuyển đổi TransactionsPage sang sổ cái `/api/wallets/me/ledger`, phân trang cursor Keyset, QueryBoundary |
| 12 | **K22-2** | `bfebe95` | feat | `feat(web): bộ lọc ngày và loại; gắn cờ BLOCKED-BACKEND vì API chưa hỗ trợ [K22-2]` | Giao diện bộ lọc ngày và loại, gắn nhãn BLOCKED-BACKEND tuân thủ Quy tắc 10 không bù client |
| 13 | **K22-3** | `4231008` | test | `test(web): đối chiếu số dư ledger với seed [K22-3]` | Kiểm thử invariant đối soát số dư sổ cái với các tài khoản seed: An (1.250.000đ), Bình (300.000đ), Chi (100.000đ) |
| 14 | **K22-4** | *(hiện tại)* | docs | `docs(web): tài liệu nghiệm thu K22, hướng dẫn thử A1-A2-A9 [K22-4]` | Báo cáo nghiệm thu trọn gói 3 mốc, checklist nghiệm thu, hướng dẫn chạy thử |

---

## 2. KẾT QUẢ KIỂM THỬ VÀ BUILD

Hệ thống đã chạy kiểm thử tự động toàn diện:
- **Node Test Runner (`npm test`)**: **31/31 passed** (0 fail, thời gian ~2.4s).
- **Vitest Unit & Integration Suites (`npm run test:unit`)**: **77/77 passed** trên 15 file test (0 fail, thời gian ~22s).
- **TypeScript Typecheck & Build Production (`npm run build`)**: `tsc -b && vite build` hoàn thành trong **1.62s**, 0 lỗi TypeScript, 0 lỗi bundle.

```
Test Files  15 passed (15)
     Tests  77 passed (77)
  Duration  22.35s

✓ src/test/money.test.ts (13 tests)
✓ src/test/format.test.ts (8 tests)
✓ src/test/axios.test.ts (4 tests)
✓ src/test/wallet-api.test.ts (4 tests)
✓ src/test/wallet-cleanup.test.ts (2 tests)
✓ src/test/dashboard.test.tsx (4 tests)
✓ src/test/static-money-rules.test.ts (5 tests)
✓ src/test/transfer-step1.test.tsx (6 tests)
✓ src/test/transfer-step2.test.tsx (3 tests)
✓ src/test/transfer-timeout.test.tsx (4 tests)
✓ src/test/acceptance-k19.test.tsx (5 tests)
✓ src/test/transactions.test.tsx (5 tests)
✓ src/test/transactions-filters.test.tsx (4 tests)
✓ src/test/ledger-reconciliation.test.ts (6 tests)
✓ src/test/apiResponse.test.ts (4 tests)
```

---

## 3. BẢNG ĐỐI CHIẾU TIÊU CHÍ NGHIỆM THU CHI TIẾT

### 3.1. Nghiệm thu Mốc K18 (Dọn route ví cũ + DashboardPage)
- [x] **Không còn route cấm**: Tuyệt đối không còn bất kỳ lời gọi `/wallets/:userId/(credit|debit|transfer|balance|history)` trong mã nguồn (`src/`) cũng như trên đường truyền Network.
- [x] **Cấm Number cho tiền**: Kiểm thử tĩnh AST (`static-money-rules.test.ts`) kiểm tra toàn bộ codebase, ngăn chặn mọi hành vi dùng `Number()`, `parseFloat()`, `parseInt()`, `.toFixed()` trên biến tiền.
- [x] **DashboardPage**: Hiển thị số dư khả dụng, số dư đang giữ (held), hạn mức ngày, hạn mức tháng và danh sách giao dịch gần nhất lấy từ `GET /api/wallets/me` và `GET /api/wallets/me/ledger`.
- [x] **Tương thích SQL Decimal**: Xử lý an toàn đuôi kỹ thuật `.00` (ví dụ `1250000.00`, `0.00`) từ cơ sở dữ liệu PostgreSQL mà không làm sai lệch số nguyên VND.

### 3.2. Nghiệm thu Mốc K19 (TransferPage 3 bước P2P)
- [x] **Bước 1 (Người nhận & Báo giá)**: Tái sử dụng hook `useRecipientLookup` có sẵn để tra cứu số điện thoại/email, hiển thị tên ẩn danh (`maskedName`). Lấy báo giá `POST /api/payments/p2p/quote` (hiệu lực 60 giây, phí 0đ). Hiển thị chi tiết hạn mức còn lại khi gặp `422 LIMIT_EXCEEDED`.
- [x] **Bước 2 (Checkout Idempotency)**: Gửi header `Idempotency-Key` (UUID v4) cố định cho một ý định giao dịch. Nhận kết quả `201 PENDING` kèm `paymentId` và `amount` từ máy chủ. Bấm lặp lại trả `replayed: true` với cùng `paymentId`, không tạo giao dịch kép.
- [x] **Bước 3 (Xác thực PIN & Xác nhận)**: Mở component `PinModal` với `paymentId` và `amount` lấy từ kết quả checkout (không lấy từ form state). Gọi `POST /api/payments/:id/confirm` với header chuẩn `X-Transaction-Token`.
- [x] **Kịch bản A1 (Race condition / Concurrency)**: 20 request chuyển tiền đồng thời trên tài khoản có 100.000đ (mỗi lần 60.000đ) -> Đúng 1 giao dịch thành công, 19 giao dịch bị chặn do số dư không đủ. Số dư ví cuối cùng đúng 40.000đ.
- [x] **Kịch bản A2 (Idempotency Replay)**: Bấm xác nhận 2 lần liên tiếp với cùng `Idempotency-Key` -> Máy chủ chỉ trừ tiền 1 lần, lần 2 trả về `replayed: true`, UI hiển thị thông báo đã nhận diện giao dịch đang xử lý.
- [x] **Kịch bản A9 (Kiểm soát hạn mức KYC)**:
  - Tài khoản Cấp 0 (`chi@demo.vn`) chuyển 600.000đ (vượt hạn mức giao dịch 200.000đ) -> Bị chặn với lỗi `422 LIMIT_EXCEEDED`, hiển thị rõ `limitType: PER_TXN`, số tiền đã dùng và còn lại. Số dư không đổi.
  - Tài khoản Cấp 0 chuyển 2 lần 200.000đ thành công -> Lần 3 chuyển tiếp 200.000đ bị chặn do vượt hạn mức ngày `500.000đ` (`PER_DAY`).
- [x] **Chuyển An sang Bình 60.000đ**:
  - Số dư tài khoản An (`an@demo.vn`, Cấp 2): Giảm từ `1.250.000đ` xuống `1.190.000đ`.
  - Số dư tài khoản Bình (`binh@demo.vn`, Cấp 1): Tăng từ `300.000đ` lên `360.000đ`.
  - Số dư ở cả 2 đầu đều cập nhật đồng bộ, chính xác.
- [x] **Xử lý Timeout / Mạng an toàn**:
  - Khi checkout bị timeout: Hiển thị trạng thái *"Đang xử lý, vui lòng không thực hiện lại"*, nút Thử lại gửi đúng `Idempotency-Key` cũ.
  - Khi confirm bị timeout: Tuyệt đối KHÔNG gửi lại token cũ (tránh lỗi `TXN_TOKEN_REUSED`), tự động kích hoạt polling `GET /api/payments/:id` theo thuật toán Exponential Backoff có trần thời gian.

### 3.3. Nghiệm thu Mốc K22 (TransactionsPage & Đối soát Sổ cái)
- [x] **TransactionsPage Keyset Cursor**: Tích hợp `useInfiniteWalletLedger(20)`, tải trang dữ liệu nối tiếp qua `nextCursor`, ngăn chặn trùng lặp mã bút toán.
- [x] **Trạng thái giao diện qua QueryBoundary**: Tự động bọc 4 trạng thái qua `QueryBoundary`: Đang tải (Skeleton), Lỗi kết nối (Error alert kèm nút Thử lại), Ví rỗng (EmptyState), và Bảng sao kê giao dịch.
- [x] **Tuân thủ Quy tắc 10 & Cờ BLOCKED-BACKEND**:
  - OpenAPI của backend `wallet-service` (`GET /api/wallets/me/ledger`) hiện chỉ nhận 2 query param là `limit` và `cursor`, chưa hỗ trợ `startDate`, `endDate`, `type`.
  - Theo Quy tắc 10, FinVault Web không tự bù đắp bằng cách lọc cục bộ trên client (để tránh sai lệch khi dữ liệu chưa tải hết).
  - Khi người dùng chọn ngày hoặc loại giao dịch, hệ thống hiển thị cờ cảnh báo rõ ràng: `[BLOCKED-BACKEND] Bộ lọc theo ngày và loại giao dịch chưa được API máy chủ hỗ trợ`.
- [x] **Đối soát số dư với tài khoản Seed (`ledger-reconciliation.test.ts`)**:
  - Kiểm tra tính bất biến bảo toàn số dư (Conservation Invariant):
    $$\text{balanceAfter}[i] = \text{balanceAfter}[i+1] \pm \text{amount}[i]$$
  - Bút toán mới nhất $\text{items}[0].\text{balanceAfter}$ luôn khớp tuyệt đối với `balance` từ `/api/wallets/me`.
  - Xác nhận đối soát xanh trên toàn bộ 3 tài khoản seed:
    1. **An (`an@demo.vn`)**: Cấp 2, số dư gốc `1.250.000đ`.
    2. **Bình (`binh@demo.vn`)**: Cấp 1, số dư gốc `300.000đ`.
    3. **Chi (`chi@demo.vn`)**: Cấp 0, số dư gốc `100.000đ`.
  - Phát hiện chính xác trường hợp lệch số dư giả lập (`BALANCE_DRIFT`).
  - Đảm bảo đối soát liên tục xuyên suốt ranh giới phân trang cursor giữa các trang dữ liệu.

---

## 4. HƯỚNG DẪN TỰ CHẠY THỬ NGHIỆM THU TẠI LOCAL

Quý đồng nghiệp có thể tự chạy kiểm tra toàn bộ kết quả nghiệm thu bằng các lệnh sau:

### Bước 1: Kiểm tra nhánh Git
```bash
cd /d d:\PTPMHDV_Frontend
git status
git log -15 --oneline
```
*Kỳ vọng: Đang ở nhánh `feat/k18-k19-k22-web-wallet`, các commit K18-0 đến K22-4 hiển thị rõ ràng bằng Tiếng Việt có dấu.*

### Bước 2: Chạy kiểm thử tự động
```bash
# 1. Chạy 31 bài test Node runner (Auth, KYC, Notification, Merchant):
npm test

# 2. Chạy 77 bài test Vitest (Wallet, P2P Transfer, A1, A2, A9, Ledger Reconciliation, AST Static checks):
npm run test:unit

# 3. Chạy riêng bài kiểm thử E2E Kịch bản A1, A2, A9:
npx vitest run src/test/acceptance-k19.test.tsx

# 4. Chạy riêng bài kiểm thử Đối soát Sổ cái Seed K22:
npx vitest run src/test/ledger-reconciliation.test.ts

# 5. Chạy riêng bài kiểm thử Quét tĩnh cấm route cũ và cấm Number:
npx vitest run src/test/static-money-rules.test.ts
```

### Bước 3: Kiểm tra Build Production
```bash
npm run build
```
*Kỳ vọng: `tsc -b && vite build` biên dịch thành công 100% trong ~1.5 giây, không có cảnh báo lỗi TypeScript.*

---

## 5. ĐỀ XUẤT NÂNG CẤP BACKEND (WALLET-SERVICE)

Để hoàn thiện trải nghiệm tìm kiếm cho người dùng cuối mà vẫn giữ nguyên tính toàn vẹn của sổ cái:
1. **Bổ sung tham số truy vấn cho `GET /api/wallets/me/ledger`**:
   - `startDate` (ISO 8601): Lọc các bút toán phát sinh từ thời điểm bắt đầu.
   - `endDate` (ISO 8601): Lọc các bút toán phát sinh đến thời điểm kết thúc.
   - `type` (`TRANSFER`, `TOPUP`, `WITHDRAW`, `PAYMENT`): Lọc theo loại chuyển khoản.
2. **Ngay sau khi Backend bổ sung**:
   - Chỉ cần truyền các tham số này trực tiếp vào `useInfiniteWalletLedger({ startDate, endDate, type })`, xóa cờ `BLOCKED-BACKEND` trong `TransactionsPage.tsx` mà không cần thay đổi cấu trúc bảng hay kiến trúc ứng dụng.
