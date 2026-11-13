# Bàn giao Hữu — Phase 8 / FE-H08

> **Cập nhật closeout:** [regression, demo accounts và video đã hoàn tất](huu-fe-closeout.md). Các dòng “chưa seed/chưa video/chưa rerun” bên dưới là trạng thái trước closeout. VNPAY sandbox, active Transfer UI/K18 và review/rollout/merge vẫn còn mở.

Ngày 13/11/2026. **Hoàn thiện tài liệu và bản nháp review local; chưa đóng DoD cuối, chưa tạo PR/commit/push/merge.** [Runbook demo](huu-fe-demo-runbook.md) · [PR FE nháp](huu-fe-pr-draft.md) · [PR BE nháp](huu-be-funding-pr-draft.md).

## Revision và phạm vi

FE HEAD `ec9e7764224c61cb1421008352be5e07688d3e5e`, BE HEAD `1792e65f76cf175700900e21ccabea4c055c6aaf`; branch FE `feat/huu-fe-phase0-audit`. Các phase và thay đổi foundation đã có trong worktree chưa commit. HEAD không đại diện toàn bộ code đã chạy; dùng [hash bản sửa](../evidence/huu-fe-week4/fixes/changed-source-sha256.json) và evidence từng phase để nhận diện nguồn. Không thêm branch hoặc stage cả cây thay đổi hiện hữu.

| Route / module | Chức năng và file chính | Contract / timeout |
|---|---|---|
| `/app/profile` | `features/user/components/UserProfilePanel`, ProfileForm/KycForm/KycDocumentViewer; `pages/ProfilePage.tsx` | GET/PUT `/users/by-auth/:id`, GET `/users/me/kyc`, multipart `/users/kyc/documents`. Hai ảnh ≤5 MiB, TTL viewer, timeout phải GET reconcile; owner cache/abort/reset. |
| `/app/topup`, `/app/topup/result` | `features/funding/{api,hooks,components}`, `features/payment/components/TopupResultPanel`, `lib/money.ts` | POST/GET `/payments/topups`, callback correlation NAP→UUID qua history account. Create stable key, string tiền, redirect exact allowlist; return không quyết định SUCCESS hoặc tự gửi IPN. |
| `/app/withdraw` | `features/funding/components/CashOutWorkspace` và hooks; `pages/WithdrawPage.tsx` | POST cash-out → PIN verify UUID+amount → confirm token memory → GET reconcile. UNKNOWN vẫn pending; không retry confirm mù. Reload có UUID chỉ đọc lại; timeout create mất ID còn thiếu lookup contract. |
| `/merchant`, `/merchant/register` | MerchantOverview/RegisterForm/StatusCard; `features/merchant/{api,services,schemas}` | GET `/merchants/me`, POST `/merchants/register`; strict DTO ba trường; POST mơ hồ phải GET status; account switch không dùng cache owner cũ. |
| Merchant tools | OutletList/CreateForm/QrCard, ApiKeyManager/CreateModal | Outlet list/create, server-signed QR, POST key/DELETE keyId; raw key chỉ state modal, bỏ khi đóng/unmount/đổi owner. Không list-key giả, không tự retry tạo key khi response mất. |

Endpoint trong bảng tương đối với Gateway `/api`. Chi tiết DTO và file ở handover feature, [contract questions](../CONTRACT_OPEN_QUESTIONS.md). Các tên component đầy đủ kiểm trong `src/features`; không thay source từ tài liệu bàn giao.

## Kết quả đã có

| Tầng | Kết quả thực tế | Evidence / giới hạn |
|---|---|---|
| Quality gate mới nhất | PASS lint/typecheck/Node test files/build | [check](../evidence/huu-fe-week4/fixes/fe-check.txt); Node runner báo 3 files, không báo tổng assertion bên trong |
| Vitest mới nhất | PASS 107/107, 11 files | [unit](../evidence/huu-fe-week4/fixes/fe-unit.txt); gồm MSW/fake adapters, không phải live ledger |
| Gateway auth | PASS callback method/path, Bearer thiếu/sai/hợp lệ | [test](../evidence/huu-fe-week4/fixes/gateway-unit.txt) |
| Backend Topup/Cashout | PASS 34/34 fake-store unit; payment build PASS | [unit](../evidence/huu-fe-week4/fixes/payment-unit.txt), [build](../evidence/huu-fe-week4/fixes/payment-build-final.txt) |
| Browser Topup mới nhất | PASS 7 nhóm HTTP fixture | [result](../evidence/huu-fe-week4/fixes/topup-browser/result.json) |
| KYC browser + recipient API | PASS live | [result](../evidence/huu-fe-week4/fixes/phase3-live/result.json); H11 API ONLY, không phủ transfer UI |
| Funding HTTP live | PASS 6 nhóm qua Gateway/Auth/Payment/Wallet/Postgres | [result](../evidence/huu-fe-week4/fixes/funding-live/result.json); IPN synthetic, payout mô phỏng; không gọi là VNPAY sandbox |
| Profile / Merchant / tools live trước bản sửa Funding | PASS 5 nhóm mỗi bộ, có MinIO TTL, owner, DB QR/key và PDF | [Profile](../evidence/huu-fe-week4/profile-live/result.json), [Merchant](../evidence/huu-fe-week4/merchant-live/result.json), [tools](../evidence/huu-fe-week4/merchant-tools-live/result.json); chưa rerun toàn bộ trên source sau sửa |
| Contract lint | VALID / 126 warnings | [log](../evidence/huu-fe-week4/fixes/contract-lint.txt) |

Phase 8 chỉ sửa tài liệu, dùng kết quả trên của nguồn thực thi hiện hữu; không chạy lại suite hoặc gọi evidence cũ là nghiệm thu mới. Kiểm liên kết/hash/whitespace của gói bàn giao nằm ở [evidence Phase 8](../evidence/huu-fe-phase8/README.md).

## Backend bắt buộc đi cùng

Gateway đã thu hẹp whitelist về exact GET IPN/return. Payment topup nhận string và integer legacy bounded, lưu idempotency theo owner; unique conflict trả cùng UUID/URL, đổi amount trả 422. Lệnh và paymentUrl được ghi atomic.

Migration `20261113090000_topup_idempotency` thêm cột nullable UUID và unique `(userId,idempotencyKey)`. **Apply migration backend trước khi bật FE create mới**. Chỉ DB acceptance đã được migrate trong phiên kiểm thử. Caller legacy không gửi key vẫn chưa được bảo đảm replay. Review BE riêng với Đạt/Khoa; [PR BE nháp](huu-be-funding-pr-draft.md) ghi paths và rollout. Không đảo chiều rollout bằng cách tắt guard để demo.

## Việc còn lại và owner

| Mục | Status | Owner / điều kiện đóng |
|---|---|---|
| VNPAY sandbox thật | NOT_RUN | Đạt/Khoa: terminal/return reachable/exact endpoint; giao dịch thật trong sandbox, status và ledger |
| Full K18 Wallet/P2P, transfer UI | NOT_RUN | Khoa/Hữu: active route và bộ regression thực, không dùng dialog cũ |
| Same-revision toàn bộ Must HU-F01–HU-F16 | CHƯA ĐẠT | Hữu phối hợp các owner; chạy tuần tự toàn bộ suites trên revision review cuối |
| Cashout create timeout, reload mất UUID | OPEN CONTRACT | Khoa/Đạt: list/lookup theo key; FE không tự tạo lệnh mới |
| Metadata key cũ / mất response tạo key | OPEN CONTRACT | Hữu/backend Merchant: chưa có list API; UI không tự retry hoặc bịa inventory |
| Tài khoản demo tier 0/1/2 + merchant pending/approved | NOT_SEEDED cho buổi demo Phase 8 | Người demo dùng checklist runbook; không commit credentials |
| Video và rehearsal | NOT_RUN | Hữu; screenshot/PDF dự phòng đã dẫn, nguồn fixture/live ghi rõ |
| Review chéo, commit/push/PR/merge | NOT_DONE | Đạt/Khoa/Nguyên theo module; chỉ có draft local |

## Checklist review cuối

- [x] README/handover/runbook/contract questions và PR draft có đường dẫn tới evidence.
- [x] Tách rõ fixture, HTTP live, simulated payout và real VNPAY sandbox.
- [x] Ghi migration dependency, retry/timeout/reload và giới hạn owner/secret.
- [ ] Đạt review Auth/Gateway/foundation; Khoa review Funding/ledger và K18; Nguyên review phần Admin/notification liên quan.
- [ ] Seed demo/rehearse và quay video không lộ secret, nghiệm thu full Must cùng revision.
- [ ] Review staged diff theo từng repo, loại credential/generated cache và chứng minh PR target/base.
- [ ] Commit, push, tạo PR và có kết quả review/merge thực.

Không thay `TEMPLATE.md` của team. Bản nháp PR chỉ mô tả phạm vi để reviewer chọn; không stage hoặc di chuyển các thay đổi có sẵn sang commit của người khác.
