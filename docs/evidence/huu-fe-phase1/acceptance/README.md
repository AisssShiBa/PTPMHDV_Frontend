# FE-H01 — Kết quả nghiệm thu Phase 1

**Kết quả cuối mới nhất:** [Phase 1 PASS](../final/README.md) — check/Node 32/Vitest 35/browser/live đã qua. Phần dưới giữ lịch sử các lượt trước.

**Kết quả mới sau khi người dùng cài dependencies:** [retest](../retest/README.md) — Profile/KYC 12/12, Vitest 28/28, typecheck/build PASS; global check FAIL, browser/live BLOCKED. Nội dung dưới đây giữ lại kết quả lịch sử.

**Kết luận: CHƯA ĐẠT NGHIỆM THU (BLOCKED).** Không có assertion Profile/KYC, quality gate hoặc browser/live nào PASS trong lượt này. Không đánh checkbox DoD hoàn thành.

Ngày 12/11/2026, Asia/Ho_Chi_Minh; timestamps lệnh trong [manifest](commands.json) dùng UTC. FE base `ec9e7764224c61cb1421008352be5e07688d3e5e`, BE `1792e65f76cf175700900e21ccabea4c055c6aaf`. Nhánh `feat/huu-fe-phase0-audit`, working tree có thay đổi chưa commit. [SHA256 nguồn được kiểm tra](source-sha256.json) định danh code hiện tại; base HEAD không bao gồm phần code chưa commit. Node v22.23.1, npm 10.9.8.

## Kết quả lệnh thực chạy

| Lệnh | Exit | Kết quả | Log |
|---|---:|---|---|
| `npm run check` | 127 | BLOCKED: eslint chưa cài, check dừng tại lint | [check.txt](check.txt) |
| `npm run lint` | 127 | BLOCKED: eslint chưa cài | [lint.txt](lint.txt) |
| `npm run typecheck` | 127 | BLOCKED: tsc chưa cài | [typecheck.txt](typecheck.txt) |
| `npm test` | 1 | BLOCKED: TypeScript thiếu, 3 test-file failures trước khi chạy assertions | [test-node.txt](test-node.txt) |
| `npm run test:unit -- src/test/userProfile.test.tsx` | 127 | BLOCKED: vitest chưa cài, 11 ca Profile/KYC không được thực thi | [test-profile.txt](test-profile.txt) |
| `npm run test:unit` | 127 | BLOCKED: vitest chưa cài | [test-unit.txt](test-unit.txt) |
| `npm run build` | 127 | BLOCKED: tsc chưa cài | [build.txt](build.txt) |
| `BROWSER_PATH=<Chromium đã tìm thấy> npm run test:browser` | 1 | BLOCKED: đã đặt browser thật, thiếu dist/index.html | [test-browser.txt](test-browser.txt) |
| `BROWSER_PATH=<Chromium đã tìm thấy> npm run test:phase3:live` | 1 | BLOCKED: thiếu bản build, chưa gọi Gateway | [test-phase3-live.txt](test-phase3-live.txt) |
| `docker ps --format {{.Names}} {{.Status}}` | 1 | BLOCKED: không có quyền đọc Docker socket | [docker.txt](docker.txt) |
| `curl --max-time 5 -sS -o /tmp/huu-acceptance-health.json -w %{http_code} http://127.0.0.1:3000/health` | 7 | BLOCKED: kết nối Gateway localhost:3000 thất bại (HTTP 000) | [gateway-health.txt](gateway-health.txt) |

- Thử npm ci từ cache offline và registry: đều exit 1. Cache được sao chép sang `/tmp` để không ghi vào cache ngoài workspace; cache không đủ bộ dependencies lock hiện tại. [Offline lần đầu](npm-ci-offline.txt), [offline đúng cache](npm-ci-cached.txt), [registry/DNS](npm-ci-network.txt). Không sửa manifest/lockfile để thay bằng phiên bản khác rồi báo PASS.
- Chromium tìm thấy tại `/home/nguyenhuu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`, `--version` trả Google Chrome for Testing 145.0.7632.6. Browser executable không còn là blocker chưa tìm thấy; chưa có evidence launch UI vì chưa build được.
- [Kiểm tra cú pháp](syntax-check.txt): PASS parse TS/TSX bằng esbuild có sẵn trong npx cache; **không** resolve dependencies, typecheck hoặc chạy component. Chỉ là kiểm tra cú pháp độc lập với quality gate.
- [git diff --check](diff-check.txt): exit 0. Không phải lint/typecheck.

## Lỗi phát hiện và sửa trong lượt nghiệm thu

`KycForm.needsReload` được đặt khi kết quả upload không rõ, nhưng trước đó nút tải lại chỉ refetch, không reset cờ khi backend vẫn trả NONE/REJECTED. Người dùng bị khóa form đến khi rời trang.

Đã sửa: callback reload trả kết quả thành công của **cả profile và KYC status**; chỉ mở khóa sau reconcile thành công, không tự gửi lại upload. Nếu reconcile thất bại, giữ khóa. Không tự suy luận upload đã thành công hoặc gọi lại POST. Bổ sung ca hồi quy cho reconcile thất bại → thành công → người dùng chủ động gửi lại; thêm ca loading/empty. Tổng suite mới hiện có 11 ca dự kiến, nhưng **chưa chạy được**. Lỗi được khắc phục ở code, chưa xác minh runtime; không ghi regression PASS.

## Matrix nghiệm thu phạm vi Phase 1

| ID / tiêu chí | Kiểm chứng dự kiến | Kết quả lần này | Điều kiện còn thiếu |
|---|---|---|---|
| HU-F01: Profile save/reload | Vitest/MSW PUT đúng DTO + remount, browser + API thật | BLOCKED | dependencies, build; Auth thật/Gateway cho live |
| HU-F02: KYC hai mặt | schema tests, UI multipart/double-submit, storage qua stack | BLOCKED | dependencies; stack/Gateway/MinIO cho live |
| HU-F03: reason/tier và trạng thái | Vitest/MSW NONE/PENDING/APPROVED/REJECTED, Admin API thật | BLOCKED | dependencies; Admin/User API thật và dữ liệu synthetic |
| HU-F04: URL TTL / ảnh không lộ | Vitest TTL/remount owner; MinIO request mới sau TTL | BLOCKED | Vitest và stack; chưa test URL TTL thật |
| HU-F15: account switch/logout | Vitest late response + draft removal; browser auth thật | BLOCKED | dependencies; AuthStore signIn/refresh/signOut còn mock |
| Timeout upload/reconcile | Test mới không auto POST, chỉ unlock sau GET thành công | BLOCKED | test-profile chưa thực thi |
| Loading/error/empty/success | Test mới + error/retry + state tests | BLOCKED | test-profile chưa thực thi |
| Desktop 1280 / mobile 390 / keyboard | Browser tương tác thực, screenshot và overflow assertions | BLOCKED | dist/build và fixture harness đúng route |
| Không demo success/signed URL storage | Đọc code thay đổi; parser/diff check | Review tĩnh, runtime NOT_RUN | cần browser assertions/log checks |

## Blocker cần đóng

1. **Dependencies + lockfile (owner FE foundation/Đạt):** ngoài lỗi DNS, manifest và lockfile đã lệch ở base hiện có: lock thiếu `@redocly/cli`, `@stoplight/prism-cli`, `concurrently` và workspaces. [So sánh JSON](dependency-drift.json). Cần đồng bộ lock với package manifest đã được team duyệt, sau đó `npm ci` thành công. Không sửa lock ngoại tuyến bằng cách bỏ tool hoặc thay version để vượt nghiệm thu.
2. **Quality:** có dependencies đúng rồi chạy lại `npm run check`, `npm run test:unit -- src/test/userProfile.test.tsx`, `npm run test:unit`. Nếu lỗi code/test xuất hiện phải sửa và ghi log mới; hiện chưa biết code có qua typecheck hay không.
3. **Browser:** build production mới dùng `/api` tương đối; đặt BROWSER_PATH ở trên. `browser-smoke.mjs` còn route lịch sử, cần migrate assertions cho `/app/profile` trước khi dùng làm evidence H01. Không tính browser binary tồn tại là UI PASS.
4. **Live (owner Đạt/môi trường):** AuthStore vẫn mock đăng nhập/refresh/signOut. Gateway chưa reachable; Docker socket không truy cập được trong phiên này, chưa có stack cô lập để kiểm tra DB/MinIO/Admin thật. Không bypass auth hoặc đổi role/tạo dữ liệu trên stack không xác định.

[Handover hiện tại](../../../handover/kyc.md) · [Baseline cũ](../README.md) · [Contract matrix](../../../handover/huu-fe-contract-matrix.md).

Không commit/push/merge; không sửa BE/AuthStore nghiệp vụ, không xóa dữ liệu/volume hoặc thay credential. Phiên nghiệm thu đã thực hiện các kiểm tra khả dụng và lưu bằng chứng; để gọi Phase 1 hoàn tất vẫn cần quality gates + browser + live evidence mới trên cùng nguồn.
