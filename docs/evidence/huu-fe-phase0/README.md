# Phase 0 — Evidence baseline Hữu FE

Ngày thực hiện 12/11/2026, Asia/Ho_Chi_Minh (UTC+7); lệnh trong commands.json ghi thời điểm UTC khi đã thu thập. Các lệnh setup/check bổ sung không có timestamp riêng trong log, không suy đoán timestamp chính xác. FE `ec9e7764224c61cb1421008352be5e07688d3e5e`, BE `1792e65f76cf175700900e21ccabea4c055c6aaf`; nhánh `feat/huu-fe-phase0-audit` từ FE HEAD local. Node v22.23.1, npm 10.9.8; registerHooks có trong runtime. Dependencies ban đầu chưa có, không tìm thấy browser qua PATH, chưa có dist.

**Không có quality gate hoặc live test PASS.** Các lệnh đã gọi trả lỗi điều kiện môi trường, được phân loại BLOCKED; chưa có assertion ứng dụng đạt. Node test runner báo 3 test-file failures/0 pass do thiếu TypeScript trước khi chạy nội dung test, không phải 3 ca nghiệp vụ đã được nghiệm thu.

[Audit và blocker](../../handover/huu-fe-phase0-audit.md) · [Contract matrix](../../handover/huu-fe-contract-matrix.md) · [Lệnh dạng JSON](commands.json).

## Setup

| Hành động | Exit | Trạng thái | Evidence |
|---|---:|---|---|
| git fetch origin | 128 | BLOCKED (SSH config permissions) | [git-fetch.txt](git-fetch.txt) |
| git switch -c feat/huu-fe-phase0-audit | 0 | PASS, chỉ tạo nhánh local từ HEAD | [git-branch.txt](git-branch.txt) |
| npm ci --offline --ignore-scripts --cache /tmp/huu-fe-npm-cache | 1 | BLOCKED (cache trống ENOTCACHED) | [npm-ci.txt](npm-ci.txt) |
| npm ci --cache /tmp/huu-fe-npm-cache --fetch-retries=0 --fetch-timeout=15000 | 1 | BLOCKED (DNS EAI_AGAIN) | [npm-ci-network.txt](npm-ci-network.txt) |

## Quality / browser

| Lệnh | Exit | Kết quả | Evidence |
|---|---:|---|---|
| `npm run lint` | 127 | BLOCKED: Missing dependencies | [lint.txt](lint.txt) |
| `npm run typecheck` | 127 | BLOCKED: Missing dependencies | [typecheck.txt](typecheck.txt) |
| `npm test` | 1 | BLOCKED: Missing dependencies | [test.txt](test.txt) |
| `npm run build` | 127 | BLOCKED: Missing dependencies | [build.txt](build.txt) |
| `npm run test:unit` | 127 | BLOCKED: Missing dependencies | [test-unit.txt](test-unit.txt) |
| `npm run test:browser` | 1 | BLOCKED: Chromium unavailable | [test-browser.txt](test-browser.txt) |
| `npm run test:phase3:live` | 1 | BLOCKED: Production build unavailable; no live requests sent | [test-phase3-live.txt](test-phase3-live.txt) |
| `npm run check` | 127 | BLOCKED: eslint unavailable; subsequent gates did not execute within check | [check.txt](check.txt) |

## Chạy lại khi môi trường sẵn sàng

1. Khắc phục SSH/DNS của máy, xác nhận nhánh/base trước fetch/rebase; không reset thay đổi local.
2. Cài dependencies bằng npm ci tại FE root; dùng Node theo repo/toolchain (ưu tiên Node 24 đã được tài liệu lịch sử dùng). Kiểm tra registerHooks và engines thực tế thay vì kết luận chỉ từ major version.
3. Chạy npm run check; chạy riêng npm run test:unit để phủ Vitest. Check hiện không bao gồm Vitest.
4. Đặt BROWSER_PATH tới binary Chrome/Chromium thực có; build production dùng /api tương đối, chạy browser smoke sau khi migrate route/assertions cũ. Kết quả harness này là MOCK BROWSER.
5. Xác nhận stack acceptance cô lập và Gateway local, đặt LIVE_API_ORIGIN. Chạy phase3-live khi dist/browser/auth sẵn sàng; script có thể tạo account synthetic nhưng chưa có coverage Funding/Merchant mới. Không chạy vào dữ liệu dùng chung để lấy PASS.
6. Chỉ cập nhật status với log của lần chạy mới; không thay BLOCKED thành PASS dựa báo cáo lịch sử.

Không đọc/ghi credentials, không lưu PIN/token/raw API key/signed URL trong evidence. Không sửa code nghiệp vụ, khởi động stack, seed account hay thay dữ liệu backend. Log .txt được lưu để không bị quy tắc *.log bỏ qua khi bàn giao; không thay .gitignore.
