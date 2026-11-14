# Phase 6 — Outlet, QR và API key (2026-11-13)

## Kết quả và contract

Portal đã có quản lý điểm bán và key thật. Module gắn với merchant do GET `/merchants/me` trả về; không nhận merchantId từ người dùng để truy cập merchant khác. Tạo Outlet, xem QR và tạo key chỉ xuất hiện khi APPROVED. Thu hồi key vẫn dành cho owner ở cả trạng thái khác vì BE cho phép thao tác giảm quyền này.

- GET `/api/merchants/:id/outlets`: `{content,page,limit,totalElements,totalPages}`, phân trang 10 mục; owner/merchant/page query key, AbortSignal, gcTime 0. Không cache QR/raw key trong query.
- POST cùng route: `{name,code}`; name trim 1–200, code `[A-Za-z0-9_-]{3,64}`. Chống double submit. 400/409 không tự retry; lỗi mạng/5xx/malformed response giữ form khóa và yêu cầu kiểm tra list trước khi tạo ý định khác. Không có idempotency contract cho Outlet; BE code unique toàn hệ thống.
- GET `/:id/outlets/:outletId/qr`: version 1, merchantId, outletId, outletCode, issuedAt, token, signature, algorithm HMAC-SHA256. FE kiểm binding metadata và render nguyên `token` qua QRCodeSVG, không ghép lại canonical body/ký HMAC/kiểm chữ ký ở FE. Không bịa TTL vì response không có expiresAt.
- POST `/:id/api-keys`: body `{}`, raw `key` chỉ từ server, kèm metadata `keyId/prefix/revokedAt/lastUsedAt/createdAt`. Tắt Axios auth replay, không mutation cache, không tự retry. API key được kiểm keyId prefix binding trong response rồi giữ ở state modal đang mở; callback chỉ đưa metadata không raw ra ngoài modal.
- DELETE `/:id/api-keys/:keyId`: UUID, không gửi raw key. Có bước xác nhận, chống click trùng; response phải có revokedAt và đúng keyId trước khi báo đã thu hồi. Retry do người dùng thao tác là idempotent theo BE.

Không thêm GET api-keys vì chưa có contract. UI ghi rõ metadata vừa thao tác chỉ thuộc phiên này, không phải toàn bộ key đang active. Có ô nhập keyId để người dùng tự thu hồi key đã lưu, không cần lưu raw secret trong app.

## Bảo vệ dữ liệu và in QR

Raw key không đi vào Query/mutation cache, localStorage/sessionStorage, URL, thông báo hoặc log. Chỉ copy clipboard khi người dùng bấm; nếu clipboard lỗi, UI không báo sao chép thành công. Đóng modal/unmount/logout/đổi account hoặc trạng thái merchant làm module remount và xóa bản raw hiển thị. Không có nút xem lại key; tạo lại modal mới chưa gọi server cho đến khi người dùng xác nhận.

Sau lỗi tạo key, nút xác nhận bị khóa cho lần mở đó. Đóng modal không thu hồi key đã tạo trên server; nếu response bị mất, chưa có keyId để revoke hoặc API list để phục hồi. Không tự phát sinh lần tạo thứ hai. Đây là giới hạn contract hiện tại, đã thông báo trong modal, không dựng inventory giả.

QR cũng chỉ ở state modal; close/unmount abort GET và bỏ response trễ. Dữ liệu list không chứa token. QR được in bằng window.print và CSS print chỉ giữ standee, không có endpoint export PDF hoặc file key. qrcode.react 4.2.0 là dependency nằm trong ngoại lệ AGENTS.md, đã cập nhật package/lockfile; không thêm thư viện khác.

## Kiểm chứng

`docs/evidence/huu-fe-phase6/`:

- `check.txt`: npm run check PASS, lint/typecheck/32 Node tests/build.
- `unit.txt`: Vitest 108/108, gồm 12 test Merchant tools mới. Có status gate, code validation, duplicate submit/409, QR binding/print/không cache, raw key không storage/cache, close/view-again, response trễ, account switch, no retry và revoke/replay.
- `backend-unit.txt`: 12/12 test Outlet/API key source hiện tại trong container network none, fake Prisma/Supertest. Kiểm M01–M07 gồm ký QR, tamper/cross scope, hashing, verification/revocation; không gọi đây là DB integration.
- `live.txt`, `live/result.json`, ba PNG và `live/merchant-qr.pdf`: **5 nhóm browser production qua Gateway/Auth/Merchant/Postgres thật**. M02 PENDING/REJECTED 409, APPROVED mở chức năng; M01/M04 create một lần/list phân trang/duplicate 409; M08 version +1 và đúng một outbox event trong DB; M05 SVG khớp token server, verifier server từ chối sửa token/chéo merchant, QR cross-outlet 404 và browser print-to-PDF; M03 cross-owner 403; M06/M07 key một lần/hash DB/revoke và replay không raw; mobile 390px/refresh không xem lại key.
- `onboarding-regression.txt`, `onboarding-regression/`: 6 nhóm Merchant onboarding HTTP-fixture browser.
- `profile-regression.txt`, `profile-regression/`: 6 nhóm Auth/Profile/KYC HTTP-fixture browser.
- `source-sha256.json`: snapshot source liên quan; repo vẫn chứa work chưa commit từ các phase trước.

Live runner chỉ chấp nhận run.json của project acceptance local. Dùng account/merchant/outlet tổng hợp mới; chỉ nâng role account admin tổng hợp vừa tạo để thay status. Khóa live tạo trong test được thu hồi. Không lưu raw key/password/access token/cookie vào evidence, không screenshot modal raw key. PDF chứa QR công khai dành cho standee, không chứa secret key ký hay API key.

Project `finvault-acceptance-dadc7eef7537` đã down --remove-orphans, không xóa volumes; API Podman tạm dừng. Không reset DB, không sửa source BE, không commit/push/merge. Funding live blockers Phase 3–4 vẫn giữ nguyên.

Lệnh tái chạy: `npm run check`; `npm run test:unit`; `DOCKER_HOST=unix:///tmp/huu-fe-podman.sock LIVE_ACCEPTANCE_RUN_FILE=<isolated-run.json> npm run test:merchant:tools:live`. Cần stack có Gateway/Merchant/User/Auth cùng publisher/consumer; frontend browser dùng localhost theo CORS có sẵn. Live runner kiểm PDF bằng pdftotext, dùng Chromium cài sẵn.


## Bàn giao Phase 8 — 13/11/2026

[Bản tổng hợp hiện trạng/test/blocker](huu-fe-phase8.md) · [Runbook demo và fixture manifest](huu-fe-demo-runbook.md) · [PR FE nháp](huu-fe-pr-draft.md). Kết quả Phase 1–6 ở trên là lịch sử. Các lỗi Gateway/topup contract đã sửa local và có [evidence mới](../evidence/huu-fe-week4/fixes/README.md); không dùng handover lịch sử để kết luận Funding vẫn BLOCKED hoặc mọi P0 đã hoàn thành. Phase 8 chuẩn bị tài liệu/review local, chưa seed demo, quay video, tạo PR hoặc merge.


## Closeout tự thực hiện — 13/11/2026

[Evidence closeout](../evidence/huu-fe-closeout/README.md): đã chạy lại 9 suite cùng nguồn product, seed 6 tài khoản demo private, rehearsal/video live; 11 P2P + 5 Wallet acceptance cuối đều PASS sau sửa harness. Không sửa nghiệp vụ P2P. Active Transfer UI/K18 mapping, VNPAY sandbox thật và review/rollout/merge vẫn chờ phối hợp.
