# Phase 7 — kết quả chạy lại ngày 13/11/2026

> **Có bản sửa mới:** [Gateway, topup contract/idempotency và live harness](fixes/README.md). Các blocker amount/identity và phase3-live dưới đây là kết quả trước sửa; xem evidence fixes cho phiên bản mới. Full K18/VNPAY sandbox vẫn chưa nghiệm thu.

**CHƯA ĐẠT DoD: browser và nhiều luồng live đã PASS; Funding và full K18 còn BLOCKED.** Kết quả mới dưới đây thay trạng thái chặn môi trường ở lần đầu, không đóng các blocker nghiệp vụ.

## Môi trường và revision

- FE `ec9e7764224c61cb1421008352be5e07688d3e5e`, BE `1792e65f76cf175700900e21ccabea4c055c6aaf`; worktree chưa commit. Không sửa source trong lần chạy lại; [hash nguồn](source-sha256.json) của lần đầu vẫn mô tả nguồn được test.
- Node v22.23.1, timezone Asia/Ho_Chi_Minh; [metadata/time](environment.json).
- Quyền mới cho phép localhost/Docker/Podman. Dùng Podman API `/tmp/huu-fe-podman.sock` và đúng project `finvault-acceptance-dadc7eef7537`, Gateway loopback port 40825. Postgres, Redis, RabbitMQ, MinIO và services healthy trước live; [stack startup](stack.txt).
- Dữ liệu synthetic mới; chỉ nâng quyền admin synthetic trong DB cô lập theo harness. Không ghi credential/PIN/token/raw key/signed KYC URL vào artifact. Không đổi backend hoặc cấu hình bảo mật để vượt test.
- `npm ci`: NOT_RUN; giữ dependencies đã cài. Clean install chưa xác nhận. Stack down không xóa volumes, xem cleanup.txt.

## Kiểm tra đã chạy lại

| Lệnh | Kết quả | Evidence |
|---|---|---|
| `npm run check` | PASS lint/typecheck/Node test files/build | [check.txt](check.txt) |
| `npm run test:unit` | PASS 108/108, 11 files | [unit.txt](unit.txt) |
| `npm run test:browser` | MOCK HTTP BROWSER PASS, 6 nhóm | [log](browser.txt), [result](profile-browser/result.json) |
| `npm run test:topup:browser` | MOCK HTTP BROWSER PASS, 7 nhóm | [log](topup.txt), [result](topup-browser/result.json) |
| `npm run test:cashout:browser` | MOCK HTTP BROWSER PASS, 6 nhóm | [log](cashout.txt), [result](cashout-browser/result.json) |
| `npm run test:merchant:browser` | MOCK HTTP BROWSER PASS, 6 nhóm | [log](merchant.txt), [result](merchant-browser/result.json) |
| `npm run test:profile:live` | HTTP LIVE PASS, 5 nhóm | [log](profile-live.txt), [result](profile-live/result.json) |
| `npm run test:merchant:live` | LIVE BROWSER PASS, 5 nhóm | [log](merchant-live.txt), [result](merchant-live/result.json) |
| `npm run test:merchant:tools:live` | LIVE BROWSER PASS, 5 nhóm, PDF và DB assertions | [log](merchant-tools-live.txt), [result](merchant-tools-live/result.json), [PDF](merchant-tools-live/merchant-qr.pdf) |
| `npm run test:phase3:live` | FAIL bước seed `PUT /users/by-auth/:id` trả 404 | [log](phase3live.txt), [result](phase3live-result.json) |
| Funding authenticated HTTP probes | BLOCKED Gateway identity/string contract | [result](funding-live-probes.json), [log](funding-probes.txt) |

Browser fixture commands dùng `BROWSER_EVIDENCE_DIR=docs/evidence/huu-fe-week4/<suite>` nếu harness hỗ trợ. Live dùng `DOCKER_HOST=unix:///tmp/huu-fe-podman.sock LIVE_ACCEPTANCE_RUN_FILE=<BE>/.cache/acceptance-week2/finvault-acceptance-dadc7eef7537/run.json`. Profile live cần `BROWSER_PATH=/home/nguyenhuu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`; phase3-live nhận `LIVE_API_ORIGIN=http://127.0.0.1:40825`.

Harness chưa hỗ trợ evidence directory (cashout/profile-live/tools-live) được chạy với backup/restore thư mục evidence cũ, copy kết quả mới vào Phase 7; không ghi đè lịch sử. Node runner báo 3 test files, không xuất tổng assertion bên trong: không ghi 32 cases cho phiên này.

## Ma trận nghiệm thu

Status đánh giá đầy đủ từng HU-F; unit/mock PASS không thay backend ledger E2E. Timestamp từng suite nằm trong result.json; coverage unit chung trong unit.txt.

| ID | Status | Evidence / blocker owner |
|---|---|---|
| HU-F01 | PASS | [Live Profile](profile-live/result.json): save/API/reload |
| HU-F02 | PASS | [Live Profile](profile-live/result.json): 2 faces/MinIO/double submit/foreign user |
| HU-F03 | PASS | [Live Profile](profile-live/result.json): Admin API reason/tier |
| HU-F04 | PASS | [Live Profile](profile-live/result.json): viewer expiry and uncached HTTP 403 |
| HU-F05 | BLOCKED | [Funding probes](funding-live-probes.json): alias authenticated 401; legacy string 400 — Đạt/Khoa |
| HU-F06 | BLOCKED | IPN replay/ledger not run; synthetic terminal config not compatible with existing VNPAY matrix — Khoa |
| HU-F07 | BLOCKED | Fake return unit/browser PASS; live HMAC/credit not run — Khoa/Đạt |
| HU-F08 | BLOCKED | Cashout live authenticated 401 INVALID_GATEWAY_TOKEN — Đạt; no capture/ledger E2E |
| HU-F09 | BLOCKED | Cashout mock FAIL/release UI PASS; no live release assertion — Đạt/Khoa |
| HU-F10 | BLOCKED | Cashout mock UNKNOWN/recovery PASS; no live held balance assertion — Đạt/Khoa |
| HU-F11 | BLOCKED | No client replay unit/browser PASS; no live token replay/ledger assertion — Đạt/Khoa |
| HU-F12 | PASS | [Merchant live](merchant-live/result.json): PENDING/REJECTED/APPROVED/reload |
| HU-F13 | PASS | [Merchant live](merchant-live/result.json) + [tools](merchant-tools-live/result.json): cross-owner HTTP rejection |
| HU-F14 | PASS | [Tools live](merchant-tools-live/result.json): signed QR/tamper/key/hash/revoke/PDF/DB outbox |
| HU-F15 | BLOCKED | Profile and Merchant live account switch PASS; full cashout cross-account/reload remains blocked — Đạt/Khoa |
| HU-F16 | BLOCKED | Existing Node Wallet/P2P adapter regression PASS; full K18 ledger/P2P suite NOT_RUN — Khoa |

## Lỗi và giới hạn cần xử lý

- **Đạt:** probe có/không Bearer đều trả 401 `INVALID_GATEWAY_TOKEN` cho POST `/funding/vnpay/create` và `/funding/cash-out`. Wildcard public Funding bỏ ký Gateway identity vẫn còn ở source; không kết luận rút tiền trái phép, không bypass guard để báo E2E PASS.
- **Khoa/Đạt:** authenticated legacy POST `/payments/topups` amount string trả 400 `VALIDATION_ERROR`; FE cố ý chặn live create thay vì ép Number. Chốt string/idempotency/route trước khi mở FE. Synthetic terminal của stack hiện tại không khớp cấu hình mà matrix VNPAY legacy yêu cầu; chưa chạy IPN 2/20 hoặc ledger. REAL_VNPAY_SANDBOX NOT_RUN.
- **Hữu:** `phase3-live` tạo account rồi PUT profile ngay, nhận 404. Các probe thấy profile signup ban đầu 404 rồi 200, phù hợp việc cấp hồ sơ bất đồng bộ; cần thêm bounded readiness check vào harness trước PUT. Đây là suy luận từ request evidence; chưa sửa harness. Suite profile-live hiện hữu chờ provisioning đã PASS.
- Merchant-tools lần đầu fail PENDING do request 429 sau nhiều suite liên tiếp. Sau cửa sổ giới hạn chạy lại tuần tự PASS. Các lần phase3-live trước lần cuối còn gặp build đang được suite khác tạo lại và 429; kết quả cuối vẫn FAIL seed 404. Cần tuần tự hóa build/HTTP suites và tôn trọng rate-limit khi chạy aggregate.
- Mobile 390/desktop 1280, keyboard profile và print PDF có assertions hiện hữu; chưa claim audit keyboard/DevTools đầy đủ mọi màn hoặc notification event delivery.
- HU-F15 có Profile/Merchant live PASS; giữ BLOCKED cho gate đầy đủ vì chưa test recovery/cross-account cashout. K18 full backend suite NOT_RUN dù Node transfer adapter regression PASS.

## Lịch sử và bước tiếp theo

`*-initial.txt` giữ lần chạy bị sandbox chặn. Trạng thái BLOCKED localhost/container của lần đó đã được gỡ trong retry này. Không lấy kết quả Phase 1–6 thay kết quả mới.

Đóng Funding contract/auth với Đạt/Khoa, cấu hình terminal synthetic riêng cho IPN matrix, bổ sung readiness harness và chạy full Wallet/P2P. Sau đó chạy lại toàn bộ Must cùng revision để đóng Phase 7; Phase 8 có thể chuẩn bị tài liệu nhưng chưa ghi P0 hoàn tất. Chưa commit/push/merge.
