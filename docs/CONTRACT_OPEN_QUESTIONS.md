# Contract hiện tại và câu hỏi còn mở — Đ20/N21

Cập nhật 23/11/2026, nhánh `fix/week4-integration`: FE nền `464b017`, BE nền `bfbbf74`, gồm các thay đổi chưa commit. Đối chiếu source hiện tại; không khẳng định main hoặc container của thành viên đã triển khai. Các bằng chứng ngày 12–22/11 chỉ áp dụng phạm vi/revision đã ghi, không tự chuyển thành nghiệm thu UI hôm nay.

## Nguồn và quy ước

- Frontend dùng Axios singleton base `/api`; adapter ghi path không lặp `/api`.
- OpenAPI tổng hợp: [openapi.yaml](../packages/api-contract/openapi.yaml). Có path dạng không prefix và alias `/api/...` phục vụ Prism. `x-planned-paths` rỗng không chứng minh response, semantics hoặc live test đã đúng.
- Success thường `{success:true,data,message?}`; lỗi `{success:false,error:{code,message,details?},requestId?}`. Dùng unwrap và errorMessage; không hiển thị message thô hoặc lưu secret.
- Tiền trên FE giữ string, tính BigInt. Quote có ngoại lệ backend `fee:0` number; Payment adapter chuẩn hóa riêng thành `'0'`. Topup FE gửi amount string; backend nhận string canonical và hỗ trợ legacy integer có giới hạn. Không tiếp tục ghi topup bắt buộc number.
- Idempotency-Key dùng cho P2P checkout, generic checkout, create topup, cash-out create và tạo đơn Utilities. W4 Admin tự sinh referenceId; không giả lập cơ chế header mà route không yêu cầu.

## Những câu hỏi cũ đã có câu trả lời

| Nội dung | Trạng thái source và cách dùng |
| --- | --- |
| Auth thật | Store dùng signin/signout/refresh; access token ở RAM, Web refresh cookie HttpOnly. Guard chờ initialize. Không có MOCK_USER trong store nghiệp vụ. |
| QR | Init `{qrId,nonce,pollSecret,expiresAt}`; status PENDING/APPROVED/REJECTED; expiry HTTP 410 QR_EXPIRED. Poll gửi pollSecret; confirm cần access token. |
| PIN | Verify bắt buộc paymentId/amount của đơn server trả; expiresIn=60 giây. Status có hasPin/isLocked/remainingLockSeconds; lỗi khóa có thông tin thời hạn. |
| P2P | FE checkout theo `/payments/p2p/checkout`, confirm dùng `X-Transaction-Token`, GET trạng thái khi chưa rõ. Không tự replay token/POST confirm khi refresh. |
| Ví | `/wallets/me` và `/wallets/me/ledger`; backend có filter ngày/loại/hướng, cursor. Các route named-owner còn tồn tại với kiểm quyền; không coi tất cả đã xóa. |
| Lọc KYC Admin | User validation nhận cả status/kycStatus, normalize về kycStatus; status được ưu tiên khi có cả hai. Lỗi alias bị bỏ qua không còn đúng với source hiện tại. |
| W2–W4 | Wallet đã có list/detail/adjust. Không giao viết route từ đầu dựa trên comment cũ trong walletReconciliationClient. |
| Notification | `/notifications/me`, `/me/read-all`, `/{id}/read`, `/socket-ticket`; Socket.IO dùng ticket mới cho mỗi kết nối. |
| Refund/KYC events | `payment.refunded` và `user.kyc_reviewed` đã nối schema/publisher/consumer; kiểm Backend thật trong phiên 22/11, không đồng nghĩa mọi UI/latency N19 đã đạt. |
| Seed | H15+N20 đã tích hợp và kiểm live trên stack riêng: đủ dữ liệu, baseline sạch, rerun không trùng, fixture A8 đúng delta. Đây không phải bằng chứng sandbox VNPAY thật. |

## Việc còn mở và người nhận

| Mã/phần | Cần chốt hoặc kiểm tra tiếp | Phụ trách |
| --- | --- | --- |
| K17/N18 — semantics W4 | Đạt chốt sửa cache cho A8, chưa thêm đảo giao dịch. Đồng bộ balance về ledger, giữ nguyên ledger/heldBalance, transactionId null; FE đã đổi nhãn. Live Admin/Wallet/UI A8+RC1 PASS. | Khoa + Nguyên; Đạt điều phối |
| W4 — heldBalance | Đã có guard 409 REPAIR_CONFLICTS_WITH_HOLDS trước khi ghi; anomaly OPEN, không đổi balance/ledger/adjustment. PostgreSQL test PASS; Admin nhận từ chối xác định, FE có thông báo tiếng Việt. | Khoa + Nguyên |
| W4 — replay | Wallet cùng reference có replay; Admin sau SUCCEEDED trả 409 ALREADY_ADJUSTED. UNKNOWN chỉ đọc lại, không tự gửi lại. Hai tầng không bắt buộc cùng status HTTP. | Khoa + Nguyên |
| W4 — anomaly representation | API hiện có BALANCE_DRIFT + detail.mode QUICK/FULL; DB có enum riêng QUICK/FULL. N18 cần hiển thị đúng phân loại, không suy ra từ DB enum mà bỏ qua adapter thực. | Khoa + Nguyên |
| H20/K03 | PENDING đang có tier rồi bị reject hiện đưa về tier 0; quy tắc chưa thống nhất. Event review mới không tự đóng K03. | Hữu + Khoa + Đạt |
| N17 Admin Topup | Đã triển khai đầy đủ thủ công theo lựa chọn Đạt: claim + audit atomic, chung reference IPN, recovery unknown; UI/API/PostgreSQL live PASS. | Hữu + Nguyên + Đạt |
| N19 | Utilities đã có outbox/publisher/schema/binding và nhận payment.refunded; T1/T2/A7 live đã kiểm. Topup vẫn qua Wallet, không tạo thêm event trùng. Latency từng nhóm phải ghi riêng. | Nguyên + Đạt |
| H20 sandbox | Cần terminal và URL IPN/return công khai phù hợp. IPN synthetic có chữ ký không thay giao dịch sandbox thật. | Hữu; Đạt hỗ trợ Gateway |
| Cashout recovery | Có GET theo UUID; timeout create rồi reload mất UUID/key chưa có lookup-by-key đã xác nhận. Không tạo đơn mới để che kết quả chưa rõ. | Hữu + chủ Payment |
| Utilities recovery | FE giữ orderId trong RAM; chưa có API list/recovery được xác nhận cho reload mất ID. Không tự bịa endpoint. | Nguyên + Utilities |
| Merchant API key | Secret chỉ hiện một lần; metadata sau mất response và API list keys chưa được tự bổ sung. QR outlet chỉ hiển thị trên Web. | Hữu + Merchant |
| N15 filters/devices | Type/unread lọc trên các trang đã tải; không coi là server filter toàn bộ. Route device tồn tại nhưng Web chưa có màn thiết kế; không tự thêm. | Nguyên |
| Đ20 Home/kiến trúc | Đã tách HomeLanding, WalletDashboard, WalletTransactions; bỏ thông tin An/số dư giả, adapter User sang api/user.api.ts; caller/mock và guard tiền đổi theo source mới. | Đạt + chủ feature |
| OpenAPI | Đã cập nhật Admin Topup và amount string/legacy integer của các alias; lint hợp lệ, cảnh báo còn ghi trong log. | Nguyên + Đạt |
| Đ21/Đ22 | Browser và phase3-live scope all đã PASS trên working tree/Compose riêng: login/F5/P2P/logout, A3/A4 và Q1, KYC, manual topup, Utilities/A7. Không suy ra đã merge main, sandbox thật hoặc W4 đạt. | Đạt |
| Quy tắc UI | AGENTS.md ghi ẩn nút điều chỉnh, kế hoạch N18 yêu cầu thao tác. Giữ ghi nhận khác biệt, chưa tự sửa AGENTS hoặc quyết định thay phạm vi. | Đạt + Nguyên |

## Ma trận 10 handover chính

| Feature | Tài liệu | Điểm nhận bàn giao |
| --- | --- | --- |
| Auth | [auth.md](handover/auth.md) | Đ17–Đ19, PIN/QR, phiên và guard |
| Home | [home.md](handover/home.md) | Landing tĩnh, giới hạn hardcode và cách kiểm |
| Wallet | [wallet.md](handover/wallet.md) | K18/K20, Dashboard/ledger/filter/cache |
| Payment | [payment.md](handover/payment.md) | K19, component/hook Transfer và retry/token |
| Funding | [funding.md](handover/funding.md) | H16/H17; chi tiết ở topup.md/cashout.md |
| KYC/Profile | [kyc.md](handover/kyc.md) | H18 triển khai trong features/user; features/kyc chưa có implementation riêng |
| Merchant | [merchant.md](handover/merchant.md) | H19; outlet/QR/key ở merchant-tools.md |
| Notification | [notification.md](handover/notification.md) | N15/N19, ticket/cache/dedupe |
| Utilities | [utilities.md](handover/utilities.md) | N16, order/PIN/refund mô phỏng |
| Admin | [admin.md](handover/admin.md) | N17/N18, route thật và W4 đang chờ |

Mỗi file mô tả source/endpoint, trạng thái hoặc giới hạn, cách kiểm và người nhận. TEMPLATE.md không tính là feature đã bàn giao. Các file draft/evidence cũ giữ nguyên theo revision; không lấy nhãn PASS lịch sử để đóng toàn bộ tuần 4.

## Kiểm tra cho thành viên

Kết quả chạy ngày 23/11/2026 trên working tree đang bàn giao:

| Gate | Kết quả và giới hạn |
| --- | --- |
| `npm run check` | Exit 0: lint, check import 21 page, typecheck, Node tests và build đạt. Lint còn 16 warning; build cảnh báo kích thước bundle. |
| `npm run test:unit` | Exit 0: 248/248 test, 30 file. Có MSW/fixture; không phải toàn bộ browser/backend live. |
| `npm run contract:lint` | Exit 0, 193 warning về metadata/schema/path; không phải 193 lỗi nghiệp vụ. Chưa sửa OpenAPI trong lượt tài liệu này. |
| Handover | 10/10 file chính có nội dung/cập nhật, không tính TEMPLATE; kiểm liên kết cục bộ không có link hỏng. |
| Browser/phase3-live | Không chạy trong lượt tài liệu; tiếp tục thuộc Đ21/Đ22. |

Tại Frontend: `npm run check`, `npm run test:unit`, `npm run contract:lint`. Hai lệnh browser/phase3-live chỉ chạy sau khi xác nhận stack riêng và seed phù hợp; một số harness có thao tác tạo/reset dữ liệu. Xem [runbook](handover/huu-fe-demo-runbook.md) trước khi chạy.

Nguồn Backend gần nhất: [seed H15/N20 và kết quả live](../../Backend/tests/acceptance/README.md), [event catalog/rollout](../../Backend/services/notification-service/EVENTS.md). Không có thay đổi nghiệp vụ service hoặc quyết định đóng W4 trong lượt cập nhật này.
