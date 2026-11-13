# PR backend phụ thuộc — bản nháp local

> **Cập nhật closeout:** [regression, demo accounts và video đã hoàn tất](huu-fe-closeout.md). Các dòng “chưa seed/chưa video/chưa rerun” bên dưới là trạng thái trước closeout. VNPAY sandbox, active Transfer UI/K18 và review/rollout/merge vẫn còn mở.

**Title:** fix(funding): authenticate user routes and persist idempotent string topups

DRAFT CONTENT ONLY; chưa commit/push/tạo PR. BE HEAD `1792e65f76cf175700900e21ccabea4c055c6aaf`, worktree có các sửa khác từ phiên trước cần phân biệt. Review Đạt/Khoa trước rollout.

## Problem and resulting behavior

Gateway trước đây whitelist toàn bộ Funding và mọi method dưới VNPAY, nên Bearer hợp lệ vẫn không được ký identity và service trả 401. Topup chỉ nhận number và tạo lệnh mới khi retry, khiến FE không thể gửi tiền chuỗi/idempotency an toàn.

Chỉ exact GET IPN/return được public. User endpoints xác thực Bearer và ký Gateway token ES256. Topup nhận chuỗi nguyên VND trong khoảng 10.000–100.000.000; numeric integer legacy cùng khoảng được normalize để tương thích. Key UUID tùy chọn cho legacy, FE bắt buộc gửi. Cùng user/key/amount trả UUID/URL cũ kể cả race; khác amount trả 422; URL và lệnh/audit persist cùng lần create.

## Paths của bản sửa Funding

- `gateway/src/middlewares/authenticate.ts`, `gateway/tests/funding-auth.test.ts`, script `test:funding` trong `gateway/package.json`.
- `services/payment-service/src/validations/topup.validation.ts`, `controllers/topup.controller.ts`, `services/topup.service.ts`.
- `services/payment-service/prisma/schema.prisma`, migration `20261113090000_topup_idempotency/migration.sql`.
- `services/payment-service/tests/topup-create.test.ts`.

Không tự stage các sửa Redis, Wallet/Auth migrations hoặc runtime acceptance có sẵn như một phần Funding nếu chưa thống nhất scope; những thay đổi đó có lịch sử riêng trong worktree. Không đưa `.cache`, `.env`, secrets, DB dumps vào PR.

## Persistence và rollout

Migration thêm `TopupRequest.idempotencyKey UUID NULL` và unique `(userId,idempotencyKey)`. Giữ các lệnh cũ có NULL; không backfill/xóa lịch sử. Source mới phải chạy migrate deploy trước phục vụ request create vì Prisma biết cột mới.

1. Review schema/migration/unique-conflict behavior và dependency với FE.
2. Theo quy trình môi trường đích, deploy migration payment trước khi bật source/FE mới; bằng chứng hiện tại chỉ áp dụng DB acceptance cô lập.
3. Kiểm authenticated create/status/cashout, callback public GET, retry cùng key và 422 khác payload. FE exact URL config theo deployment.
4. Nếu rollback application, giữ cột/index nullable đến khi owner có kế hoạch DB riêng; không chạy destructive down migration để rollback nhanh.

Legacy caller không gửi key vẫn không có replay guarantee. Migration không thay quyết định IPN/ledger/cashout state-machine. Production mock payout guard giữ nguyên; chỉ private test override đã bật bank mô phỏng.

## Validation

- Gateway regression PASS exact path/method/auth matrix; payment TypeScript build + Prisma generate PASS.
- Backend unit Topup/Cashout **34/34 PASS**, fake store, container `--network none`.
- Frontend `test:funding:live` **6 nhóm PASS qua Gateway/Auth/Payment/Wallet/Postgres**, string create + alias/legacy same-key concurrency, different payload/foreign owner, signed return read-only, invalid HMAC, 2/20 IPN exactly one credit/ledger, cashout SUCCESS/FAILED/UNKNOWN hold/balance/PIN replay.
- Migration applied/no-op rerun xác nhận trong DB acceptance, giữ volumes sau cleanup.

[Evidence mới nhất](../evidence/huu-fe-week4/fixes/README.md), [live assertions](../evidence/huu-fe-week4/fixes/funding-live/result.json), [hash nguồn](../evidence/huu-fe-week4/fixes/changed-source-sha256.json). Với PR BE thực, sao chép artifact đã rà secrets sang repo BE hoặc attach vào PR; link tương đối FE ở bản draft này không tự tồn tại trên GitHub BE.

## Remaining

REAL_VNPAY_SANDBOX và full K18 chưa chạy; full FE same-revision regression chưa đóng. Contract lookup cashout theo stable key khi timeout/reload mất UUID còn mở. Không gọi bản sửa local là đã owner-approve/deploy/merge.
