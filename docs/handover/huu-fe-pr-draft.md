# PR frontend — bản nháp local

> **Cập nhật closeout:** [regression, demo accounts và video đã hoàn tất](huu-fe-closeout.md). Các dòng “chưa seed/chưa video/chưa rerun” bên dưới là trạng thái trước closeout. VNPAY sandbox, active Transfer UI/K18 và review/rollout/merge vẫn còn mở.

**Title:** feat(huu): integrate Profile/KYC, Funding and Merchant web flows

Status: DRAFT CONTENT ONLY. Chưa tạo PR remote, chưa commit/push, chưa xác nhận base branch remote. Local branch `feat/huu-fe-phase0-audit`; FE HEAD `ec9e7764224c61cb1421008352be5e07688d3e5e`. Cần viết lại title/scope theo staged diff cuối trước khi mở PR. Không gộp thay đổi của owner khác chỉ vì đang chung worktree.

## Summary

Các route Profile/KYC, Topup, Withdraw và Merchant chuyển từ dữ liệu demo sang feature/API flow. Profile upload hai mặt và hiển thị status/tier/reason từ server; Funding dùng tiền chuỗi, stable idempotency key, PIN gắn đúng lệnh và recovery qua GET; Merchant đăng ký/status, outlet, QR server-signed và API key một lần. Callback VNPAY không tự làm giao dịch thành công hoặc gửi IPN từ browser.

Khi confirm mất kết nối, UI giữ kết quả chưa rõ và đọc status, tránh gửi lại token. Khi key creation mất response, UI không tự tạo key mới. Scope Web của Hữu; full transfer UI/K18 và VNPAY sandbox thật còn thiếu nghiệm thu.

## Changed paths cần review

| Nhóm | Paths |
|---|---|
| Profile/KYC | `src/features/user/`, `src/pages/ProfilePage.tsx` |
| Funding/Wallet adapters | `src/features/funding/`, `src/features/payment/components/TopupResultPanel.tsx`, `src/features/payment/services/paymentService.ts`, `src/features/wallet/`, `src/pages/TopupPage.tsx`, `TopupResult.tsx`, `WithdrawPage.tsx`, `src/lib/money.ts` |
| Merchant | `src/features/merchant/`, `src/pages/MerchantRegisterPage.tsx`, `MerchantPortalPage.tsx`, `src/styles/index.css` |
| Foundation chờ owner review | `src/features/auth/`, `src/app/`, `src/lib/{axios,apiResponse,format}.ts`, shared hooks/components/layouts và notification adapters |
| Tests/contracts/docs | `src/test/`, `tests/`, `packages/api-contract/openapi.yaml`, `.env.example`, `package*.json`, `docs/handover/`, evidence được chọn sau kiểm secrets |

Danh sách là review map, không phải lệnh `git add` trọn folder. Worktree còn `apps/mobile/App.tsx`, Admin/common/notification và các sửa foundation từ các phiên trước; phối hợp owner trước đưa vào PR hoặc chia commit. Dependency `qrcode.react` thuộc ngoại lệ repo; không thêm dependency Phase 8.

## API contract và dependency

| Endpoint qua `/api` | Owner/source | Trạng thái |
|---|---|---|
| `/users/by-auth/:id`, `/users/me/kyc`, `/users/kyc/documents` | Hữu/User | FE integrated; live KYC/profile có evidence |
| `/payments/topups`, `/funding/vnpay/create` | Khoa/Đạt, BE controller/service/validation | Local fix string + key; cần backend/migration deploy trước FE |
| `/funding/vnpay/ipn`, `/return` và legacy callback | Đạt/Khoa | Chỉ GET callback public, server HMAC; synthetic HTTP đã kiểm |
| `/funding/cash-out`, `/:id`, `/:id/confirm`, `/auth/pin/verify` | Khoa/Đạt | Live Gateway/Auth/ledger với payout mô phỏng PASS |
| `/merchants/me`, `/register`, `/:id/outlets`, `/:id/outlets/:outletId/qr`, `/:id/api-keys` | Hữu/Merchant | FE integrated; live evidence trước bản sửa Funding |

**Blocked for standalone rollout:** [backend PR draft](huu-be-funding-pr-draft.md), migration `20261113090000_topup_idempotency` phải áp dụng trước code FE tạo topup mới. Giữ exact `VITE_VNPAY_PAYMENT_URL` theo deployment; biến này trống sẽ chặn redirect.

## Tests actually executed

| Lệnh / case | Kết quả | Evidence |
|---|---|---|
| `npm run check` | PASS lint/typecheck/3 Node test files/build | [check](../evidence/huu-fe-week4/fixes/fe-check.txt) |
| `npm run test:unit` | PASS 107/107 | [unit](../evidence/huu-fe-week4/fixes/fe-unit.txt) |
| `npm run test:topup:browser` | 7 groups HTTP-fixture PASS | [result](../evidence/huu-fe-week4/fixes/topup-browser/result.json) |
| `npm run test:phase3:live` | KYC browser + recipient API-only PASS | [result](../evidence/huu-fe-week4/fixes/phase3-live/result.json) |
| `npm run test:funding:live` | 6 groups Gateway/Auth/Payment/Wallet/Postgres PASS | [result](../evidence/huu-fe-week4/fixes/funding-live/result.json) |
| `npm run contract:lint` | VALID, 126 warnings | [log](../evidence/huu-fe-week4/fixes/contract-lint.txt) |

Profile/Merchant/tools browser live có evidence trước bản sửa Funding; xem [handover](huu-fe-phase8.md), không tính lại như mới chạy toàn bộ. Phase 8 thay đổi docs, không chạy lại product tests vì không sửa source thực thi.

## Security review

- [x] Unit/HTTP assertions cho tiền string, idempotency và PIN binding/replay; HMAC sai/return không credit, ledger một credit qua 2/20 IPN.
- [x] Tests cho owner isolation, cache/reset khi account switch; API key raw không storage/cache và chỉ state modal.
- [x] Không commit credential trong bộ tài liệu Phase 8; chỉ dẫn synthetic và artifact có gắn nguồn.
- [ ] Review source/evidence toàn bộ staged diff lần cuối trước public; review chéo chưa thực hiện.
- [ ] Nghiệm thu đầy đủ same-revision Must, UI/DevTools toàn bộ màn và K18.

## Open blockers

| Mục | Owner | Next action |
|---|---|---|
| REAL_VNPAY_SANDBOX NOT_RUN | Đạt/Khoa | Terminal/return/redirect reachable, chạy giao dịch sandbox và đối chiếu server/ledger |
| Full K18/transfer UI NOT_RUN | Khoa/Hữu | Active UI integration và full regression; H11 hiện chỉ API |
| Full regression cùng revision | Hữu/owners | Rerun mọi Must sau review revision cuối |
| Reload mất UUID sau create timeout | Khoa/Đạt | Contract lookup/list theo stable key, không tự tạo intent khác |
| Review/rollout migration BE | Đạt/Khoa | Review BE draft, migrate môi trường đích rồi rollout |

## Demo

[Runbook/fixture manifest/screenshots/PDF](huu-fe-demo-runbook.md). Video/rehearsal và tài khoản demo tương tác Phase 8 chưa chuẩn bị. Không dùng fixture receipt để nói VNPAY sandbox đã PASS. Chưa commit, push, mở PR hoặc merge.
