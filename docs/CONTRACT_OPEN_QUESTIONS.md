# API contract open questions

`packages/api-contract/openapi.yaml` is now the consolidated contract (N21). Every
path was read from the real Express routers on Backend `origin/main` (`0b78fb5`)
and cross-checked against the Gateway mount table in `gateway/src/app.ts`.

- `paths` holds the real route keys **without** the `/api` prefix, and the same
  path items are repeated under `/api/...` at the end of `paths` so Prism can
  serve them (Prism serves path keys directly and ignores `servers[].url`).
- `x-planned-paths` is **empty**: no route the Web client calls is missing from
  the Backend. It stays in the file so an unknown route can be recorded here and
  in this document instead of being invented in `paths`.
- Prism enforces the global `bearerAuth` scheme, so protected mocks answer `401`
  until the caller sends any `Authorization: Bearer <token>` header.

## Contract-wide conventions confirmed from the Backend

- Success envelope: `{ success: true, data, message? }`; error envelope:
  `{ success: false, error: { code, message, details? }, requestId? }`.
- Money is a decimal **string** in wallet/payment responses. Two exceptions are
  recorded in the schemas on purpose: P2P `quote.fee` is a JSON number `0`, and
  the VNPAY top-up `amount` request field is a JSON number.
- `Idempotency-Key` is required by `/payments/p2p/checkout`, `/payments/checkout`,
  `/funding/cash-out`, `/utilities/topup`, and `/utilities/bills/pay`. It is
  **not** accepted by the admin adjust routes below.

## Đạt — auth and admin

Confirmed and now encoded in the contract:

- `POST /auth/signup` answers `201` with `data = { userId, user }`.
- Web sign-in/refresh put the refresh token in the httpOnly `refreshToken`
  cookie scoped to `/api/auth`; mobile clients receive it in the body when
  `x-client-platform: mobile` (or body `platform: mobile`) is sent.
- `POST /auth/pin/verify` returns `{ transactionToken, expiresIn, message }` —
  the field is `expiresIn` (seconds), not `expiresInSeconds`.
- `GET /auth/pin/status` returns `{ hasPin, isLocked, remainingLockSeconds }`.

Still to fix or confirm:

- **QR polling secret mismatch (bug).** The Backend reads the polling secret from
  `?pollSecret=` or the `x-poll-secret` header. `src/features/auth/api/auth.api.ts`
  sends `?secret=`, which the Backend ignores and rejects with `400 BAD_REQUEST`.
  The contract documents `pollSecret`. Fix the client query name (or add a
  Backend alias) before shipping QR sign-in.
- **QR status enum mismatch (bug).** Backend statuses are exactly
  `PENDING | APPROVED | REJECTED`; an expired session is `410 QR_EXPIRED`.
  The FE type also lists `SCANNED | CONFIRMED | EXPIRED`, which never occur.
- Confirm the exact `AuthUser` fields the FE may rely on (`id`, `username`,
  `email`, `firstName`, `lastName`, `role` are documented).
- `/admin/*` paths, query parameters and bodies are confirmed. The KYC `status`
  filter is still effectively ignored (see below).

## Khoa — wallets and payments

Confirmed and now encoded in the contract:

- `GET /wallets/me` returns `{ id, userId, balance, heldBalance,
  availableBalance, currency, status, createdAt, updatedAt }`;
  `GET /wallets/me/ledger` returns `{ items, nextCursor }` with
  `id` as a stringified `BigInt`.
- `GET /wallets/{userId}/balance` has a different, smaller shape (no `id`);
  `GET /wallets/{userId}/history` is offset-paginated with `from`/`to`.
- `/wallets/{userId}/{credit,debit,transfer}` are internal-service/ADMIN only.
- `POST /payments/p2p/quote` returns `{ destinationUserId, amount, fee, expiresAt }`
  where `fee` is the JSON number `0`.
- Admin top-up approve/reject always answer `400 NOT_ALLOWED` while VNPAY IPN
  owns crediting; neither route accepts an `Idempotency-Key`.
- `POST /funding/cash-out` takes `{ amount, destination? }` and its `GET` status
  route is the documented recovery path after a timeout.

Still to confirm:

- Admin reconciliation W2–W4 (`/wallets/admin/reconciliation/reports`,
  `/reports/{id}`, `/anomalies/{id}/adjust`) are implemented in
  `walletReconciliationClient.ts` but may not be on wallet-service `main` yet.
  Until they are, the UI surfaces `WALLET_UNAVAILABLE`/`WALLET_TIMEOUT` in
  Vietnamese. Confirm the rollout with Khoa before RC1 sign-off.
- `POST /wallets/admin/{userId}/adjust` and
  `POST /wallets/admin/reconciliation/anomalies/{id}/adjust` derive their
  `referenceId` server-side and do not accept `Idempotency-Key`; confirm that
  repeated submissions should surface `409` rather than be retried.
- Confirm whether manual top-up approval/rejection is permanently disabled so
  the FE can drop the buttons.

## Hữu — users and merchants

Confirmed and now encoded in the contract:

- `GET /users/{id}` resolves either a local profile id or an auth user id and
  answers `409 AMBIGUOUS_IDENTIFIER` when both match; the Web client prefers
  `/users/by-auth/{id}`.
- `GET /users/me` and `/users/me/kyc` are the owner routes; `POST /users/me/kyc`
  and `/users/kyc/documents` accept `multipart/form-data` with `idNumber`,
  `front`, `back` (each image capped at 5 MB).
- `GET /merchants/me` returns `data: null` when the owner has not registered;
  a `404` is a deployment/API error, not "not registered".
- `GET /merchants/{id}/outlets/{outletId}/qr` returns the signed QR payload.
  **QR điểm bán chỉ hiển thị, không có route xác minh trên Web** — the client
  renders it and never validates or redeems it.

Still to confirm:

- Whether merchant KYC/profile fields will gain `taxId`/`bankAccount`
  validation rules beyond length (the Backend only checks length today).

## Frontend follow-up

- Notification routes are `/notifications/me`, `/me/read-all`, `/{id}/read`, and
  `/socket-ticket`; Socket.IO authenticates with `auth: { ticket }`. The
  Backend has no `type` or `unread` query filter, so the Web page filters the
  loaded pages in the browser.
- Device registration (`/notifications/devices`) exists on the Backend but has
  no Web design yet; the Web app does not call it.
- Admin KYC list (N17): the FE sends `status` as documented, but admin-service
  forwards it while user-service reads `kycStatus`, so the server-side filter is
  effectively ignored. The FE does not filter client-side, to avoid masking the
  bug.
- AGENTS.md §6.6 still says to hide the reconciliation adjustment button, but the
  Week-4 plan (N18) requires it. The implementation follows the Week-4 plan;
  Đạt needs to confirm and update AGENTS.md.
- Amount types differ per flow and must not be conflated: utilities top-up
  `amount` is a **string** denomination, VNPAY top-up `amount` accepts a **string** (bounded legacy integers remain compatible),
  and every wallet/payment response amount is a **string**.


## Cập nhật trục Hữu — 13/11/2026 (source local chưa commit)

| Vấn đề | Trạng thái hiện tại / nguồn | Còn phải làm |
|---|---|---|
| Funding wildcard public | FIXED local: BE `gateway/src/middlewares/authenticate.ts`; chỉ GET IPN/return public | Owner Đạt review và deploy; không suy ra đã merge |
| Amount topup | FIXED local: BE `src/validations/topup.validation.ts`; FE gửi string, legacy integer được normalize | Khoa/Đạt review; đối chiếu spec đã cập nhật |
| Idempotency create topup | FIXED local: `TopupRequest` unique `(userId,idempotencyKey)`, URL/lệnh cùng ghi, payload conflict 422 | Chạy migration `20261113090000_topup_idempotency` ở môi trường đích trước rollout |
| Provisioning profile sau signup | Harness `phase3-live` đã bounded wait profile/wallet; profile route `/app/profile`, signin `/sign-in` | Không xem signup response là profile đã sẵn sàng |
| Funding REAL_VNPAY_SANDBOX | OPEN | Terminal sandbox thật, return URL reachable và exact FE redirect endpoint — Đạt/Khoa |
| Cashout create timeout rồi reload mất UUID | OPEN | Chốt list/lookup theo idempotency key — Khoa/Đạt |
| Full K18 regression / Transfer UI | OPEN | Harness cũ có dialog không còn active; H11 hiện chỉ kiểm API, không claim UI/P2P đã nghiệm thu — Khoa/Hữu |

Nguồn và kết quả test: [Phase 7 fixes](evidence/huu-fe-week4/fixes/README.md). Không có PR/issue URL vì chưa tạo/push; các trạng thái FIXED local không tương đương owner review hoặc release.


## Phase 8 — bàn giao trạng thái 13/11/2026

[Bàn giao](handover/huu-fe-phase8.md) và [runbook demo](handover/huu-fe-demo-runbook.md) là điểm vào hiện hành. Gateway identity, string amount và idempotency đã có LIVE_GATEWAY_FUNDING_PASS trong evidence bản sửa; review/rollout vẫn pending. Các câu hỏi legacy phía trên giữ cho owner đối chiếu, không phải khẳng định API trục Hữu chưa tích hợp.

Còn mở: VNPAY sandbox thật; full K18/active transfer UI; full Must cùng revision sau review; lookup cashout theo idempotency khi reload mất UUID; phục hồi metadata key sau mất response. Tài khoản demo tier 0/1/2, merchant pending/approved và rehearsal/video Phase 8 chưa chuẩn bị. Không tự đóng câu hỏi Auth/Admin/notification của owner khác. Chưa có link PR/issue remote vì hiện chỉ có [draft FE](handover/huu-fe-pr-draft.md) và [draft BE](handover/huu-be-funding-pr-draft.md), chưa publish.


## Sau closeout tự chủ — 13/11/2026

[Evidence mới nhất](evidence/huu-fe-closeout/README.md): regression 9 suite, demo/video, ma trận Wallet/P2P hiện hữu đã thực thi, kết quả cuối PASS sau sửa harness. Các mục demo chưa seed/video chưa quay ở trên là lịch sử. Còn mở: VNPAY sandbox thật, active Transfer UI/mapping K18 với Khoa, lookup cashout mất UUID/key, owner review/rollout và PR/merge. Không coi backend regression PASS là active P2P UI đã tích hợp.
