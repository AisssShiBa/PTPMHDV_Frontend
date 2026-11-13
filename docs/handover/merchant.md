# Phase 5 — Merchant onboarding/status (2026-11-13)

## Kết quả

Đã nối đăng ký và portal vào API thật, tái dùng MerchantRegisterForm/MerchantStatusCard. Không còn form Highlands mặc định, setTimeout báo đăng ký giả, isRegistered/merchantId hardcoded, số liệu doanh thu/voucher/webhook ping giả hoặc thao tác toast không gọi server.

`MerchantRegisterPage` và `MerchantPortalPage` là trang mỏng qua feature index. MerchantOverview giữ bố cục thẻ của thiết kế, chỉ hiển thị các trường/trạng thái có contract. Không dựng lại chức năng Outlet/QR/API key của Phase 6: phần đã duyệt hiện hồ sơ/mã đối tác và làm điểm nối cho các module đó; không có nút tạo QR/key giả.

## Contract và cache

- GET `/api/merchants/me` dùng Axios singleton và AbortSignal, query key `['merchant', authUserId, 'me']`, gcTime 0, staleTime 0, retry false. Chỉ `success:true,data:null` là chưa đăng ký; 404/500, malformed envelope hoặc status không hợp lệ là lỗi tải qua QueryBoundary.
- Runtime schema kiểm UUID/status và bỏ field thừa khỏi response trước khi cache. Query so ownerId với tài khoản hiện tại; không lấy merchantId từ query string để thay thế `/me`.
- POST `/api/merchants/register` gửi đúng `{businessName,taxId?,bankAccount?}`. Form khởi tạo trống; trim, bỏ optional blank, giới hạn 200/50/100 ký tự theo BE. Không gửi businessType, representativeName, address, storePhoto, ownerId hoặc role.
- Latch và disabled state ngăn double click. Không có idempotency contract cho đăng ký; chỉ dựa unique owner của BE, không tự giả đặt key như giao dịch Funding. POST tắt auth replay bằng cờ Axios hiện hữu.
- Sau POST, khóa gửi và đọc lại `/me`; không dùng response POST để tự gán PENDING/APPROVED hay bật quyền. POST timeout/network/5xx/duplicate/malformed response yêu cầu kiểm tra trạng thái trước khi gửi lại. Không tạo mutation cache chứa dữ liệu ngân hàng.
- Đổi tài khoản remount form, hủy GET cũ và bỏ callback POST sau unmount/đổi user. Không lưu form/merchant/token vào localStorage/sessionStorage. Bank account trên status card chỉ hiện bốn ký tự cuối.
- Auth role vẫn USER; quyền Merchant dựa ownerId/status backend. PENDING/REJECTED/APPROVED hiển thị đúng API, không suy diễn APPROVED khi đăng ký thành công. BE không cung cấp lý do từ chối nên không bịa field/lý do.

## Kiểm chứng

Evidence ở `docs/evidence/huu-fe-phase5/`:

- `check.txt`: npm run check — lint/typecheck/32 Node tests/build PASS.
- `unit.txt`: 96/96 Vitest, gồm 13 test Merchant mới: null, trạng thái, lỗi 404/500, strict DTO, double submit, ambiguous POST/duplicate -> status lookup, owner mismatch, malformed status, request abort và delayed result khi đổi tài khoản.
- `browser.txt`, `browser/result.json`, PNG: 6 nhóm production browser với HTTP fixture; có lỗi 404/500 không mở form và responsive 390px.
- `live.txt`, `live/result.json`, PNG: **5 nhóm production browser qua Gateway/Auth/Merchant/Postgres thật**. User mới đăng nhập, null mở đăng ký, double click chỉ một POST, GET trả PENDING; admin API đổi REJECTED -> PENDING -> APPROVED rồi UI đọc lại; owner USER không tự duyệt (403), owner B không GET hồ sơ A bằng ID (403), đăng ký trùng (409), đổi tài khoản không lộ hồ sơ và mobile 390px.
- `backend-unit.txt`: 7/7 test my-merchant/merchant source BE hiện tại trong container, fake Prisma qua Supertest. Không gọi đây là DB integration; live browser ở trên dùng DB thật.
- `profile-regression.txt`, `profile-regression/`: Auth/Profile/KYC browser HTTP-fixture regression 6 nhóm.
- `source-sha256.json`: source snapshot liên quan. Worktree còn thay đổi chưa commit từ các phase trước.

## Môi trường live và tái chạy

Lượt live dùng project cô lập `finvault-acceptance-dadc7eef7537` đã có từ nghiệm thu trước. Bật Gateway/Merchant và các dependency, thêm user-publisher/user-consumer/merchant-publisher để cấp hồ sơ/wallet qua broker. Không reset DB, không sửa backend source; chỉ thêm account/merchant tổng hợp. Chỉ account admin tổng hợp vừa tạo được nâng role trong DB test để gọi status API; không thay role tài khoản thực.

Browser test chạy frontend tại `http://localhost:<port>` và reverse proxy `/api` đến Gateway local, phù hợp CORS localhost có sẵn. Địa chỉ 127.0.0.1 cho Origin browser bị Auth chặn; sửa test origin, không nới chính sách BE. Helper browser xử lý an toàn thời điểm document.body chưa có khi điều hướng.

Lệnh: `npm run test:merchant:browser`; `DOCKER_HOST=unix:///tmp/huu-fe-podman.sock LIVE_ACCEPTANCE_RUN_FILE=<isolated-run.json> npm run test:merchant:live`. Live runner kiểm project/path/loopback trước khi seed; không ghi password/access token/cookie vào evidence.

Sau nghiệm thu, stack được `down --remove-orphans` không `-v`; giữ volumes và cấu hình test private cho lần sau. API Podman tạm cũng dừng. Dữ liệu tổng hợp còn trong volumes. `stack-cleanup.txt` ghi cleanup.

Không thêm dependency; không commit/push/merge. Các chặn live Funding Phase 3–4 không được coi là đã sửa bởi Phase 5 này.


## Cập nhật Phase 6

Portal đã nối Outlet, QR và API key. Mô tả Phase 5 về phần management chưa có là lịch sử. Contract/security/evidence mới tại `merchant-tools.md`; không tự thêm API list keys hoặc fake inventory.


## Bàn giao Phase 8 — 13/11/2026

[Bản tổng hợp hiện trạng/test/blocker](huu-fe-phase8.md) · [Runbook demo và fixture manifest](huu-fe-demo-runbook.md) · [PR FE nháp](huu-fe-pr-draft.md). Kết quả Phase 1–6 ở trên là lịch sử. Các lỗi Gateway/topup contract đã sửa local và có [evidence mới](../evidence/huu-fe-week4/fixes/README.md); không dùng handover lịch sử để kết luận Funding vẫn BLOCKED hoặc mọi P0 đã hoàn thành. Phase 8 chuẩn bị tài liệu/review local, chưa seed demo, quay video, tạo PR hoặc merge.


## Closeout tự thực hiện — 13/11/2026

[Evidence closeout](../evidence/huu-fe-closeout/README.md): đã chạy lại 9 suite cùng nguồn product, seed 6 tài khoản demo private, rehearsal/video live; 11 P2P + 5 Wallet acceptance cuối đều PASS sau sửa harness. Không sửa nghiệp vụ P2P. Active Transfer UI/K18 mapping, VNPAY sandbox thật và review/rollout/merge vẫn chờ phối hợp.
