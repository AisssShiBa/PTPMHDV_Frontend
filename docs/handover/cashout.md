# Phase 4 — Cash-out + PIN + recovery (2026-11-12)

## Kết quả

**Phần FE đã triển khai và kiểm tra bằng MSW/HTTP fixture; chưa nghiệm thu toàn bộ Phase 4 live.** Gateway vẫn whitelist wildcard `/api/funding` trong `gateway/src/middlewares/authenticate.ts`, nên signed identity không được tạo cho cash-out trong khi payment-service yêu cầu `requireGateway`. Không sửa nguồn BE hoặc giả báo route đã thông.

`WithdrawPage` là trang mỏng, Funding sở hữu form/workspace/status. Màn luôn ghi “Rút tiền (mô phỏng)”. Bỏ INITIAL_BANKS, ngân hàng liên kết giả, hạn mức/usage giả, phí/ETA không có contract, số tham chiếu tự sinh và phép trừ balance cục bộ. Giữ bố cục thẻ và hai cột từ thiết kế; điểm nhận là mã thử nghiệm tùy chọn đúng body `destination?`, không dựng Bank API/DTO mới.

## Contract và luồng

1. POST `/api/funding/cash-out`: amount chuỗi nguyên dương tối đa 18 chữ số; destination tùy chọn tối đa 255 ký tự. UUID Idempotency-Key giữ theo intent. Khóa double submit; create timeout giữ payload/key và có nút thử lại cùng yêu cầu. HTTP 422 khác payload được map lỗi an toàn. Tạo lệnh không đồng nghĩa đã rút tiền.
2. Server trả id/REQUESTED: hiển thị kiểm tra lại lệnh, đồng bộ URL `?cashOutId=UUID` bằng router replace, rồi mới mở PIN. Không lưu secret hoặc thông tin ngân hàng vào storage. Chỉ UUID không bí mật nằm trên URL.
3. PinModal dùng API hiện hữu POST `/api/auth/pin/verify` với pin + paymentId=id thật + amount từ response server; response expiresIn=60 đã được chuẩn hóa ở Phase 1. Token chỉ đi qua callback đến confirm, không vào React state, storage hoặc Query/mutation cache.
4. POST `/api/funding/cash-out/:id/confirm`: body `{}`, X-Transaction-Token; Axios không tự replay/refresh request này. Latch không cho confirm trùng. Mỗi lỗi confirm đều GET status ngay, không phát lại token. Trường hợp TRANSACTION_TOKEN_EXPIRED được xác định tại middleware trước claim: chỉ khi GET vẫn REQUESTED mới bật thao tác nhập PIN mới cùng ID. Không tự xác nhận lần hai. Mismatch/reused hoặc lỗi không chắc chắn giữ chế độ đối soát kể cả GET vẫn REQUESTED.
5. GET status có account key, kiểm owner kể cả response 200 trả nhầm userId, AbortSignal và gcTime 0. Polling backoff tối đa 30s, budget 24 lần đọc/lỗi; dừng terminal hoặc lỗi không phù hợp retry (như 403). Timeout/network/503 xử lý như chưa rõ kết quả, không FAILED/hoàn tiền.
6. REQUESTED = lệnh chờ xác nhận; HOLDING = đang giữ tiền; PAYOUT_PENDING = ngân hàng đối soát, chưa rõ kết quả; SUCCEEDED/FAILED chỉ lấy từ server. Receipt/in chỉ hiện khi SUCCEEDED; failureReason tra code, không show message backend thô. Mỗi dữ liệu status mới invalidate prefix ví theo account; balance/held/available vẫn do API quyết định, không chỉnh AuthStore.

## Recovery và giới hạn cần bàn giao

- Reload với UUID: Auth guard khôi phục session rồi GET cùng ID. Không POST create/confirm tự động; user khác bị chặn và không thấy receipt cũ.
- Lệnh khôi phục REQUESTED ở chế độ chỉ đọc: FE không biết lần confirm trước có bị ngắt hay không. Cho phép xác nhận lại sau timeout/reload cần owner chốt semantics/contract. Không dùng việc mở tab mới để bỏ chặn replay.
- **Create timeout chưa có UUID:** retry cùng key/payload chỉ hỗ trợ trong mounted flow. UI yêu cầu giữ màn hình đến khi lấy được mã. Reload lúc này mất intent RAM; chưa có endpoint lookup-by-idempotency/list cashout để phục hồi. Không tự lưu destination/PIN/token hoặc tạo key thay thế. Đây là giới hạn recovery còn mở, không đánh dấu full recovery qua reload PASS.
- Chưa có endpoint cancel. “Đóng xác thực” chỉ đóng modal; nội dung trang nói rõ đóng UI không hủy lệnh. Mở form khác sau terminal dùng navigation mới để có intent mới; không tái sử dụng key lệnh cũ.
- Destination contract chưa chốt thành ngân hàng thật; chỉ dùng mã mô phỏng. Không hiện thông tin tài khoản nhận thật trong fixture/log/receipt.
- Gateway auth và chạy C01/C02/C03/C04/C06/C07/C13 trên stack thật/ledger vẫn BLOCKED/NOT_RUN. Các unit dưới đây không thay thế nghiệm thu đó.

## Thay đổi dùng chung

Auth index xuất PinModal để Funding không import sâu. PinModal hiển thị số tiền BigInt chính xác, đồng bộ đồng hồ khi nhận lock deadline từ API và đổi nhãn đóng để tránh hiểu nhầm hủy lệnh. Không thay contract verify/token. API response map bổ sung mã lỗi PIN/token/cashout. Topup browser runner hỗ trợ BROWSER_EVIDENCE_DIR để regression không ghi đè evidence Phase 3.

## Kiểm chứng

Evidence `docs/evidence/huu-fe-phase4/`:

- `check.txt`: npm run check, lint/typecheck/32 Node tests/build PASS.
- `unit.txt`: 83/83 Vitest, gồm 15 test UI cashout mới và các test Funding trước. Đã kiểm create/validation/duplicate, retry key sau network, PIN binding/invalid/locked/expiry/mismatch/reused, pending/failed, đóng modal không cancel, readonly reload và đổi account/foreign data. Test Funding trước được cập nhật số GET do confirm lỗi giờ tự đọc trạng thái ngay.
- `backend-unit.txt`: 20/20 test state machine source BE hiện tại trong container, bind source/tests read-only, network none, fake database/wallet/provider. C01/C02/C03/C04/C05/C06/C07/C09/C10/C11/C13 cùng các case khác ở mức unit; không phải ledger DB live.
- `browser.txt`, `browser/result.json`, 5 PNG: 6 nhóm production browser với HTTP fixture; một create khi double click, PIN/confirm/receipt, retry same key và pending qua reload, FAILED, account 403, mobile 390px và không token trong storage. Số dư fixture do server fixture đổi, không phải chứng minh ngân hàng/ledger thật.
- `topup-regression.txt`, `topup-regression/`: 7 nhóm topup production HTTP-fixture regression.
- `profile-regression.txt`, `profile-regression/`: 6 nhóm Auth/Profile/KYC production HTTP-fixture regression.
- `source-sha256.json`: snapshot source liên quan hiện tại, còn bao gồm work chưa commit từ các phase trước.

Lệnh: `npm run check`; `npm run test:unit`; `npm run test:cashout:browser`; chạy lại các browser suite còn lại với BROWSER_EVIDENCE_DIR riêng.

Không thêm dependency; không commit/push/merge. Không đổi Gateway, payout service hoặc ledger backend trong lượt này.


## Cập nhật sửa blocker Funding — 13/11/2026

Các trạng thái BLOCKED amount/Gateway trong các mục Phase 2–4 ở trên là lịch sử. Source hiện đã sửa Gateway để chỉ GET IPN/return chính xác được public; create/status/confirm Funding nhận signed identity từ Bearer. Backend nhận amount chuỗi nguyên VND (vẫn tương thích số nguyên legacy có giới hạn), lưu idempotency key UUID theo user và URL trong một lần ghi; retry cùng key/amount trả đúng lệnh/URL cũ, khác amount trả 422. Adapter FE đã bỏ chặn create live.

**Triển khai phải chạy migration payment `20261113090000_topup_idempotency` trước khi bật phiên bản mới.** Migration thêm cột nullable/index unique theo user, giữ dữ liệu cũ. Chỉ chạy thử migration trên acceptance DB cô lập trong phiên này. Caller FE luôn gửi key; caller legacy không gửi key vẫn chưa có bảo đảm replay. URL redirect FE vẫn cần `VITE_VNPAY_PAYMENT_URL` khớp chính xác endpoint triển khai; không nới allowlist để demo.

Evidence mới nhất: [bản sửa và kiểm chứng](../evidence/huu-fe-week4/fixes/README.md). Đây là giao dịch với terminal/IPN synthetic và payout mô phỏng qua Gateway/Postgres thật, không phải VNPAY sandbox thật. K18 đầy đủ và recovery create timeout mất UUID vẫn cần nghiệm thu/chốt lookup contract; không tự tạo ý định mới sau reload.
