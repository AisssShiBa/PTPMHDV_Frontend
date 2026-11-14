# Phase 3 — Top-up FE (2026-11-12)

## Trạng thái

**FE triển khai và regression PASS. Toàn bộ Phase 3 chưa được nghiệm thu live.** `REAL_VNPAY_SANDBOX = NOT_RUN`; `GATEWAY-ALIAS-CREATE = BLOCKED`. Không có bằng chứng credit/ledger trên database live trong lượt này.

## Thay đổi

- `pages/TopupPage.tsx` là trang mỏng; Funding sở hữu TopupWorkspace/Form/History/StatusPanel. Page và modal dùng cùng form/hook/adapter. Xóa modal VNPAY giả, timer tự SUCCESS/FAILED, phép tính Number và số dư dự kiến được coi như tiền đã nhận.
- Giữ bố cục thẻ nhập tiền/phương thức/hai cột theo thiết kế; thay các thẻ trạng thái demo bằng lịch sử API. Không hiển thị phí/hạn mức sử dụng/chi tiết ngân hàng chưa có contract. Preset bổ sung 50.000, số nhập tùy chọn kiểm Zod string/BigInt, phạm vi 10.000–100.000.000 VND.
- Đường tạo duy nhất: POST `/api/payments/topups`, không thử alias/fallback. Vẫn chặn live trước POST do BE chưa nhận string và chưa có idempotency. MSW test string/header không phải bằng chứng server đã hỗ trợ contract.
- Redirect chỉ nhận HTTPS có origin + pathname khớp chính xác `VITE_VNPAY_PAYMENT_URL`, không credentials/hash. Biến cấu hình không chứa bí mật; `.env.example` để trống. Đường dẫn sandbox ví dụ lấy từ BE `.env.example`; cần owner xác nhận/cấu hình deployment trước redirect. Không tự thêm domain production/localhost vào whitelist.
- Sau create, chỉ giữ topupId trong RAM của form để có link kiểm tra lệnh nếu URL không hợp lệ. Không lưu paymentUrl có chữ ký vào storage hoặc Query/mutation cache. Không thêm persistent storage. Khi reload/mở tab khác, recovery qua lịch sử account và exact code.
- Double click có latch, form khóa khi đang tạo/đã tạo/UNKNOWN. Timeout/response không giải mã được giữ UNKNOWN và không tự tạo lại. Lỗi chắc chắn chưa tạo (như contract guard/validation/4xx) cho phép chỉnh form; không dùng key cũ với payload khác.
- Return lấy UUID hợp lệ từ `topupId`, hoặc đối chiếu chính xác `vnp_TxnRef` với `code` trong GET `/api/payments/topups`. Chỉ duy nhất một match mới đọc GET `/api/payments/topups/:UUID`. Không chọn lệnh mới nhất, không dùng NAP làm UUID; UUID/code không khớp thì không hiện success.
- `vnp_ResponseCode=00` không quyết định trạng thái. Chỉ GET trả APPROVED mới hiện receipt thành công; FAILED/REJECTED/EXPIRED chỉ từ server. Polling budget kế thừa Phase 2; nút kiểm tra lại luôn là GET. Không có request IPN từ browser.
- Terminal status cập nhật query status từ response, invalidate lịch sử nạp và prefix ví theo account (bao gồm các query ledger thuộc prefix đó). Số dư receipt/header/sidebar dùng query ví, không cộng vào AuthStore. `/app` là link Về ví.
- RequireAuth giữ pathname + search khi chuyển sang đăng nhập. Form reset theo account; phiên quay lại bằng cookie refresh trước khi đọc lịch sử/status. Footer shell dùng đúng thông báo đồ án theo AGENTS.md.

## Chặn tích hợp và bước bàn giao

1. **Amount/idempotency**: BE `services/payment-service/src/validations/topup.validation.ts` vẫn `z.number()`, service create nhận number, controller không đọc key. Cần owner Đạt/Khoa chốt string contract và idempotency trước khi bỏ guard trong `funding.api.ts`. Không có ADR ép float tạm.
2. **Alias/Gateway**: wildcard `/api/funding` vẫn public, trong khi create cần Gateway signing. FE dùng legacy route, không tự sửa quyền backend trong lượt này. Alias chưa PASS.
3. **Return**: `VNP_RETURN_URL` mẫu vẫn trỏ endpoint backend trả JSON. FE route đã có, nhưng chưa có cấu hình sandbox hoặc BE redirect được owner triển khai/chốt. Không coi việc mở route FE bằng fixture là ngân hàng đã quay về đúng route. Sau khi chốt, phải test cookie session, correlation và status/IPN qua browser thật.
4. **Sandbox external**: chưa có môi trường callback reachable và cấu hình sandbox được xác nhận trong lượt này. Chạy lại IPN thật: hợp lệ; lặp 2/20 lần chỉ một credit/cặp ledger; sai chữ ký/amount/TMN không credit. Các case database/ledger/browser end-to-end này vẫn NOT_RUN.

## Evidence và lệnh

Thư mục `docs/evidence/huu-fe-phase3/`:

- `check.txt`: npm run check — lint 0 warning/error, typecheck, 32 Node tests, build PASS.
- `unit.txt`: Vitest 68/68, trong đó 14 test Topup Phase 3 mới. Bao gồm redirect allowlist, invalid input, một POST khi double submit, không storage signed URL, timeout không retry, đổi account, 401 safe trace, NAP exact/ambiguous/mismatch và server terminal.
- `browser.txt`, `browser/result.json`, PNG desktop/mobile/pending/approved: 7 nhóm production browser với HTTP fixture. Có full reload refresh và đăng nhập lại giữ query UUID. POST live bị guard; create/redirect được kiểm bằng MSW, không giả ghi nhận create live đã chạy.
- `profile-regression.txt`, `profile-regression/`: Auth/Profile/KYC production HTTP-fixture regression 6 nhóm.
- `backend-ipn-unit.txt`: 12/12 test source backend IPN trong image có sẵn, bind source/tests hiện tại read-only, network none và DATABASE_URL giả; fake store/wallet client. Đây là unit, không phải DB/ledger/sandbox live.
- `source-sha256.json`: snapshot source hiện tại; repo còn thay đổi chưa commit từ Phase 1–3.

Lệnh lặp: `npm run check`, `npm run test:unit`, `npm run test:topup:browser`; `BROWSER_EVIDENCE_DIR=docs/evidence/huu-fe-phase3/profile-regression npm run test:browser`.

Không thêm dependency, không sửa backend source, không commit/push/merge.


## Cập nhật sửa blocker Funding — 13/11/2026

Các trạng thái BLOCKED amount/Gateway trong các mục Phase 2–4 ở trên là lịch sử. Source hiện đã sửa Gateway để chỉ GET IPN/return chính xác được public; create/status/confirm Funding nhận signed identity từ Bearer. Backend nhận amount chuỗi nguyên VND (vẫn tương thích số nguyên legacy có giới hạn), lưu idempotency key UUID theo user và URL trong một lần ghi; retry cùng key/amount trả đúng lệnh/URL cũ, khác amount trả 422. Adapter FE đã bỏ chặn create live.

**Triển khai phải chạy migration payment `20261113090000_topup_idempotency` trước khi bật phiên bản mới.** Migration thêm cột nullable/index unique theo user, giữ dữ liệu cũ. Chỉ chạy thử migration trên acceptance DB cô lập trong phiên này. Caller FE luôn gửi key; caller legacy không gửi key vẫn chưa có bảo đảm replay. URL redirect FE vẫn cần `VITE_VNPAY_PAYMENT_URL` khớp chính xác endpoint triển khai; không nới allowlist để demo.

Evidence mới nhất: [bản sửa và kiểm chứng](../evidence/huu-fe-week4/fixes/README.md). Đây là giao dịch với terminal/IPN synthetic và payout mô phỏng qua Gateway/Postgres thật, không phải VNPAY sandbox thật. K18 đầy đủ và recovery create timeout mất UUID vẫn cần nghiệm thu/chốt lookup contract; không tự tạo ý định mới sau reload.
