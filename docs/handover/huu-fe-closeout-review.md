# Review local cho closeout trục Hữu — 13/11/2026

Tài liệu này phục vụ owner review, không thay kết quả review chéo hay xác nhận merge.

## Phần tự hoàn tất trong phiên closeout

Chạy các harness hiện hữu tuần tự trên cùng nguồn product; thêm `huu-closeout-live.mjs` để seed demo private và gọi các ca Wallet/P2P week2 hiện hữu; thêm `huu-demo-rehearsal.mjs` để diễn tập và ghi hình sau login. Không sửa source nghiệp vụ P2P của Khoa, Auth/Admin/notification hoặc nới rate-limit để làm test qua.

Credential demo được tạo ngẫu nhiên và lưu file mode 0600 trong `.cache/acceptance-week2/<project>/huu-closeout-demo-accounts.json` của backend (Git ignored). Evidence chỉ ghi ID/email tổng hợp, status và nguồn kiểm thử; không chứa password/PIN/token/raw API key. Video CDP cắt các đoạn login, không quay PIN hoặc modal raw key. Giao dịch VNPAY vẫn là IPN synthetic và payout mô phỏng.

## Phát hiện cần Khoa tích hợp/review

`src/pages/TransferPage.tsx` đang active ở `/app/transfer`, nhưng:

- Dòng 78 dùng fallback balance mẫu và Number; phần validate cũng dùng số dư/hạn mức mẫu.
- `handlePinSuccess` (khoảng dòng 170) tự tạo transactionId và đặt biên lai thành công bằng timer, chưa confirm payment thật.
- PinModal cuối trang nhận amount nhưng không có paymentId. PIN chung đã chặn khi thiếu binding; không kết luận callback timer hiện có thể rút/chuyển tiền trái phép.

Cần Khoa thay active flow thành recipient lookup thật → checkout qua API → PIN binding paymentId/amount → confirm/status/recovery, bỏ balance/limit/receipt giả và kiểm K18 UI. H11 API lookup và các ca Wallet/P2P backend chỉ chứng minh từng tầng, không chứng minh trang `/app/transfer` đã tích hợp.

Không tìm thấy một suite có tên K18 trong inventory local. Vì vậy report closeout dẫn tên ca week2 cụ thể, không đổi tên chúng thành “full K18 PASS”. Owner cần đối chiếu mapping K18 cuối.

## Phạm vi staged diff đề xuất cho người thực hiện Git

Worktree chứa nhiều phase chưa commit; không dùng `git add .`. Chia theo dependency, review diff từng repo và xác nhận base remote trước public:

1. BE Funding: exact callback whitelist, string/idempotent topup, schema/migration và regression tests; xem PR BE draft.
2. FE Profile/KYC và foundation dependency đã được review (Auth/PIN/query/router/common). Đối chiếu các sửa lịch sử foundation với owner; không tự nhận thay đổi của họ.
3. FE Funding + Wallet adapter + spec + tests; yêu cầu BE migration trước rollout.
4. FE Merchant registration/tools/QR/key và CSS print; dependency qrcode.react thuộc ngoại lệ.
5. Acceptance/handover/evidence được chọn sau secret review. Chỉ stage artifacts public có nhãn nguồn; không stage `.cache`, `.env.local`, credentials, browser profiles, raw frames hoặc `node_modules/.tmp`.

`apps/mobile/App.tsx`, Admin/notification/common đã có sửa từ trước, cần owner xác nhận grouping. Không stage/commit/đổi branch ở phiên closeout này vì kế hoạch hiện hành yêu cầu không tự commit/merge; các bản nháp PR local đã có để review.

## Rollout và giới hạn

Migration `20261113090000_topup_idempotency` mới chỉ áp dụng DB acceptance. Môi trường đích cần owner review và deploy migration trước bật FE create mới. Sandbox thật cần terminal/return URL reachable/exact redirect endpoint; không bịa credential. Cashout create timeout rồi reload mất UUID vẫn cần API lookup/list theo stable key; modal key mất response vẫn thiếu inventory API.

Kết quả chạy thực và demo mới tại [evidence closeout](../evidence/huu-fe-closeout/README.md). Mọi FAIL ghi đúng scenario/error và owner, không đổi thành PASS vì nằm ngoài scope.
