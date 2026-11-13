# Phase 1 — Nghiệm thu lại sau khi cài dependencies

**Kết quả cuối mới nhất:** [Phase 1 PASS](../final/README.md) — check/Node 32/Vitest 35/browser/live đã qua. Phần dưới giữ lịch sử các lượt trước.

12/11/2026, Asia/Ho_Chi_Minh. FE base `ec9e7764224c61cb1421008352be5e07688d3e5e`, branch `feat/huu-fe-phase0-audit`, code chưa commit. Node v22.23.1, Vitest 3.2.7, TypeScript 6.0.3. Người dùng đã cài dependencies và cập nhật package-lock.json; root manifest/lock dependencies hiện khớp. Không ghi đè thay đổi lockfile của người dùng.

**Profile/KYC qua các kiểm tra tự động trong phạm vi Phase 1: 12/12 test; toàn bộ Vitest 28/28, typecheck/build và lint phạm vi đều PASS. Chưa nghiệm thu toàn bộ Phase 1:** `npm run check`/Node auth suite còn FAIL ở baseline chung; browser/live vẫn BLOCKED.

[Manifest lệnh và kết quả](commands.json) · [SHA256 nguồn](source-sha256.json) · [Handover](../../../handover/kyc.md).

## Lệnh thực chạy

| Lệnh | Exit | Kết quả | Log |
|---|---:|---|---|
| `npm run test:unit` | 0 | PASS: 4 files, 28/28 tests; Profile/KYC 12/12 | [unit-final.txt](unit-final.txt) |
| `npm run typecheck` | 0 | PASS: TypeScript 6.0.3 | [typecheck-final.txt](typecheck-final.txt) |
| `npm run build` | 0 | PASS: production bundle generated | [build-final.txt](build-final.txt) |
| `node_modules/.bin/eslint src/features/user src/pages/ProfilePage.tsx src/features/auth/index.ts src/test/userProfile.test.tsx` | 0 | PASS: no errors/warnings in Phase 1 scope | [lint-profile-final.txt](lint-profile-final.txt) |
| `node --import ./tests/register.mjs --test tests/contracts.test.ts` | 0 | PASS: Node contract test file passed | [contracts-final.txt](contracts-final.txt) |
| `node --import ./tests/register.mjs --test --test-name-pattern='KYC service' tests/auth-api.test.ts` | 0 | PASS: KYC adapter test selected; not whole auth suite | [kyc-node.txt](kyc-node.txt) |
| `npm run check` | 1 | FAIL: stops at lint: 29 pre-existing errors, 28 warnings | [check-final.txt](check-final.txt) |
| `npm test` | 1 | FAIL: 2 test files pass, auth-api.test.ts fails; also fails at baseline HEAD | [node-initial.txt](node-initial.txt) |
| `BROWSER_PATH=<cached Chromium> npm run test:browser` | 1 | BLOCKED: localhost listen EPERM; no browser assertions executed | [browser-original.txt](browser-original.txt) |
| `curl http://127.0.0.1:3000/health --max-time 3` | 7 | BLOCKED: Gateway not reachable; no live test | [gateway-health.txt](gateway-health.txt) |
| `docker ps` | 1 | BLOCKED: Docker socket permission denied | [docker.txt](docker.txt) |
| `git diff --check` | 0 | PASS: whitespace only | [diff-check.txt](diff-check.txt) |

## Phân loại evidence

- Vitest gồm 12 ca Profile/KYC: save/reload; reason/tier; PENDING/APPROVED; thiếu/đủ ảnh và double submit; recovery sau timeout; stale account/logout; loading/empty; error/retry; revoke preview URL; signed URL TTL/refetch; đổi owner khi đang xem ảnh.
- GET/PUT/status/error tests dùng MSW, upload test dùng mock tại Axios post boundary để kiểm tra FormData/DTO và UI: jsdom File stream không tương thích Node Request.formData trong MSW handler. Không đổi production transport để làm test xanh. KYC Node adapter test cũng PASS. **Đây chưa phải HTTP multipart với Gateway/MinIO thật.**
- Typecheck toàn repo và build production đều thực sự chạy exit 0; lint riêng toàn bộ feature user, page, auth barrel và test mới exit 0.
- Không có browser/UI responsive screenshot mới hoặc LIVE PASS. Browser harness hiện có dừng ở server.listen EPERM trên 127.0.0.1 trước khi launch/assert UI. Vẫn cần migrate harness route lịch sử và bàn giao Auth thật trước live. Chromium/build không còn là blocker thiếu cài đặt.

## Lỗi được xử lý trong phạm vi Phase 1

- Tách handler submit vào callback sự kiện để lint không diễn giải ref chống double-submit là đọc ref trong render; không bỏ ref chống gửi trùng, không tắt rule lint.
- Preview ảnh đồng bộ src với DOM ref trong effect, revoke URL khi đổi file/unmount/lỗi decode; bỏ setState đồng bộ trong effect. Thêm ca kiểm tra revoke khi đổi file và unmount, đã PASS.
- Recovery upload không chắc kết quả chỉ mở khóa sau GET profile và GET status đều thành công; không tự POST lại. Ca hồi quy đã PASS.
- Sửa test upload để không treo ở Node Request.formData với jsdom File; vẫn assert endpoint, FormData front/back/idNumber, một POST và PENDING từ response.

## Lỗi chung đã đối chiếu baseline

Đã xuất `git archive HEAD` vào `/tmp/huu-fe-baseline-ec9e776`, dùng symlink tới cùng dependencies đã cài để so sánh read-only; không đổi HEAD/branch hoặc reset working tree. Baseline dùng cùng toolchain hiện tại, không phải mô phỏng toolchain lịch sử.

[Lint baseline](lint-baseline.json) có 32 errors/28 warnings; [lint hiện tại](lint-current-final.json) có 29 errors/28 warnings. [So sánh](lint-comparison.json): **0 lỗi mới**, đã loại 3 lỗi trong ProfileForm/KycForm; toàn bộ lỗi còn lại có cùng path/rule/line/column ở base. Các module khác gồm Mobile, notification, merchant, wallet, funding demo, v.v. Không tự sửa nghiệp vụ của owner khác hoặc tắt lint để đạt global check.

`npm test` hiện có 2 file pass và 1 file Auth fail. [Chạy Auth trên baseline](auth-baseline.txt) cũng exit 1; AuthStore vẫn mock signIn/refresh, không tương thích kỳ vọng API thật trong tests/auth-api.test.ts. Không bỏ/skip suite để làm npm test xanh. Filter riêng KYC adapter đã chạy PASS, không gọi cả auth suite PASS.

## Matrix HU-F01–HU-F04 / HU-F15

| Case | Component/adapter | Browser | Gateway/DB/MinIO thật |
|---|---|---|---|
| HU-F01 Profile lưu/reload | PASS (Vitest/MSW) | BLOCKED: localhost listen EPERM | BLOCKED: Gateway/Auth |
| HU-F02 upload hai mặt/chống trùng | PASS (Axios boundary + Node contract) | BLOCKED | BLOCKED: chưa xác nhận multipart/storage thật |
| HU-F03 trạng thái/tier/reason | PASS (Vitest/MSW) | BLOCKED | BLOCKED: chưa Admin duyệt/từ chối trên stack |
| HU-F04 TTL/owner/preview cleanup | PASS (Vitest mock timers/API) | BLOCKED | BLOCKED: chưa TTL MinIO thật |
| HU-F15 stale account/logout | PASS (Vitest state transition) | BLOCKED | BLOCKED: AuthStore còn mock |

Để đóng nghiệm thu cuối: owner xử lý lint/Auth chung cho npm run check xanh; chạy browser trong môi trường cho phép mở localhost và có harness đúng route; chạy live với Gateway/Auth/User/Admin/MinIO cô lập. Không tự suy ra toàn bộ phase DONE từ unit/build PASS. Chưa commit/push/merge, không sửa backend hoặc dữ liệu thật.
