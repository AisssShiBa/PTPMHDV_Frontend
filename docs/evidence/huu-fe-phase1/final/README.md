# Nghiệm thu Phase 1 — kết quả cuối

Ngày 12/11/2026. FE base `ec9e7764224c61cb1421008352be5e07688d3e5e`, BE base `1792e65f76cf175700900e21ccabea4c055c6aaf`; cả hai có thay đổi chưa commit. [SHA256 nguồn](source-sha256.json) định danh phần đang kiểm tra, không coi base SHA đã chứa code mới.

**PASS trong phạm vi Phase 1 Profile/KYC + các lỗi chặn quality gates/browser/live đã phát hiện.** Browser không còn bị chặn EPERM. Quality gate toàn FE xanh; có browser HTTP fixture và live thật trên stack cô lập. Không gọi toàn bộ funding, merchant, Admin UI hoặc P2P đã nghiệm thu.

## Kết quả thực chạy

| Lệnh | Kết quả | Evidence |
|---|---|---|
| `npm run check` | PASS: lint 0 errors/0 warnings, typecheck, Node 32/32, production build | [check.txt](check.txt) |
| `npm run test:unit` | PASS: 6 files, 35/35 tests; Profile/KYC 12/12 | [unit.txt](unit.txt) |
| `npm run test:browser` | PASS: 6 groups on current Auth/Profile/KYC routes; synthetic HTTP API | [browser.txt](browser.txt) |
| `node tests/profile-live.mjs with LIVE_ACCEPTANCE_RUN_FILE and DOCKER_HOST` | PASS: HU-F01/F02/F03/F04/F15 on isolated Gateway/Auth/User/Admin/MinIO | [live-run.txt](live-run.txt) |
| `npm run typecheck --workspace @finvault/mobile` | PASS: Mobile effects compile | [mobile-typecheck.txt](mobile-typecheck.txt) |
| `node node_modules/typescript/bin/tsc --noEmit (Backend/gateway)` | PASS: Gateway with installed declared dependencies | [gateway-typecheck.txt](gateway-typecheck.txt) |
| `node --test services/wallet-service/tests/system-wallet-migration.test.cjs` | PASS: 3 real PostgreSQL migration cases, all rolled back | [wallet-migration.txt](wallet-migration.txt) |
| `node --test services/auth-service/tests/session-migration.test.cjs` | PASS: 2 real PostgreSQL migration cases, all rolled back | [auth-migration.txt](auth-migration.txt) |
| `node --test tests/acceptance/week2/prepare.test.mjs` | PASS: 2 setup/isolation regressions | [backend-prepare.txt](backend-prepare.txt) |
| `node --test tests/acceptance/week2/reporting.test.mjs tests/acceptance/week2/host-ready.test.mjs` | PASS: 4 acceptance runner regressions | [backend-runner.txt](backend-runner.txt) |

[Manifest](commands.json) · [Browser fixtures](browser/result.json) · [Live backend](live/result.json).

## Những lỗi đã sửa

- AuthStore dùng API signin/refresh/signout thật, giữ access token trong memory, refresh đồng thời chung promise, chặn response của phiên cũ và logout trong khi refresh. Không cấp role hoặc token từ username demo.
- Sửa toàn bộ 29 lỗi lint và 28 cảnh báo nền đã báo: kiểu unknown/DTO thay any, vòng đời hooks/effects/refs, reset theo session, initializers ngẫu nhiên ở event/lazy state, tách router/Suspense và CVA constants khỏi component exports. Không đổi eslint.config.ts, không tắt rule.
- Notification dùng query theo account, socket callback ref cập nhật trong effect; chống decrement unread hai lần và xử lý đúng page sau polling. RealBalance query thay effect thiếu dependency.
- PIN chỉ nhận token từ Auth API với paymentId+amount; không tạo token Math.random, không tự áp dụng khóa 5 phút. Không callback token khi modal/owner/order đã đổi hoặc đóng; test đã PASS.
- TopupResult bỏ browser IPN/fake SUCCESS, dùng UUID topupId và trạng thái server; PROCESSING/timeout là chưa xác nhận. Có route `/app/topup/result` và regression test fake return. Đây không phải nghiệm thu toàn bộ topup flow/amount contract.
- Browser runner tự tìm browser, build `/api` tương đối và tắt MSW trước khi chạy server fixture. File `.env` development trỏ localhost:3000 không còn làm browser smoke gọi nhầm backend.
- Gateway: lazy Redis chưa connect nhưng rate limiter kiểm readiness trước mọi command, làm Auth luôn 503. Đã khởi tạo connect độc lập khi khởi động ngoài NODE_ENV=test; live signin/signup đã kiểm chứng.
- Wallet: hai migration cùng rename TOPUP_POOL, làm DB mới P3018. Đã kiểm tra source/target enum theo schema trước rename, bảo toàn ID/số dư; 3 regression thật PASS.
- Auth DB: thiếu familyId/revokedAt dù AuthService đã dùng; thêm migration mới có backfill family từ ID, bảo toàn hash/expiry/family hiện có; 2 regression thật PASS.
- Runner backend: dùng Redis secret của đúng project mới, SQL init đọc được bởi PostgreSQL trong thư mục private; có opt-in FINVAULT_ACCEPTANCE_ROOTLESS cho SELinux/Podman, không sửa production Compose.

## Browser và live matrix

| Case | Component/adapter | Browser HTTP fixture | Backend/Gateway thật |
|---|---|---|---|
| HU-F01 Profile lưu/reload | PASS | PASS | PASS: UI login, PUT, backend GET, cookie refresh/reload |
| HU-F02 hai mặt/chống trùng | PASS | PASS: raw multipart front/back/idNumber, 1 POST | PASS: 202, MinIO cả hai mặt, USER khác 403 |
| HU-F03 trạng thái/tier/reason | PASS | PASS | PASS: Admin API duyệt rồi từ chối, UI cập nhật tier/reason |
| HU-F04 URL TTL/ảnh/owner | PASS | PASS | PASS: ảnh private thật tải được, URL cũ request mới nhận 403 sau TTL |
| HU-F15 đổi account/logout | PASS | PASS | PASS: UI logout/login USER khác, không thấy reason/ảnh cũ |

Desktop 1280px, mobile 390px không overflow và Tab trong form đã kiểm browser fixture; mobile live có screenshot và không lỗi JavaScript. [Desktop](browser/profile-desktop.png), [mobile](browser/profile-mobile.png), [mobile live](live/live-profile-mobile.png).

## Môi trường live và dữ liệu

Project `finvault-acceptance-dadc7eef7537`, Gateway trong lượt chạy `http://127.0.0.1:40825`, PostgreSQL/Redis/RabbitMQ/MinIO/Auth/User/Admin/Wallet trên rootless Podman. Thư mục private: backend `.cache/acceptance-week2/finvault-acceptance-dadc7eef7537`; secrets không đưa vào evidence/commit.

Đã dừng và gỡ containers/network **chỉ project này**, giữ volumes và evidence, không dùng down -v. Podman API tạm có thể dừng; không cấu hình lại Docker daemon hệ thống. Các quyền SELinux chỉ được tắt trong override của project test, không thay Compose production, không relabel source tree.

Role ADMIN chỉ cấp cho tài khoản synthetic mới trong DB acceptance để kiểm Admin API. Không seed số dư, không chuyển tiền, không sử dụng CCCD thật. Signed URL/credential/PIN/token không lưu trong artifact; network chỉ ghi method/path/status và bỏ query.

## Ranh giới suite và lịch sử

Browser suite tháng 10 từng kiểm các UI hiện đã bị thay bằng scaffold/demo ở route khác. Giữ **nguyên byte** mọi assertion trong [browser-smoke-legacy.mjs](../../../../tests/browser-smoke-legacy.mjs), [checksum](legacy-preservation.json), có lệnh `test:browser:legacy`. Suite lịch sử chưa được tính PASS trong lượt này; các case merchant/Admin UI/P2P cũ là DEFERRED_ROUTE_MIGRATION. Smoke hiện tại kiểm Auth/Profile/KYC ở router thật; không giả claim phạm vi lịch sử đã xanh.

Các báo cáo BLOCKED/FAIL ở thư mục acceptance/retest trước đó là lịch sử; kết quả mới nhất ở đây. Không sửa Backend demo-seed/docs có sẵn của người dùng, không commit/push/merge.

## Chạy lại

```bash
# Frontend
npm run check
npm run test:unit
npm run test:browser
npm run typecheck --workspace @finvault/mobile
# Khi đã bật lại đúng stack acceptance và Podman API:
DOCKER_HOST=unix:///tmp/huu-fe-podman.sock \
LIVE_ACCEPTANCE_RUN_FILE="../PTPMHDV_Backend/.cache/acceptance-week2/finvault-acceptance-dadc7eef7537/run.json" \
BROWSER_PATH="$HOME/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome" \
npm run test:profile:live
```

Browser smoke tự build đúng /api tương đối; nếu chạy live riêng, build trước bằng `VITE_API_BASE_URL=/api VITE_USE_MOCK=false npm run build`. Muốn stack mới: dùng prepare() trong backend runner, FINVAULT_ACCEPTANCE_ROOTLESS=1 trên Podman/SELinux, rồi compose up với env/project/override được tạo. Không áp dụng lệnh resolve của DB thử lên DB hiện hữu. Xem [bàn giao sửa backend](../../../../../PTPMHDV_Backend/docs/handover/huu-phase1-startup-fixes.md).
