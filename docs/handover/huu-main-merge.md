# Bàn giao merge main vào Huu — 13/11/2026

FE: Huu trước merge `1a98b6359ffab69bb3328b63b74101ef078f9666` (Tuan 4); main đã fetch `6692cc30e37a482b3afa57e4460c61392e91cb82`. BE: Huu `1792e65f76cf175700900e21ccabea4c055c6aaf` → fast-forward main `95366ab5cc7b8a497bd3d6fe41bb63ea4ba231e9`, sau đó restore phần local chưa commit. Các SHA mô tả snapshot được merge, không phải claim remote không thể thay đổi sau đó.

Backup cả hai repo: `backup/huu-before-main-20261113-091236`. Stash backend `c7d647dde18c7dc72c335814a2cf1933666d021f` giữ nguyên; backend local work vẫn chưa commit như trước. Không push hay thay đổi local main branch.

## Quyết định resolve

- Giữ Wallet Me/ledger, P2P K18/K19, Notification query/API UI, Admin và Utilities mới từ main. Không phục hồi legacy wallet credit/debit/transfer hoặc adapter Admin/Notification đã được thay thế.
- Funding tiếp tục dùng form/hooks/return/cashout của Hữu. `useWalletBalance` dùng GET `/wallets/me` qua Wallet API hiện hành; cache ví và notification có account key, abort/reset và gcTime phù hợp; Funding invalidate cùng root key K18 để UI ví/ledger cập nhật đúng.
- Money giữ đầy đủ API BigInt/display của K18 và strict input của Funding. normalizeVnd/formatVndExact vẫn nguyên; không đổi amount sang Number hoặc tự cộng balance.
- PIN giữ bắt buộc paymentId+amount, token chỉ memory, chống double submit/late response của Hữu; giữ thông báo số lần thử còn lại theo code/details server của main. AuthStore giữ session API thật/generation guard, không tạo mock token mặc định.
- Notification UI theo main, socket payload validation/ticket theo API mới; giữ guard owner/token/unmount để không trộn account và không log ticket raw.
- Giữ thin TopupModal và `UtilitiesPage → UtilitiesWorkspace` theo nghiệp vụ thật; không lấy lại QR/topup mock hoặc timer thành công từ phiên bản cũ.
- Spec lấy Wallet/P2P/Notification/Utilities mới, giữ topup string/idempotency/response của Hữu; phục hồi callback path definitions để aliases không bị dangling ref.
- BE giữ claim M17 từ main, exact GET VNPAY callbacks của local, Redis startup fix đã có ở main, migration guard scope enum theo schema của local. Phần Topup idempotency/string và test/migration local được giữ.

## Sửa lỗi integration phát hiện khi kiểm

Các test page Wallet/Utilities hiện cần session owner; test BalanceCard được bọc QueryClientProvider và đổi file sang TSX. Notification regression chuyển sang query/cache/center UI hiện hành. Không bỏ assertion tiền, PIN hoặc idempotency. Node TS loader hỗ trợ barrel index để query module import đúng quy ước feature. Sửa type any và reset quote countdown tại event nhận quote, helper clock cho callback polling; giữ flow P2P từ main.

## Verification và giới hạn

[Evidence mới](../evidence/huu-main-merge/README.md): check PASS, Vitest 207/207, browser fixtures Profile/KYC 6 / Topup 7 / Cashout 6 / Merchant 6 nhóm; OpenAPI VALID; BE Funding auth regression và 34 Topup/Cashout unit + build PASS. Lint/spec còn warnings đã ghi log, không che thành zero warnings.

Code mới đã có active Transfer UI/API và các suite K18/K19; nhận xét “TransferPage còn demo / chưa có suite K18” trong handover closeout cũ là lịch sử trước merge, không còn dùng để mô tả source sau merge. Tuy vậy các unit/MSW/browser fixture PASS chưa thay live Gateway P2P E2E trên snapshot mới. Sandbox thật, owner review và rollout vẫn chưa được nghiệm thu từ lượt merge này.

Frontend merge commit được tạo để người dùng push Huu bình thường. Backend đã lấy main và resolve stash conflicts nhưng giữ local changes chưa commit; cần review/commit các thay đổi đó riêng nếu muốn publish. Không force push, không reset hoặc drop stash.
