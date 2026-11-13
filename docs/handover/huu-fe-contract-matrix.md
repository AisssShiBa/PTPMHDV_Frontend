# Hữu FE — API contract matrix (Phase 0)

**Cập nhật nghiệm thu 12/11:** [kết quả cuối](../evidence/huu-fe-phase1/final/README.md) xác nhận Profile/KYC/Auth refresh/logout live PASS; PIN adapter dùng `expiresIn` và yêu cầu binding, route return FE đã có và không gọi IPN. Các bảng dưới là snapshot audit Phase 0 (NOT_RUN lúc đó), không thay thế evidence mới. Funding amount/whitelist và merchant/outlet vẫn chưa nghiệm thu live; không tự đóng các blocker đó từ H01 PASS.


Ngày đối chiếu: 12/11/2026. FE `ec9e7764224c61cb1421008352be5e07688d3e5e`; BE `1792e65f76cf175700900e21ccabea4c055c6aaf`. Chỉ audit tĩnh, **runtime toàn bộ NOT_RUN**, không có claim HTTP LIVE PASS hoặc REAL SANDBOX PASS.

`CONFIRMED` = quan sát thấy mount/router/middleware/controller/service tại snapshot; không có nghĩa owner đã duyệt hoặc test runtime đạt. `BLOCKED` = chưa thể dùng live an toàn do mâu thuẫn được nêu; `PROPOSED` = hướng tích hợp FE để owner review. Source BE ở repo anh em `PTPMHDV_Backend`, đường dẫn rút gọn bên dưới tương đối với repo BE.

Tất cả path trong bảng gồm `/api`; Axios baseURL đã gồm `/api` nên call site bỏ tiền tố này. Browser chỉ gọi Gateway, không tự gửi Gateway/internal credentials. Auth U = Bearer → Gateway ký ES256 → service xác minh + kiểm owner/admin; P = public callback kiểm VNPAY HMAC (không Bearer). Các lỗi là nhánh quan sát được, không phải danh sách đầy đủ; xem error middleware để xác định envelope. Query cache có account ID và hủy request khi account đổi.

## Profile và KYC

Nguồn: [User routes](../../../PTPMHDV_Backend/services/user-service/src/routes/userRoute.ts), [controller](../../../PTPMHDV_Backend/services/user-service/src/controllers/userController.ts), [validation](../../../PTPMHDV_Backend/services/user-service/src/validations/user.validation.ts), [KYC service](../../../PTPMHDV_Backend/services/user-service/src/services/kyc.service.ts), [FE adapter](../../src/features/user/services/userService.ts). User app mount `/api/users` sau authenticateServiceRequest. Gateway có proxy `/api/users`.

| Use case | Verb + path | Request / auth | Response | Lỗi quan sát / nguồn | Contract / runtime |
|---|---|---|---|---|---|
| Profile hiện tại | GET `/api/users/me` | U, current authUserId | 200 `{success:true,data:UserProfile}` | 404 NOT_FOUND; controller currentProfile | CONFIRMED / NOT_RUN |
| Profile theo Auth ID (đề xuất giữ adapter hiện có) | GET `/api/users/by-auth/:authUserId` | UUID Auth ID, U owner/admin | 200 data profile, `id` là profile UUID khác authUserId; `hasKycDocument`; không có raw object key/rejectReason | 403 FORBIDDEN, 404 NOT_FOUND, 409 AMBIGUOUS_IDENTIFIER từ findProfile | CONFIRMED / NOT_RUN |
| Sửa profile | PUT `/api/users/by-auth/:authUserId` | U owner/admin; strict object ít nhất một field; fullName 1–200, phone 1–30, address 1–500 sau trim | 200 data profile mới, version tăng | 400 VALIDATION_ERROR, 403/404; schema/controller | CONFIRMED / NOT_RUN |
| Nộp KYC | POST `/api/users/kyc/documents` | U current owner; FormData idNumber trim 1–50, front + back; JPEG/PNG mỗi file ≤ 5 MiB, server decode/normalize | 202 data profile PENDING, hasKycDocument | 400 KYC_DOCUMENTS_REQUIRED / INVALID_IMAGE / INVALID_UPLOAD, 413 FILE_TOO_LARGE, 409 INVALID_TRANSITION / CONCURRENT_UPDATE, 503 KYC_SUBMISSION_FAILED | CONFIRMED / NOT_RUN |
| KYC status + reason | GET `/api/users/me/kyc` | U current owner | 200 data `{kycStatus,kycTier,hasKycDocument,kycRejectReason?}`; reason chỉ REJECTED và có giá trị | 404 NOT_FOUND; controller getMyKyc | CONFIRMED / NOT_RUN |
| USER xem giấy tờ đã nộp | GET `/api/users/by-auth/:authUserId/kyc/document` | U owner; ADMIN bị chặn dùng route audit | 200 data `{url,expiresIn}`; **chỉ mặt trước**, Cache-Control no-store | 403 FORBIDDEN, 404 NOT_FOUND; documentUrl | CONFIRMED / NOT_RUN |

Chọn GET by-auth cho profile vì adapter hiện có; không trộn profile ID và Auth ID. Đây là đề xuất FE, không thay BE route. KycForm đã khóa PENDING phía UI, trong khi BE submitDocuments chặn APPROVED; không diễn giải khóa UI thành chính sách BE đã chứng minh. USER chưa có API lấy lại hai URL; upload hai mặt không đồng nghĩa xem lại hai mặt. Signed URL/secret không đặt trong query cache hoặc persistent storage. Khi đổi authUserId, cần reset/remount viewer; effect hiện hủy request/timer nhưng chưa tự xóa state url.

## Merchant

Nguồn: [routes](../../../PTPMHDV_Backend/services/merchant-service/src/routes/merchantRoute.ts), [controller](../../../PTPMHDV_Backend/services/merchant-service/src/controllers/merchantController.ts), [validation](../../../PTPMHDV_Backend/services/merchant-service/src/validations/merchant.validation.ts), [outlet](../../../PTPMHDV_Backend/services/merchant-service/src/services/outlet.service.ts), [keys](../../../PTPMHDV_Backend/services/merchant-service/src/services/merchant-api-key.service.ts). App mount `/api/merchants` sau authenticateServiceRequest; Gateway proxy tồn tại. `requireOwner` cho phép owner hoặc admin/internal được xác thực; không nói mọi admin bị cấm đọc merchant.

| Use case | Verb + path | Request / auth | Response | Lỗi quan sát / nguồn | Contract / runtime |
|---|---|---|---|---|---|
| Merchant của account | GET `/api/merchants/me` | U current owner | 200 data merchant hoặc **null**; status PENDING/APPROVED/REJECTED | 401 UNAUTHORIZED; HTTP 404/5xx không phải null | CONFIRMED / NOT_RUN |
| Đăng ký | POST `/api/merchants/register` | U; strict `{businessName,taxId?,bankAccount?}`; name 1–200, taxId 1–50 nullable, bankAccount 1–100 nullable; FE không gửi ownerId | 201 data merchant PENDING | 400 VALIDATION_ERROR, 403 FORBIDDEN khi giả owner; duplicate xét service/DB | CONFIRMED / NOT_RUN |
| Outlet create | POST `/api/merchants/:id/outlets` | U owner/admin, APPROVED; `{name,code}` strict; name 1–200, code 3–64 `[A-Za-z0-9_-]+` | 201 data outlet | 409 MERCHANT_NOT_APPROVED / DUPLICATE_RESOURCE, 400 validation, 403/404 | CONFIRMED / NOT_RUN |
| Outlet list | GET `/api/merchants/:id/outlets` | U owner/admin; page 1..100000 default 1; limit 1..100 default 10; search ≤200 | 200 data `{content,page,limit,totalElements,totalPages}` | 403/404, 400 validation; **list không chặn merchant chưa APPROVED trong service** | CONFIRMED / NOT_RUN |
| QR | GET `/api/merchants/:id/outlets/:outletId/qr` | U owner/admin, merchant APPROVED, outlet thuộc merchant | 200 data `{version,merchantId,outletId,outletCode,issuedAt,token,signature,algorithm:'HMAC-SHA256'}`; no-store | 409 MERCHANT_NOT_APPROVED, 403 FORBIDDEN, 404 NOT_FOUND | CONFIRMED / NOT_RUN |
| Tạo API key | POST `/api/merchants/:id/api-keys` | U owner/admin, APPROVED; không cần gửi secret/body nghiệp vụ | 201 data `{id,keyId,prefix,revokedAt,lastUsedAt,createdAt,key}`; raw key duy nhất lúc tạo, no-store | 409 MERCHANT_NOT_APPROVED, 403/404 | CONFIRMED / NOT_RUN |
| Thu hồi key | DELETE `/api/merchants/:id/api-keys/:keyId` | U owner/admin; **keyId**, không dùng DB id | 200 data metadata, không raw key; repeat giữ revokedAt | 404 NOT_FOUND, 403 FORBIDDEN | CONFIRMED / NOT_RUN |
| Danh sách API key | Chưa có GET endpoint | Không tự thêm FE API | Không thể dựng danh sách active sau reload nếu không có nguồn metadata | Owner cần quyết định UX revoke bằng keyId hoặc bổ sung contract | BLOCKED / NOT_RUN |

Secret giữ ngoài TanStack mutation cache (không chỉ tránh localStorage); xóa state khi đóng/unmount/logout, không truyền toast/log. Metadata keyId có thể giữ theo policy đã review để revoke; không hiển thị key active sau refresh như dữ liệu server đã xác nhận. Không có contract webhook/voucher/revenue chart được dùng trong scope này.

## Funding / Wallet / PIN

Nguồn: [Gateway auth](../../../PTPMHDV_Backend/gateway/src/middlewares/authenticate.ts), [Gateway proxy](../../../PTPMHDV_Backend/gateway/src/app.ts), [Payment app mounts](../../../PTPMHDV_Backend/services/payment-service/src/app.ts), [topup routes](../../../PTPMHDV_Backend/services/payment-service/src/routes/topup.routes.ts), [topup validation](../../../PTPMHDV_Backend/services/payment-service/src/validations/topup.validation.ts), [topup service](../../../PTPMHDV_Backend/services/payment-service/src/services/topup.service.ts), [cash-out routes](../../../PTPMHDV_Backend/services/payment-service/src/funding/routes/cashout.routes.ts), [cash-out validation](../../../PTPMHDV_Backend/services/payment-service/src/funding/validations/cashout.validation.ts), [cash-out service](../../../PTPMHDV_Backend/services/payment-service/src/funding/services/cashout.service.ts), [PIN service](../../../PTPMHDV_Backend/services/auth-service/src/services/pinService.ts), [Wallet routes](../../../PTPMHDV_Backend/services/wallet-service/src/routes/wallet.routes.ts).

| Use case | Verb + path | Request / auth | Response | Lỗi / lưu ý | Contract / runtime |
|---|---|---|---|---|---|
| Topup legacy create | POST `/api/payments/topups` | U; `{amount:number}` hiện BE min 10000 max 100000000, chưa .int(); FE yêu cầu string | 201 data `{topupId,paymentUrl}` | amount mâu thuẫn FE; create chưa dùng Idempotency-Key; validation/UNAUTHORIZED | BLOCKED H00-AMOUNT/TOPUP-RETRY / NOT_RUN |
| Alias create | POST `/api/funding/vnpay/create` (cũng có POST `/api/funding/vnpay`) | Service requireGateway; Gateway hiện skip toàn bộ funding → không ký identity | 201 cùng create nếu auth hợp lệ | Không thử fallback route sau lỗi; owner sửa whitelist + amount | BLOCKED H00-GW/AMOUNT / NOT_RUN |
| Topup status | GET `/api/payments/topups/:id` | U owner, UUID topupId, không dùng code NAP… | 200 data topup DB record; `amount` Prisma Decimal: cần fixture/runtime chốt serialization canonical VND | 403 FORBIDDEN, 404 NOT_FOUND; status PENDING/PROCESSING/APPROVED/REJECTED/FAILED/EXPIRED | CONFIRMED / NOT_RUN |
| Topup history | GET `/api/payments/topups` | U current owner | 200 data array topup records, sort createdAt desc, có id/code | Không có lookup-by-code public riêng trong router; history dùng correlate, không chọn bừa lệnh mới nhất | CONFIRMED / NOT_RUN |
| IPN | GET `/api/payments/topups/vnpay/ipn`; GET `/api/funding/vnpay/ipn` | P; query VNPAY có HMAC hợp lệ; **server-to-server** | HTTP 200 `{RspCode,Message}`, không dùng unwrap success/data | HTTP 200 không chứng minh credit; kiểm checksum/amount/TMN/duplicate trong BE | CONFIRMED; whitelist cần thu hẹp / NOT_RUN |
| Return | GET `/api/payments/topups/vnpay/return`; GET `/api/funding/vnpay/return` | P; BE kiểm signature, read-only | 200 `{success:true,data:verifiedParams}`; **JSON**, không redirect FE và không credit | VNP_RETURN_URL topology + FE route/correlation chưa chốt | BLOCKED H00-RETURN / NOT_RUN |
| Cash-out create | POST `/api/funding/cash-out` | Service U; header Idempotency-Key 1–255; `{amount:string,destination?:string≤255}`; amount digits ≤18 và >0 | 201 data `{id,userId,amount,destination,status,failureReason,createdAt,updatedAt,replayed}`; replay cùng intent cùng ID | **422 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD** khi key cũ payload khác; 400 INVALID_AMOUNT / IDEMPOTENCY_KEY_REQUIRED; Gateway blocker | BLOCKED H00-GW / NOT_RUN |
| PIN verify | POST `/api/auth/pin/verify` | U; PIN 6 digits, paymentId=cashOutId, amount string; không default | 200 data `{transactionToken,expiresIn:60}` | FE type expiresInSeconds sai field; PIN_NOT_SETUP/locked/invalid và auth; dùng error code, không raw message | CONFIRMED BE; FE adapter cần H00-PIN / NOT_RUN |
| Cash-out confirm | POST `/api/funding/cash-out/:id/confirm` | U + X-Transaction-Token; FE gửi body `{}` nếu cần; binding sub+paymentId+amount+jti | 200 data cash-out view khi không rơi lỗi; thành công chỉ status SUCCEEDED | 403 TXN_TOKEN_MISMATCH, 409 TXN_TOKEN_REUSED / CASHOUT_NOT_CONFIRMABLE / CASHOUT_FAILED; 503 CASHOUT_PROCESSING / CASHOUT_PAYOUT_PENDING; expired token; Gateway blocker | BLOCKED H00-GW/PIN / NOT_RUN |
| Cash-out status | GET `/api/funding/cash-out/:id` | U owner/admin theo service; UUID | 200 cash-out view; REQUESTED/HOLDING/PAYOUT_PENDING/SUCCEEDED/FAILED | Timeout/503 không đổi thành FAILED; không endpoint cancel/list trong router này; Gateway blocker | BLOCKED H00-GW / NOT_RUN |
| Wallet balance hiện tại | GET `/api/wallets/me` | U current user, service requireGatewayOrInternalKey + owner middleware | 200 data `{id,userId,balance,heldBalance,availableBalance,currency,status,createdAt,updatedAt}`; **không ownerType/limits/usage** | Backend hiện có, FE queries chưa có. Cần owner chốt string-decimal normalization và cache | CONFIRMED BE; FE integration PROPOSED / NOT_RUN |
| Wallet legacy balance | GET `/api/wallets/:userId/balance?ownerType=USER` | U owner/admin | 200 wallet balance DTO, FE walletService đang gọi | Không gọi credit/debit để mô phỏng funding: USER bị chặn internal/admin | CONFIRMED / NOT_RUN |

Các error code ở đây được đọc từ source, chưa gửi request xác nhận. Response error thường `{success:false,error:{code,message},requestId?}`; AGENTS nêu traceId nhưng service có requestId, không tự đổi field hoặc log body. AuthStore mock là blocker chung cho mọi U live, kể cả các dòng contract CONFIRMED.

## Lệch spec và lựa chọn FE cần review

- packages/api-contract/openapi.yaml còn x-planned-paths `/users/me`, `/wallets/me` dù BE có route. Topup example POST trả `{id,amount,status,qrCode}` khác code BE `{topupId,paymentUrl}`.
- docs/api/merchant-service-openapi.json chưa có outlet/API key; không tự suy đoán endpoint GET api-keys.
- Chọn GET by-auth để reuse profile adapter; thêm GET me/kyc cho reason. Tạo wallet query /me chỉ sau owner review, không tham chiếu file K18 không có tại snapshot.
- Topup legacy là ứng viên để tránh alias whitelist, chưa được coi live-ready khi amount/idempotency/auth chưa chốt. Mock dùng string phải ghi mock, không biến thành xác nhận BE.
- Tách state UI khỏi status Topup/CashOut; polling budget hết là unknown/retry-read, không phải EXPIRED. Sau confirm timeout ưu tiên GET; khi còn REQUESTED chỉ verify token mới/confirm lại nếu semantics được owner xác nhận.
- Funding live bị chặn đến khi đóng các blocker liên quan trong [báo cáo Phase 0](huu-fe-phase0-audit.md). Không sửa BE/Gateway để tự đóng blocker FE.
