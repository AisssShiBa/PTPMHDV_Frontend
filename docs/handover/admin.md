# Bàn giao Feature: Admin

## 1. Trang và Component đã dựng

- **Routes**:
  - `/app/admin`: `AdminDashboardPage` → `AdminDashboard`
  - `/app/admin/kyc`: `AdminKycPage` → `AdminKycManager`
  - `/app/admin/topups`: `AdminTopupPage` → `AdminTopupManager`
- **Components** (`features/admin/components`):
  - `AdminDashboard`: 4 thẻ số liệu (người dùng, KYC, merchant, kiểm toán) lấy từ `GET /api/admin/dashboard`; bảng phân bố KYC và danh sách thao tác gần đây. Không còn số liệu mẫu, `Math.random` hay `setTimeout`; số đếm format qua `formatNumber`, tiền qua `formatVnd` (BigInt).
  - `AdminKycManager`: hàng đợi KYC (phân trang 10/trang, lọc `status`, tìm theo email/họ tên với debounce qua nút Tìm), panel chi tiết, xem ảnh CCCD hai mặt, duyệt/từ chối, đặt Cấp 1 / nâng Cấp 2. Từ chối bắt buộc lý do 1–500 ký tự (Zod `kycReviewSchema`), đổi cấp bắt buộc lý do (`kycTierSchema`).
  - `AdminTopupManager`: bảng lệnh nạp `GET /api/payments/admin/topups`, lọc client theo mã GD/user/VNPAY ref, dialog chi tiết, nút Duyệt/Từ chối gọi endpoint thật. Lý do từ chối 1–500 ký tự (`topupRejectSchema`).
  - `AdminKycDocumentsViewer`: gọi `GET /api/admin/kyc/{userId}/documents` (có audit) khi Admin bấm "Xem hai mặt CCCD"; URL ảnh chỉ nằm trong React Query cache/state, **không** ghi `localStorage`/`sessionStorage`, không log.
- **Trang mỏng**: 3 page chỉ import component từ `features/admin`, không gọi `axios`/`*.api.ts` (mỗi file 7 dòng).

## 2. Hook / API đã thay

| Tên | File định nghĩa | Endpoint | Phương thức | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `adminApi.getDashboardStats` | `features/admin/api/admin.api.ts` | `/api/admin/dashboard` | GET | Trả aggregate `{users, merchants, audits}` |
| `adminApi.getKycList` | cùng file | `/api/admin/kyc?page&limit&status&search` | GET | `search` được `trim` |
| `adminApi.reviewKyc` | cùng file | `/api/admin/kyc/{userId}/review` | POST | Body `{status, detail?}`; `userId` được encode |
| `adminApi.changeKycTier` | cùng file | `/api/admin/kyc/{userId}/tier` | PATCH | Body `{tier: 1\|2, reason}` |
| `adminApi.getKycDocuments` | cùng file | `/api/admin/kyc/{userId}/documents` | GET | Trả `{frontUrl, backUrl, expiresAt}` |
| `adminApi.getTopups` | cùng file | `/api/payments/admin/topups?status` | GET | Trả mảng `TopupRequest`; `amount` là Decimal → string |
| `adminApi.approveTopup` | cùng file | `/api/payments/admin/topups/{id}/approve` | POST | Không body, backend hiện trả `NOT_ALLOWED` |
| `adminApi.rejectTopup` | cùng file | `/api/payments/admin/topups/{id}/reject` | POST | Body `{reason}` 1–500 |
| `adminKeys` | `features/admin/api/admin.queries.ts` | — | — | Factory: `dashboard`, `kycList(params)`, `kycDocuments(userId)`, `topupList(status)` |
| `useAdminDashboard` | cùng file | `/api/admin/dashboard` | GET | `staleTime` 15s |
| `useAdminKycList` / `useKycDocuments` | cùng file | `/api/admin/kyc`, `.../documents` | GET | Documents `enabled` theo thao tác xem, `staleTime: 0`, `gcTime: 0` |
| `useReviewKyc` / `useChangeKycTier` | cùng file | review, tier | POST/PATCH | Thành công invalidate `adminKeys.kyc()` + `adminKeys.dashboard()` |
| `useAdminTopups` | cùng file | `/api/payments/admin/topups` | GET | `staleTime` 10s |
| `useApproveTopup` / `useRejectTopup` | cùng file | approve, reject | POST | Thành công invalidate `adminKeys.topups()` + `adminKeys.dashboard()` |

`features/admin/services/adminService.ts` và `components/KycActionForm.tsx` cũ đã bị xoá; feature chỉ export qua `features/admin/index.ts`.

### Idempotency

`approve`/`reject` của payment-service **không** yêu cầu header `Idempotency-Key` (route chỉ có `paramIdSchema` / `rejectTopupSchema`); nút bị khóa bằng `isPending` để tránh double-click. Không tự thêm header ngoài contract.

## 3. Câu hỏi hở Contract / TODO(contract)

- [ ] **Lọc `status` của KYC chưa có tác dụng**: admin-service chuyển tiếp query `status`, nhưng user-service đọc tham số `kycStatus`. FE gửi đúng tên `status` theo OpenAPI hiện hành; cần chủ sở hữu backend xác nhận và thống nhất một tên. FE **không** lọc client để tránh che lỗi backend.
- [ ] **Duyệt/từ chối nạp tiền thủ công đang bị tắt**: payment-service luôn trả `400 NOT_ALLOWED` cho approve/reject (VNPAY IPN tự cộng tiền). UI vẫn gọi đúng endpoint và map `NOT_ALLOWED` sang giải thích tiếng Việt thay vì giả lập thành công.
- [ ] **`kycStatus` trong response review**: backend trả entity user-service; FE đọc `kycStatus` và `kycTier`. Nếu shape đổi, cần cập nhật `AdminKycItem`.
- [ ] **Dashboard `audits.recentActivities`**: hiện hiển thị `action` thô qua bảng nhãn; backend thêm action mới sẽ rơi về chuỗi gốc (không crash).
- [ ] **AGENTS.md §6.6** còn ghi "ẩn nút Tạo bút toán điều chỉnh" trong trang đối soát; kế hoạch Tuần 4 (N18) yêu cầu làm điều chỉnh. Cần Đạt xác nhận sửa AGENTS.md — xử lý ở N18.

## 4. Thay đổi giao diện sau khi gắn API (nếu có)

- `AdminDashboardPage` (dữ liệu mẫu + `setTimeout`) → trang mỏng render `AdminDashboard` thật.
- `AdminKycPage`: bỏ dữ liệu mẫu/OCR/Face-Match/%; còn ảnh CCCD hai mặt có zoom, lý do từ chối, nút Duyệt/Từ chối theo AGENTS.md §6.2.
- `AdminTopupPage`: nối danh sách/duyệt/từ chối thật, thêm banner giải thích chế độ VNPAY IPN.
- Lý do: các thành phần cũ hiển thị dữ liệu không có nguồn từ API.

## 5. Kiểm thử đã chạy (N17)

- `tests/admin.test.ts`: 5 test node:test — đúng route/body/params của dashboard, KYC list, review (kèm `detail`), tier, documents, topups list/approve/reject.
- `src/test/admin.test.tsx`: 12 test Vitest — schema từ chối thiếu lý do, đổi cấp, topup reject; 403/409 trả tiếng Việt; 4 trạng thái KYC/topup/dashboard; chặn submit thiếu lý do + gửi đúng body; viewer không ghi storage; invalidate đúng key; `NOT_ALLOWED` hiển thị tiếng Việt.
- Xem log đầy đủ tại `docs/evidence/N17/result.log`.
