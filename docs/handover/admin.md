# Bàn giao Admin — N17/N18

## Cập nhật N17: duyệt/từ chối nạp thủ công đã triển khai

Theo lựa chọn Đạt ngày 23/11/2026, không còn cắt nghiệp vụ Admin Topup. Payment
claim PENDING → PROCESSING và ghi MANUAL_APPROVE_REQUESTED trong một transaction
trước khi gọi Wallet. Reject PENDING → REJECTED cùng audit, lý do 1–500 ký tự.
PROCESSING/APPROVED không được reject. Approve lại APPROVED không credit thêm.
Wallet/IPN/manual/recovery dùng chung topup.code. Unknown giữ PROCESSING; recovery
xử lý cả claim thủ công mà không giả vnpResponseCode thành mã đã thanh toán.

UI dùng khóa ref chống nhấn đúp; khi chưa rõ kết quả khóa dialog, chỉ GET danh
sách không lọc để đối chiếu đúng UUID. Chỉ mở lại sau trạng thái terminal. Không
đưa PROCESSING trở lại PENDING để thử một credit mới. NOT_ALLOWED chỉ còn là
fallback tương thích container cũ, không phải chính sách của source mới.

Đã PASS: 19 test Payment gồm PostgreSQL thật cho race/audit rollback/recovery;
26 test Admin UI; browser thật duyệt/từ chối, sai lý do, nhấn đúp, late IPN,
replay và race IPN/Admin, kiểm số dư/ledger/audit. Callback có HMAC là synthetic,
không phải thanh toán VNPAY sandbox thật. OpenAPI đã cập nhật route/status.

W4 vẫn tạm giữ để đối chiếu yêu cầu, không ghi là đã có bút toán đảo.


Cập nhật 23/11/2026. Nguyên chủ trì Admin, Khoa Wallet W2–W4, Hữu KYC/funding, Đạt review Đ20. Phạm vi: source hiện tại và kết quả Backend đã chạy riêng; chưa có nghiệm thu toàn bộ Admin UI mới.

## Trang và component

| Route đúng theo router | Page → component qua features/admin |
| --- | --- |
| `/admin` | AdminDashboardPage → AdminDashboard |
| `/admin/kyc` | AdminKycPage → AdminKycManager |
| `/admin/topups` | AdminTopupPage → AdminTopupManager |
| `/admin/reconciliation` | AdminReconciliationPage → AdminReconciliation |

Không dùng `/app/admin`. Guard yêu cầu đăng nhập và role ADMIN. Public entry: [index.ts](../../src/features/admin/index.ts). KYC viewer chỉ có hai ảnh/zoom, không có OCR/Face Match giả; URL ảnh không lưu storage.

## Hook, endpoint và cache

| API qua Gateway | Hàm/hook |
| --- | --- |
| GET `/api/admin/dashboard` | adminApi.getDashboardStats / useAdminDashboard |
| GET `/api/admin/kyc?page&limit&status&search` | getKycList / useAdminKycList |
| POST `/api/admin/kyc/{id}/review` | reviewKyc / useReviewKyc; `{status, detail?}`, reject bắt buộc lý do |
| PATCH `/api/admin/kyc/{id}/tier` | changeKycTier / useChangeKycTier; `{tier, reason}` |
| GET `/api/admin/kyc/{id}/documents` | getKycDocuments / useKycDocuments; có audit, cache ảnh gcTime 0 |
| GET `/api/payments/admin/topups?status` | getTopups / useAdminTopups |
| POST `/api/payments/admin/topups/{id}/approve` hoặc `/reject` | useApproveTopup / useRejectTopup; source mới duyệt/từ chối thủ công; container cũ có thể trả NOT_ALLOWED |
| POST `/api/admin/reconciliation/run?mode=quick|full` | useRunReconciliation |
| GET `/api/admin/reconciliation/reports?page&limit` | useReconciliationReports |
| GET `/api/admin/reconciliation/reports/{id}` | useReconciliationReport |
| POST `/api/admin/reconciliation/anomalies/{id}/adjust` | useAdjustAnomaly; `{direction, amount, reason}` |

Source: [admin.api.ts](../../src/features/admin/api/admin.api.ts), [admin.queries.ts](../../src/features/admin/api/admin.queries.ts), [reconciliation/api.ts](../../src/features/admin/reconciliation/api.ts), [queries.ts](../../src/features/admin/reconciliation/queries.ts). `adminKeys` phân nhánh dashboard/KYC/topup; `reconciliationKeys` phân list/detail. Mutation thành công invalidate các nhánh tương ứng; không giả thành công khi API từ chối.

UI có loading/error/retry/empty/success. Lọc status KYC đã được User hỗ trợ alias; cần kiểm live filter nhưng không ghi là backend chưa đọc được status.

## W2–W4 đã có và giới hạn đang giữ

- Wallet đã có list/detail/adjust thật. Nhận xét trong comment backend rằng W2–W4 chưa tồn tại là thông tin cũ, không phải căn cứ giao viết lại.
- Run/list có thể chỉ trả tóm tắt; lấy GET report detail để xem anomaly. API hiện có dạng `BALANCE_DRIFT` kèm `detail.mode=QUICK|FULL`; DB dùng `BALANCE_DRIFT_QUICK/FULL`. Cần giữ phân biệt type/mode khi đối chiếu UI/contract.
- Admin tự sinh `referenceId=adjust-anomaly-<id>`, FE không tự thêm Idempotency-Key. Reason 5–500 ký tự; amount chuỗi nguyên dương; direction CREDIT/DEBIT. Khóa nút khi đang gửi.
- 409 ALREADY_ADJUSTED: làm mới; 503 ADJUST_OUTCOME_UNKNOWN hoặc 409 ADJUSTMENT_OUTCOME_UNKNOWN: chỉ đọc lại, không tự gửi lại. Timeout chưa chứng minh chưa tác động.
- W4 hiện đồng bộ Wallet.balance về tổng ledger, ghi adjustment/audit, transactionId null, không tạo bút toán đảo. Kế hoạch K17 ghi bút toán đảo: cần Khoa/Nguyên chốt nghiệp vụ, chưa đánh dấu khớp hoàn toàn.
- Trường hợp số dư theo ledger thấp hơn heldBalance bị database rollback nhưng Admin nhận UNKNOWN. Lỗi cần guard nghiệp vụ đã xác nhận, hiện tạm gác theo yêu cầu Đạt; chưa có mã lỗi mới được triển khai.
- Quy tắc ẩn nút trong AGENTS.md và yêu cầu N18 khác nhau; báo cáo rõ khác biệt, không sửa AGENTS.md trong nhiệm vụ tài liệu này.

## Cách kiểm tra trên web

1. USER mở `/admin` phải bị chặn; ADMIN đọc Dashboard thật, kiểm lỗi mạng/empty.
2. `/admin/kyc`: lọc PENDING, xem hai ảnh, reject thiếu lý do bị chặn, reject hợp lệ và approve phản ánh đúng ở Profile/Notification.
3. `/admin/topups`: danh sách thật; kiểm duyệt/từ chối thủ công, credit/audit đúng một lần và race với IPN trên source mới.
4. `/admin/reconciliation`: run baseline, xem detail, kiểm type/mode; dùng fixture lệch trong stack test riêng. Gửi lặp/unknown không được tạo tác động mới.
5. Kiểm audit/ledger và RC1 ở Backend, không kết luận từ toast UI. Kịch bản điều chỉnh cần thống nhất W4 trước nghiệm thu cuối.

## Bằng chứng và phần còn mở

Các Node/Vitest trong `tests/admin.test.ts`, `tests/reconciliation.test.ts`, `src/test/admin.test.tsx`, `src/test/reconciliation.test.tsx` là test tự động; log N17/N18 cũ chỉ có giá trị theo revision lịch sử.

Phiên 22/11 đã kiểm Backend thật Admin → Wallet trên DB tạm: mismatch direction/amount bị từ chối, điều chỉnh thường có audit và ledger giữ nguyên, replay/concurrency an toàn, rollback khi ghi adjustment lỗi; đồng thời xác nhận lỗi heldBalance ở trên. Điều này không thay A8/RC1 qua UI hoặc quyết định bút toán đảo. [Seed H15/N20](../../../Backend/tests/acceptance/README.md) đã được kiểm riêng trên Compose.

Nguyên/Khoa giữ W4 và chính sách Admin Topup ở trạng thái OPEN; Đạt nhận bàn giao để chạy Đ21/Đ22. Không có thay đổi nghiệp vụ service trong lượt cập nhật tài liệu.


## Cập nhật 23/11/2026: sáu lỗi phát hiện qua browser smoke

Đạt đã sửa phần Frontend phục vụ nghiệm thu Đ22; không sửa backend, schema DB hoặc hợp đồng API trong lượt này.

| Lỗi trước khi sửa | Nguyên nhân | Thay đổi |
| --- | --- | --- |
| Tra người nhận gặp SERVICE_UNAVAILABLE/503 hiện lỗi Axios tiếng Anh | Thiếu ánh xạ mã và nhánh fallback HTTP 503 | `src/lib/apiResponse.ts` thêm SERVICE_UNAVAILABLE, KYC_OUTCOME_UNKNOWN, fallback 502/503/504 và fallback tiếng Việt cho HTTP chưa nhận diện. |
| Admin cập nhật KYC lỗi 503 hiện tiếng Anh | Cùng bộ ánh xạ lỗi dùng chung bị thiếu | Dùng thông báo tiếng Việt; lỗi cập nhật chưa rõ kết quả còn kích hoạt khóa thao tác. |
| Ảnh KYC vẫn hiển thị sau expiresAt | Chỉ in thời gian hết hạn, chưa có timer gỡ ảnh | `AdminKycDocumentsViewer.tsx` theo dõi hạn từ server, gỡ cả hai ảnh khi hết hạn, kiểm tra lại khi focus/quay về tab; nút Tải lại ảnh gọi GET mới qua endpoint có audit. Không tự tải liên tục. |
| Nhấn đúp duyệt gửi hai request | isPending chưa cập nhật giữa hai sự kiện đồng bộ | `AdminKycManager.tsx` đặt requestInFlight.current ngay trước await; lần gửi thứ hai bị chặn ngay. |
| Nhấn đúp đổi cấp gửi hai request | Cùng khoảng trễ cập nhật trạng thái React | Dùng chung khóa ref cho cả duyệt/từ chối và đổi cấp, giữ khóa đến hết mutation và cập nhật cache. |
| Sau lỗi chưa rõ kết quả vẫn sửa/gửi lại được | Catch chỉ hiện lỗi rồi mở lại form | Network error, 5xx hoặc KYC_OUTCOME_UNKNOWN giữ khóa cập nhật; khóa lý do, xác nhận, hủy và đổi hành động. Nút Kiểm tra trạng thái hồ sơ chỉ gửi GET. |

Khi kiểm tra một cập nhật chưa rõ kết quả, Frontend gọi GET `/api/admin/kyc` tìm theo email, đối chiếu đúng ID hồ sơ và trạng thái/cấp KYC dự kiến. Đổi cấp chỉ được xác nhận khi hồ sơ APPROVED và cấp khớp. Nếu kết quả không khớp, thiếu hồ sơ hoặc GET lỗi thì tiếp tục giữ khóa; không tự POST/PATCH lại. Khi khớp, tải lại danh sách và đóng form cũ. Khóa này thuộc vòng đời component hiện tại, không thay cho idempotency hoặc nhật ký kết quả ở backend.

Bằng chứng sau sửa:

- `npm run check`: PASS, 68 Node test; lint không có error, còn 16 warning hiện có; typecheck và build PASS.
- `npm run test:unit`: 258/258 test trong 30 file PASS. Sau điều chỉnh timer để tuân thủ React purity, chạy lại riêng `src/test/admin.test.tsx`: 22/22 PASS.
- `npm run test:browser`: PASS với HTTP fixture tổng hợp. Bộ test vẫn giữ các điều kiện phát hiện cả sáu lỗi, không bỏ assertion để lấy PASS.
- Kết quả hiện tại: `node_modules/.tmp/browser-smoke/result.json`; log trong `node_modules/.tmp/week4-six-fixes-*.log`. Đây là artifact local được Git bỏ qua, không phải bằng chứng E2E backend thật cho các thao tác Admin vừa sửa.
- Lượt live trước đó xác nhận KYC upload/ảnh MinIO/USER bị chặn API Admin và tra người nhận email/phone/429 trên stack riêng; chưa xác nhận toàn bộ giao dịch tiền thật hoặc hoàn thành toàn hệ thống Tuần 4.

### Cách thành viên tự kiểm tra trên web

1. Mở backend và frontend đang dùng tài khoản thử nghiệm; đăng nhập ADMIN, vào `/admin/kyc`, chọn một hồ sơ PENDING.
2. Chọn Duyệt rồi nhấn nhanh Xác nhận hai lần. Trong DevTools → Network chỉ có một POST `/api/admin/kyc/:id/review`. Khi thành công hồ sơ thành APPROVED/Cấp 1.
3. Với hồ sơ đã APPROVED, chọn Nâng Cấp 2, nhập lý do rồi nhấn nhanh Xác nhận hai lần. Chỉ có một PATCH `/api/admin/kyc/:id/tier`; cấp hiển thị theo dữ liệu trả về.
4. Bấm Xem hai mặt CCCD. Chờ đến thời gian hết hạn hiển thị: cả hai ảnh phải biến mất và có nút Tải lại ảnh. Bấm nút này mới phát sinh GET documents mới và hiển thị liên kết mới.
5. Để thử lỗi trên dữ liệu test, dùng DevTools Request blocking chặn URL review hoặc tier trước khi xác nhận. Sau request lỗi, lý do/Xác nhận/Hủy phải bị khóa. Bấm Kiểm tra trạng thái hồ sơ: chỉ được xuất hiện GET danh sách KYC, không có POST/PATCH mới. Nếu kết quả chưa khớp hoặc GET tiếp tục lỗi, form vẫn khóa. Sau thử nghiệm có thể bỏ chặn và tải lại trang để bắt đầu một phiên kiểm tra mới.
6. Lỗi SERVICE_UNAVAILABLE/503 phải có thông báo tiếng Việt; không còn `Request failed with status code 503` trên giao diện. Có thể tái hiện tự động bằng `npm run test:browser` mà không cần Docker vì bộ smoke này dùng HTTP fixture.
# Bổ sung W4 / A8 — 24/11/2026

Đạt chọn **sửa cache theo ledger, chưa đảo giao dịch gốc**. Hộp thoại và toast
đã đổi từ “tạo bút toán” thành “khôi phục số dư” vì backend không tạo ledger
transaction mới. Direction/amount vẫn được gửi để xác nhận đúng chênh lệch;
Admin dùng reference cố định. Đồng bộ nhãn để người vận hành hiểu đúng hành vi.

`AdjustAnomalyDialog` dùng ref khóa đồng bộ trước mutation để bấm đúp không
gửi hai POST; không đóng hộp thoại trong khi ref đang giữ. Backend vẫn là lớp
chống trùng cuối cùng. `REPAIR_CONFLICTS_WITH_HOLDS`, `DIRECTION_MISMATCH` và
`AMOUNT_MISMATCH` có thông báo tiếng Việt, không đưa message thô lên giao diện.

Đã kiểm 10/10 FE test và A8/RC1 live qua Admin/Wallet/PostgreSQL thật: lệch cache
+5000 được khôi phục, ledger và hold thật 50000 không đổi; audit SUCCEEDED,
replay 409, đối soát cuối không còn anomaly. `npm run check` PASS. Xem scope
`reconciliation` trong `tests/phase3-live.mjs` để chạy lại trên cụm riêng.
