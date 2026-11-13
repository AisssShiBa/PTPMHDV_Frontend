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

- Notification backend contract uses `/notifications/me`, `/me/read-all`, `/{id}/read`, and `/socket-ticket`. The existing FE service still calls legacy user-ID routes; migrate it in N6c.


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
