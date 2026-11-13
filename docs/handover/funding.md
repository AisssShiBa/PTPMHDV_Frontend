# Funding — Phase 2 (2026-11-12)

## Kết quả và phạm vi

Hoàn thành nền tảng FE dùng chung cho nạp/rút: DTO suy ra từ Zod, tiền chuỗi/BigInt, adapter duy nhất, query factory theo tài khoản, hook tạo lệnh và recovery. Chưa nghiệm thu nạp VNPAY sandbox hoặc rút live. Trang demo TopupPage/WithdrawPage được tích hợp ở Phase 3–4.

- `lib/money.ts` cung cấp parser nghiêm ngặt, chuẩn hóa Decimal chỉ khi phần thập phân toàn 0, định dạng BigInt; xuất qua `lib/format.ts`. Không dùng helper legacy loại bỏ ký tự để validate.
- Nạp: 10.000–100.000.000 VND. Rút: chuỗi nguyên dương tối đa 18 chữ số; destination tùy chọn, chưa dựng DTO ngân hàng.
- `fundingApi` dùng Axios singleton, kiểm tra envelope/status/UUID, bỏ các trường không thuộc status DTO trước khi cache. `paymentService` chỉ delegate nạp/status; không còn implementation HTTP nạp thứ hai hoặc DTO `TopupPaymentInfo`/`TopupResponse`.
- `TopupResultPanel` dùng query chung. `TopupModal` bỏ nhánh QR/chuyển khoản/countdown giả không thuộc response `{topupId,paymentUrl}`. Giữ form nhập tiền/preset/modal; redirect được tích hợp tại Phase 3 sau khi chốt contract và kiểm tra URL. Không dùng giờ máy khách để đặt EXPIRED.
- `walletKeys`/`useWalletBalance` bọc service ví hiện hữu, RealBalanceCard dùng chung factory. Invalidate prefix ví theo account; không cập nhật balance trong AuthStore. Chưa có hook K18 trước thay đổi này; tái sử dụng endpoint hiện hữu `/wallets/:userId/balance?ownerType=USER`, không tự giả định response `/wallets/me` có ownerType/hạn mức.
- Lỗi funding chuẩn hóa theo code, HTTP 400/401/403/409/422/423/429/503, network/timeout; `errorMessage` hiển thị tiếng Việt và mã trace/request an toàn nếu có. Không hiển thị message backend thô.

## Retry và trạng thái

Một mounted flow giữ một intent bất biến và UUID; latch khóa gửi trùng đồng thời. Create cash-out mất mạng/timeout vẫn UNKNOWN và retry cùng payload/key. Không đổi payload của intent đang có kết quả chưa rõ.

Confirm không qua mutation cache. PIN/token không ghi vào state/storage/query cache. Axios không tự refresh/replay request Funding ghi dữ liệu (đặc biệt token xác nhận một lần). Sau một lần confirm, hook chỉ cho reconcile GET; kể cả lỗi/timeout cũng không tự replay. Phase 4 phải xử lý UX xác thực lại nếu server còn REQUESTED; hiện không tự cấp quyền gửi confirm lần hai.

UI phase tách server status. GET polling mỗi 5 giây, dừng khi terminal, lỗi đọc hoặc sau 24 lần đọc thành công. Hết budget giữ PENDING/PROCESSING/PAYOUT_PENDING và nút kiểm tra lại, không suy diễn FAILED/EXPIRED. Cache có account key; query có AbortSignal/gcTime 0, hook bỏ qua kết quả sau đổi tài khoản/unmount. Chỉ cache status, không cache paymentUrl.

Intent chỉ ở RAM. Đóng modal/reload mất intent; không cung cấp nút bắt đầu lại sau timeout tạo rút trong UI Phase 2. Recovery qua reload và lưu tham chiếu không bí mật thuộc Phase 4; không lưu PIN/token để giải quyết recovery.

## Endpoint và chặn live

| API | Contract kiểm chứng tại source BE | Trạng thái |
| --- | --- | --- |
| POST `/payments/topups` | BE `z.number().min(10000).max(100000000)`, chưa xử lý Idempotency-Key | **BLOCKED live**. Adapter không ép Number; chỉ gửi chuỗi khi `VITE_USE_MOCK=true`. |
| GET `/payments/topups/:id`, GET `/payments/topups` | UUID nội bộ, status/Decimal string | Adapter/query đã có; không dùng mã NAP làm UUID. |
| POST `/funding/cash-out` | amount string; Idempotency-Key; changed payload trả 422 | Adapter/schema/MSW đạt; live Gateway còn bị chặn. |
| POST `/funding/cash-out/:id/confirm` | X-Transaction-Token bind user/order/amount | Không replay; token do PIN flow Phase 4 cung cấp. |
| GET `/funding/cash-out/:id` | REQUESTED/HOLDING/PAYOUT_PENDING/SUCCEEDED/FAILED | Recovery/query đã có; chưa nghiệm thu live. |

Nguồn chặn: BE `services/payment-service/src/validations/topup.validation.ts`; `gateway/src/middlewares/authenticate.ts` đang whitelist wildcard `/api/funding`, bỏ signed identity trong khi cashout yêu cầu Gateway. Không sửa BE trong Phase 2 này. Cần chốt string amount + idempotency nạp, thu hẹp whitelist callback và test end-to-end trước khi báo live PASS. Owner đối chiếu theo kế hoạch: Đạt/Khoa.

## Kiểm chứng

Evidence tại `docs/evidence/huu-fe-phase2/`. `check.txt`: lint/typecheck/32 Node tests/build. `unit.txt`: 54/54 Vitest, trong đó 19 test Funding; có MSW string contract, retry cùng key sau network failure, confirm timeout/401 chỉ đọc lại, account switch, tiền vượt SafeInteger, terminal/budget polling không đổi server status.

`browser.txt` và `browser/result.json`: 6 nhóm Auth/Profile/KYC production browser smoke dùng synthetic HTTP fixtures. Đây là regression browser Phase 1, không phải nghiệm thu live Funding. Browser localhost không còn bị chặn.

Không thêm dependency; không commit/push/merge trong lượt này.


## Cập nhật Phase 3

Topup page/modal đã dùng chung form; thêm exact redirect config, return correlation qua lịch sử, receipt và wallet từ server. Phase 2 mô tả trạng thái tại thời điểm bàn giao; phạm vi mới và chặn live chi tiết tại `topup.md`.


## Cập nhật Phase 4

Màn rút/PIN/status đã nối vào shared Funding. Confirm lỗi tự GET reconcile; explicit token expiry + REQUESTED cho thao tác PIN mới; các kết quả chưa rõ vẫn không replay. Recovery UUID qua URL chỉ đọc; create timeout mất ID vẫn cần giữ mounted flow để retry cùng key. Các mô tả Phase 2 là lịch sử; phạm vi mới, test và giới hạn tại `cashout.md`.


## Cập nhật sửa blocker Funding — 13/11/2026

Các trạng thái BLOCKED amount/Gateway trong các mục Phase 2–4 ở trên là lịch sử. Source hiện đã sửa Gateway để chỉ GET IPN/return chính xác được public; create/status/confirm Funding nhận signed identity từ Bearer. Backend nhận amount chuỗi nguyên VND (vẫn tương thích số nguyên legacy có giới hạn), lưu idempotency key UUID theo user và URL trong một lần ghi; retry cùng key/amount trả đúng lệnh/URL cũ, khác amount trả 422. Adapter FE đã bỏ chặn create live.

**Triển khai phải chạy migration payment `20261113090000_topup_idempotency` trước khi bật phiên bản mới.** Migration thêm cột nullable/index unique theo user, giữ dữ liệu cũ. Chỉ chạy thử migration trên acceptance DB cô lập trong phiên này. Caller FE luôn gửi key; caller legacy không gửi key vẫn chưa có bảo đảm replay. URL redirect FE vẫn cần `VITE_VNPAY_PAYMENT_URL` khớp chính xác endpoint triển khai; không nới allowlist để demo.

Evidence mới nhất: [bản sửa và kiểm chứng](../evidence/huu-fe-week4/fixes/README.md). Đây là giao dịch với terminal/IPN synthetic và payout mô phỏng qua Gateway/Postgres thật, không phải VNPAY sandbox thật. K18 đầy đủ và recovery create timeout mất UUID vẫn cần nghiệm thu/chốt lookup contract; không tự tạo ý định mới sau reload.


## Bàn giao Phase 8 — 13/11/2026

[Bản tổng hợp hiện trạng/test/blocker](huu-fe-phase8.md) · [Runbook demo và fixture manifest](huu-fe-demo-runbook.md) · [PR FE nháp](huu-fe-pr-draft.md). Kết quả Phase 1–6 ở trên là lịch sử. Các lỗi Gateway/topup contract đã sửa local và có [evidence mới](../evidence/huu-fe-week4/fixes/README.md); không dùng handover lịch sử để kết luận Funding vẫn BLOCKED hoặc mọi P0 đã hoàn thành. Phase 8 chuẩn bị tài liệu/review local, chưa seed demo, quay video, tạo PR hoặc merge.


## Closeout tự thực hiện — 13/11/2026

[Evidence closeout](../evidence/huu-fe-closeout/README.md): đã chạy lại 9 suite cùng nguồn product, seed 6 tài khoản demo private, rehearsal/video live; 11 P2P + 5 Wallet acceptance cuối đều PASS sau sửa harness. Không sửa nghiệp vụ P2P. Active Transfer UI/K18 mapping, VNPAY sandbox thật và review/rollout/merge vẫn chờ phối hợp.
