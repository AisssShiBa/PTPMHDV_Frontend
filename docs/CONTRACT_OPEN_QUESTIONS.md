# API contract open questions

The mock examples are representative and must be confirmed against the owning backend service. Planned v2 routes live under the `x-planned-paths` extension and are not exposed by Prism.

## Đạt — auth and admin

- Confirm signup/signin/signout response envelopes, HTTP statuses and exact user fields expected by the FE.
- Confirm refresh-cookie behavior for web and the planned `x-client-platform: mobile` body/header flow, including rotation and refresh-token response.
- Prism serves static OpenAPI examples and does not select an example from `x-client-platform`; its shared mock fixture includes a dummy refresh token so the mobile curl smoke test has one. Confirm the backend's actual platform-dependent response behavior.
- Confirm `/admin/dashboard`, `/admin/kyc`, `/admin/kyc/{userId}/review`, `/admin/merchants`, `/admin/merchants/{merchantId}/review`, and `/admin/audit-logs` paths, query parameters, request bodies and response shapes.

## Khoa — wallets and payments

- Confirm wallet balance/history response shape and the `/wallets/{userId}/credit`, `/debit`, and `/transfer` request/result contracts.
- Confirm payment list/detail/checkout/cancel and top-up endpoints, status values, HTTP statuses, and response fields.
- Confirm admin top-up list/approve/reject routes and request/response bodies.

## Hữu — users and merchants

- Confirm `/users/{id}` and `/users/by-auth/{id}` behavior, profile fields, update payload, KYC multipart fields, and KYC document response.
- Confirm merchant list/current/detail/active/register routes, registration fields, statuses, and response envelopes.

## Frontend follow-up

- Notification backend contract uses `/notifications/me`, `/me/read-all`, `/{id}/read`, and `/socket-ticket`. The FE notification feature now calls exactly these routes (N15) and authenticates Socket.IO with `auth: { ticket }`; the legacy user-ID routes are no longer used.
- Notification `GET /notifications/me` returns `{ notifications, unreadCount, pagination }`, but the backend has no `type` or `unread` query filter. The Web page filters the loaded pages in the browser; ask the notification-service owner whether server-side filtering is planned.
- Device registration (`/notifications/devices`) exists on the backend but has no Web design yet; the Web app does not call it.
- Admin KYC list (N17): the FE sends `status` as documented, but admin-service forwards it while user-service reads `kycStatus`, so the server-side filter is effectively ignored. Confirm the single canonical query name with the user-service owner; the FE does not filter client-side to avoid masking the bug.
- Admin top-up approve/reject (N17): payment-service always returns `400 NOT_ALLOWED` to callers while VNPAY IPN credits the wallet. The FE calls the real endpoints and maps `NOT_ALLOWED` to a Vietnamese explanation. Confirm whether manual approval is permanently disabled before removing the buttons.
- Admin top-up approve/reject do not require an `Idempotency-Key` header (routes validate only id and reason); the FE relies on `isPending` to prevent double submits and does not invent a header outside the contract.
- AGENTS.md §6.6 still says to hide the reconciliation adjustment button, but the Week-4 plan (N18) requires it. Need Đạt's confirmation to update AGENTS.md when N18 lands.
