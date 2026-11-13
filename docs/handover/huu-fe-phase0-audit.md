# Hữu Frontend — Phase 0: baseline và kế hoạch triển khai

Ngày: 12/11/2026 (Asia/Ho_Chi_Minh). Phạm vi: audit FE Profile/KYC, Funding, Merchant; không sửa code nghiệp vụ, backend hoặc Mobile.

## Snapshot và trạng thái

- FE base HEAD: `ec9e7764224c61cb1421008352be5e07688d3e5e`. Working tree sạch trước audit, nhánh ban đầu `main`.
- Nhánh audit đã tạo từ HEAD local: `feat/huu-fe-phase0-audit`. Không coi đây là nhánh từ origin/main mới nhất: `git fetch origin` exit 128 vì quyền cấu hình SSH `/etc/ssh/ssh_config.d/20-systemd-ssh-proxy.conf`. Không sửa cấu hình máy để vượt lỗi.
- BE HEAD: `1792e65f76cf175700900e21ccabea4c055c6aaf`. Có sẵn file chưa track trong `docs/handover/`, `tests/acceptance/demo-seed.mjs`, `tests/acceptance/demo-seed.verify.mjs`; giữ nguyên, không dùng làm evidence của commit.
- Node `v22.23.1`, npm `10.9.8`; `node:module.registerHooks` **có** trong runtime này. Không kết luận Node 22 bị chặn chỉ vì loader có comment Node 24. Chưa cài dependencies thành công nên chưa chứng minh Node 22 chạy toàn bộ toolchain.
- Không có dependencies lúc bắt đầu. `npm ci` offline exit 1 (`ENOTCACHED`); thử registry exit 1 (`EAI_AGAIN registry.npmjs.org`). Không thay package/lockfile hoặc thêm dependency.
- Không tìm thấy Chrome/Chromium qua PATH; không có `dist/index.html`. Không dựng stack, tạo tài khoản hoặc thay dữ liệu backend.

## Kết quả baseline thực tế

[Evidence và log](../evidence/huu-fe-phase0/README.md). Các lệnh đều đã được gọi; trạng thái BLOCKED phản ánh lỗi điều kiện môi trường, không phải assertions ứng dụng đã chạy và thất bại.

| Lệnh | Exit | Trạng thái | Kết quả quan sát |
|---|---:|---|---|
| `npm run check` | 127 | BLOCKED | Dừng tại lint: eslint chưa cài; các gate sau không chạy trong lệnh check. |
| `npm run lint` | 127 | BLOCKED | eslint command not found. |
| `npm run typecheck` | 127 | BLOCKED | tsc command not found. |
| `npm test` | 1 | BLOCKED | 3 test-file failures do loader thiếu typescript; 0 pass, chưa chạy assertions nghiệp vụ. |
| `npm run build` | 127 | BLOCKED | tsc command not found. |
| `npm run test:unit` | 127 | BLOCKED | vitest command not found. |
| `npm run test:browser` | 1 | BLOCKED | Script assert thiếu BROWSER_PATH trước khi kiểm tra UI. |
| `npm run test:phase3:live` | 1 | BLOCKED | Script assert Build the frontend first; chưa gọi Gateway. |

## Route active và tài sản tái sử dụng

Nguồn: [router](../../src/app/router.tsx), [AuthStore](../../src/features/auth/stores/useAuthStore.ts), [format](../../src/lib/format.ts), các service/component bên dưới.

| Luồng | Route active | Tái sử dụng | Khoảng trống cần xử lý |
|---|---|---|---|
| Profile/KYC | `/app/profile` | userService, useUserProfile, ProfileForm, KycForm, KycDocumentViewer, schema 2 mặt | Page hiện demo; thêm GET me/kyc và rejection reason; tạo user/index.ts. Viewer USER hiện chỉ mặt trước, không hứa hiển thị lại cả hai mặt. |
| Nạp | `/app/topup` | paymentService và TopupModal để tham chiếu/migrate caller | Page fake success/balance; result chưa có route; modal mong response cũ, phải migrate cùng adapter. |
| Rút | `/app/withdraw` | PinModal/API Auth để tích hợp sau owner review | Page random ID/trừ balance local; funding feature chưa có workflow thực. |
| Merchant | `/merchant`, `/merchant/register` | merchantService, MerchantRegisterForm, MerchantStatusCard | Page demo; merchant/index.ts rỗng; outlet/QR/key chưa có FE API. |
| Admin KYC | `/admin/kyc` | AdminKycDocumentsViewer/KycActionForm hiện có | Page active demo; owner Nguyên xử lý, Hữu cung cấp contract/test. |
| Wallet dùng cho funding | BE có `/api/wallets/me` | walletService/getBalance và RealBalanceCard để tham chiếu | Không có wallet/api/wallet.queries.ts, lib/money.ts hoặc payment/api/payment.api.ts trong snapshot này; không có evidence K18 handover tại docs/handover. |

AuthStore hiện bỏ qua password khi signIn, tạo mock token; refresh chỉ đánh initialized và trả false, signOut không gọi API. Đây là **P0 dependency chung**, không thể claim Profile/Funding/Merchant live chỉ bằng nối page. Cần Đạt bàn giao Auth thật hoặc duyệt thay đổi chung. Guard đã chờ initialize nhưng không thể phục hồi phiên thật với refresh hiện tại; state redirect chỉ giữ pathname.

`formatCurrency/formatNumber` đang dùng Number; `toBigIntSafe` xóa ký tự không phải số trước parse nên không phù hợp validate canonical VND (ví dụ số thập phân bị biến đổi). Không gọi chúng như helper đã an toàn hoàn toàn. Chốt helper BigInt và DTO decimal của Wallet/Topup với owner trước khi tái sử dụng cho funding.

## Thiết kế và tài liệu đã đối chiếu

Đã đọc DESIGN.md, code.html và xem screen.png của màn 4 (VNPAY), 5 (rút), 7 (Profile/KYC), 9 (Merchant). Giữ bố cục/token; áp dụng overrides trong AGENTS.md: dữ liệu mẫu không thành dữ liệu thật; không sao chép hạn mức cấp 0/2 sai, upload 15MB, hotline giả, chart merchant hay tuyên bố tiền thật. Màn rút giữ nhãn mô phỏng; QR chỉ render token server trả, không dùng QR minh họa trên thiết kế.

Đã đọc docs/phase2-kyc.md, phase3-h8-h11.md, User_KYC_Merchant_Integration.md và handover kyc/funding/merchant/wallet (hiện placeholder). Các tài liệu lịch sử còn route /profile, /wallet, /merchant-register; router hiện hành không có alias đó. browser-smoke cũng còn điều hướng các route cũ; cần cập nhật harness khi tích hợp page, không coi báo cáo PASS cũ là bằng chứng của snapshot hiện tại.

## Blocker và yêu cầu owner review

Chỉ soạn yêu cầu tại đây; chưa gửi tin, tạo issue hoặc PR.

| ID | Mức / owner | Bằng chứng | Quyết định / điều kiện đóng |
|---|---|---|---|
| H00-ENV | P0 / môi trường máy | npm/SSH/browser logs | Cài dependencies từ registry truy cập được, browser khả dụng, fetch được; chạy lại toàn bộ gates trên revision triển khai. |
| H00-AUTH | P0 / Đạt | AuthStore mock signIn/refresh/signOut | Bàn giao auth/refresh cookie thật, kiểm tra logout và đổi account; nghiệm thu refresh sau redirect/reload. |
| H00-GW | P0 / Đạt | Gateway authenticate whitelist toàn bộ funding; cash-out/vnpay create yêu cầu requireGateway | Thu whitelist về GET IPN/return chính xác cho cả alias funding và payments; test unauthorized, authenticated và spoofed headers qua Gateway. Service vẫn có kiểm chữ ký, chưa kết luận bypass nghiệp vụ. |
| H00-AMOUNT | P0 / Khoa + Đạt | BE topup z.number (10k–100m); FE quy định string | Chốt string contract/ADR được duyệt; không tự Number hay dùng mock string để claim live. Xác nhận whole-VND vì schema hiện chưa .int(). |
| H00-TOPUP-RETRY | P0 / Khoa | create không đọc Idempotency-Key; getMyTopups có id/code | Chốt idempotency/recovery của create. FE giữ key và khóa submit chưa làm BE idempotent; timeout không auto-create/fallback route. |
| H00-RETURN | P0 / Đạt + Khoa | BE return trả JSON read-only; status dùng UUID, vnp_TxnRef là code | Chốt VNP_RETURN_URL/redirect topology, correlate ID cho multi-tab/account, không gọi browser IPN; test chưa có IPN vẫn pending. |
| H00-PIN | P0 / Đạt | FE expiresInSeconds vs BE expiresIn; verify payload có default | Duyệt adapter TTL và binding cashOutId+amount bắt buộc, token chỉ memory, test expiry/replay. |
| H00-WALLET | P0 / Khoa + Đạt | walletService/RealBalanceCard cũ; thiếu queries/money; BE /me không trả limits | Chốt /me DTO (không bắt ownerType nếu response thiếu), decimal VND và account-scoped query; không hiển thị remaining quota nếu API chưa có. |
| H00-ADMIN | P1 / Nguyên | Admin page demo, component có sẵn | Owner nối route thật; Hữu test User side với Admin API nếu UI chưa sẵn. Không sửa Admin nghiệp vụ. |
| H00-SPEC | P1 / Hữu + owners | OpenAPI topup example id/qrCode khác BE topupId/paymentUrl; /me ở planned; merchant spec thiếu outlet/key | Cập nhật spec theo contract owner chốt, giữ runtime evidence riêng. |
| H00-HARNESS | P1 / Hữu, Đạt review auth | browser-smoke dùng route cũ, npm check không chạy Vitest | Migrate URL/assertions theo router, thêm coverage funding/merchant và chạy Vitest khi sửa UI/MSW tests. |
| H00-QR | P1 / Hữu + Khoa/Đạt | BE trả token + signature + metadata | Chốt QR consumer dùng chính token server và kiểm round-trip; không tự ghép/ký, không mặc định QR đã thanh toán được. |

## File/endpoint dự kiến triển khai sau Phase 0

Đây là danh sách để review trước code theo AGENTS.md; không phải các file đã sửa. Endpoint và field chi tiết ở [contract matrix](huu-fe-contract-matrix.md). Chỉ tạo file khi có trách nhiệm thật, giữ service adapter duy nhất.

| Phase | File tạo/sửa dự kiến | Endpoint / kiểm tra |
|---|---|---|
| 1 Profile/KYC | pages/ProfilePage.tsx; features/user/index.ts (mới); user/services/userService.ts; user/types/user.types.ts; user/api/user.queries.ts và components/UserProfilePanel.tsx (mới nếu cần); KycForm/KycDocumentViewer khi xử lý reason/account change | GET/PUT users/by-auth/:authUserId, GET users/me/kyc, POST users/kyc/documents, GET signed document. Reuse validation; schema/multipart, reload, account switch, TTL, rejection reason. |
| 2 Shared funding | funding/types, schemas, api/funding.api.ts, api/funding.queries.ts, hooks/useTopupFlow.ts, hooks/useCashOutFlow.ts, index.ts; wallet queries/types/index và lib/format.ts hoặc lib/money.ts chỉ sau owner review | Wallet /me, string-VND adapter, query key theo account, cancel stale request, timeout unknown. |
| 3 Topup | pages/TopupPage.tsx, TopupResult.tsx, app/router.tsx; funding/components/TopupForm.tsx, TopupStatusPanel.tsx; wallet/components/TopupModal.tsx, payment/services/paymentService.ts để migrate caller | Một create route đã chốt, GET topups/:id và history. Fake return, no browser IPN, multi-tab recovery, wallet refresh. |
| 4 Cash-out | pages/WithdrawPage.tsx; funding/components/CashOutForm.tsx, CashOutStatusPanel.tsx; auth PIN adapter/modal chỉ Đạt duyệt | create → verify PIN → confirm → GET status; same key retry, replay, timeout, payout pending. |
| 5 Merchant | pages/MerchantRegisterPage.tsx, MerchantPortalPage.tsx; merchant/index.ts, services/merchantService.ts, api/merchant.queries.ts và components/MerchantOverview.tsx khi cần | GET merchants/me, POST register; null/error distinction, DTO strict, ambiguous outcome. |
| 6 Outlet/key | merchant/types/outlet.types.ts; api/merchant.api.ts, merchant.queries.ts; OutletList/OutletCreateForm/OutletQrCard/ApiKeyCreateModal | Outlet list/create, QR, key create/revoke; owner isolation, print, raw key một lần không đưa TanStack mutation cache. |
| 7–8 Test/docs | tests/contracts.test.ts, browser-smoke.mjs, phase3-live.mjs hoặc test theo pattern repo; src/test/*; docs/api/spec và handover/evidence đúng scope | Node + Vitest + browser mock + HTTP/live riêng; ghi HU-F01–HU-F16 không claim coverage từ harness cũ. |

Thay đổi AuthStore, foundation money/wallet queries và router cần review owner tương ứng; không tự gộp thành việc Hữu sửa cả Auth/Wallet. Không sửa Backend/Mobile/Admin business code trong kế hoạch FE này.

## Kết luận Phase 0

Đã hoàn tất audit tĩnh, route/component inventory, contract matrix, blocker và kế hoạch file/endpoint để review. Baseline đã thử nhưng **BLOCKED** bởi môi trường; chưa đạt DoD baseline xanh, chưa có nghiệm thu live. Bước triển khai trước mắt là Phase 1 và 5 sau review scope, đồng thời đóng H00-AUTH và chuẩn bị môi trường; funding live còn phụ thuộc H00-GW/AMOUNT/RETURN/PIN/WALLET/TOPUP-RETRY. Không tự chuyển sang phase triển khai hoặc claim P0 hoàn thành.
