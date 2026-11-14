# Sửa lỗi sau Phase 7 — 13/11/2026

**Đã sửa code Gateway identity, topup string/idempotency và harness provisioning/routes.** Source local chưa commit; không claim merge/deploy hay full Phase 7 DoD. [Hash nguồn sửa](changed-source-sha256.json).

## Thay đổi

- Gateway chỉ public **GET đúng IPN/return** ở cả hai nhóm VNPAY routes. Create/cashout/status/confirm phải có Bearer hợp lệ và được ký identity ES256. Test mới kiểm callback method/path exact, token thiếu/sai và signed identity.
- Topup nhận chuỗi nguyên VND 10.000–100.000.000, tiếp tục nhận legacy integer trong khoảng này rồi normalize string. Không chuyển tiền chuỗi qua Number. Giá trị float/exponent/space/leading-zero bị chặn; Zod refine kiểm regex trước BigInt để dữ liệu sai trả validation error, không throw thành 500.
- Thêm `TopupRequest.idempotencyKey` nullable UUID và unique `(userId,idempotencyKey)`. URL ký và lệnh/audit được ghi cùng thao tác create; unique conflict do request đồng thời reconcile về cùng lệnh/URL. Cùng key khác amount trả 422; cùng key ở owner khác không dùng chung intent. Caller legacy không gửi key vẫn được chấp nhận, chưa có guarantee replay; FE luôn gửi key.
- Adapter FE bỏ chặn topup live, giữ exact redirect allowlist, tiền string, stable key và no automatic auth replay. Spec create đã sửa DTO/header/response.
- `phase3-live`: bounded wait profile/wallet sau signup; dùng `/sign-in`, `/app/profile`, trạng thái KYC hiện hành; evidence dir cấu hình được. Dialog chuyển tiền lịch sử không còn active: H11 kiểm API thật và ghi **API ONLY**, không làm giả coverage UI/P2P.
- Thêm `npm run test:funding:live`: chỉ nhận run.json đúng project acceptance local và terminal synthetic, account mới, request qua Gateway; đọc Postgres để đối chiếu ledger/hold. Không mint internal token để bypass Gateway. Tôn trọng cửa sổ rate-limit giữa các case.

## Kiểm chứng

| Kiểm tra | Kết quả | Evidence |
|---|---|---|
| FE `npm run check` | PASS lint/typecheck/Node test files/build | [fe-check.txt](fe-check.txt) |
| FE `npm run test:unit` | PASS 107/107 / 11 files | [fe-unit.txt](fe-unit.txt) |
| Gateway funding auth regression | PASS 1 nhóm: callback/auth path/method matrix | [gateway-unit.txt](gateway-unit.txt) |
| Backend Topup/Cashout unit | PASS 34/34, fake stores, container network none | [payment-unit.txt](payment-unit.txt) |
| Backend payment production build | PASS TypeScript + Prisma generate | [build](payment-build-final.txt) |
| Topup browser HTTP fixture | PASS 7 nhóm; create string/key, double click một POST, redirect config guard | [log](topup-browser.txt), [result](topup-browser/result.json) |
| `test:phase3:live` | PASS KYC browser + recipient API-only | [log](phase3live.txt), [result](phase3-live/result.json) |
| `npm run contract:lint` | VALID, 126 warnings trên spec | [contract-lint.txt](contract-lint.txt) |

107 thay vì 108 Vitest do bỏ test guard “chặn create live” đã hết hiệu lực; test create kiểm adapter ở chế độ live bằng MSW, vẫn yêu cầu string/key. Đây không phải test HTTP live.

## Funding live và môi trường

**LIVE_GATEWAY_FUNDING_PASS — 6 nhóm assertions đã PASS.** Kết quả cuối cùng nằm ở [funding-live/result.json](funding-live/result.json) và funding-live.txt. Có kiểm create string qua alias/legacy, concurrency/idempotency, foreign owner 403, return không credit, HMAC sai, IPN 2/20 lần, real ledger, cashout SUCCESS/FAILED/UNKNOWN và PIN replay. Không đọc raw secret trong artifact. Payout là **MÔ PHỎNG**; IPN synthetic không liên lạc VNPAY sandbox.

Project `finvault-acceptance-dadc7eef7537`, Podman API `/tmp/huu-fe-podman.sock`, Gateway `http://127.0.0.1:40825`; Node v22.23.1, timezone Asia/Ho_Chi_Minh. Health và migration ở environment.txt; migration `20261113090000_topup_idempotency` đã áp dụng thành công vào DB test, rerun migrate không tạo lại cột. Stack cleanup giữ volumes, xem cleanup.txt.

Chỉ cấu hình private của project acceptance được đặt terminal `SYNTH_TMN_CODE`, `MOCK_PAYOUT_ENABLED=true`, `NODE_ENV=test` cho payment để bật bank mô phỏng theo guard có sẵn. Không đổi production Compose hoặc secret source. Không dùng tài liệu KYC thật hoặc gửi tiền thật.

Chạy lại live sau khi khởi động đúng stack acceptance:

```bash
DOCKER_HOST=unix:///tmp/huu-fe-podman.sock \
LIVE_ACCEPTANCE_RUN_FILE="$PWD/../PTPMHDV_Backend/.cache/acceptance-week2/finvault-acceptance-dadc7eef7537/run.json" \
npm run test:funding:live

BROWSER_PATH=/home/nguyenhuu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome \
LIVE_API_ORIGIN=http://127.0.0.1:40825 \
BROWSER_EVIDENCE_DIR=docs/evidence/huu-fe-week4/fixes/phase3-live \
npm run test:phase3:live
```

Chạy build xong trước browser, tuần tự các suite dùng cùng dist; không nới rate-limit. Lần đầu Funding gặp 429 vì test gom quá nhiều cashout theo cùng owner; harness đã thêm chờ cửa sổ. Một lần khác assertion UNKNOWN dùng tên hold ACTIVE thay vì enum thực tế PENDING; sửa assertion và chạy lại. Không sửa backend hold để làm test xanh. `funding-live-first-attempt.*` giữ kết quả trước sửa assertion.

## Còn lại

- REAL_VNPAY_SANDBOX **NOT_RUN**; cần terminal sandbox thật, return reachable và exact FE payment endpoint.
- Full K18 Wallet/P2P / transfer UI **NOT_RUN** trong scope sửa này; không gọi toàn bộ HU-F01–HU-F16 PASS. Profile/Merchant trước sửa có evidence riêng trong thư mục cha; chưa rerun tất cả trên source mới.
- Cashout create timeout rồi reload mất UUID vẫn thiếu list/lookup-by-key contract. Không tự tạo intent khác để che kết quả chưa rõ.
- Owner Đạt/Khoa review thay đổi backend và rollout migration trước bật code FE mới. Không commit/push/merge.
