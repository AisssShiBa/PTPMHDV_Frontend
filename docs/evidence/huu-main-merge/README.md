# Merge origin/main → Huu — 13/11/2026

Đã resolve 19 conflict frontend và 3 conflict khi áp lại stash backend. [Báo cáo quyết định merge](../../handover/huu-main-merge.md), [snapshot/backup refs](environment.json).

| Kiểm tra | Kết quả | Evidence |
|---|---|---|
| FE `npm run check` | PASS lint/typecheck/Node tests/build; lint có 5 warnings | [check.txt](check.txt) |
| FE Vitest | 207/207 PASS, 28 files, gồm K18/K19 và Funding/KYC/Merchant | [unit.txt](unit.txt) |
| OpenAPI lint | VALID; 193 warnings | [contract.txt](contract.txt) |
| Profile/KYC browser | 6 nhóm PASS | [log](profile-browser.txt), [result](profile/result.json) |
| Topup browser | 7 nhóm PASS | [log](topup-browser.txt), [result](topup/result.json) |
| Cashout browser | 6 nhóm PASS | [log](cashout-browser.txt), [result](cashout/result.json) |
| Merchant browser | 6 nhóm PASS | [log](merchant-browser.txt), [result](merchant/result.json) |
| BE Gateway Funding auth | 1 nhóm PASS exact public callback/auth matrix | [backend-gateway.txt](backend-gateway.txt) |
| BE Payment | Prisma generate/build PASS; Topup/Cashout 34/34 unit PASS | [backend-payment.txt](backend-payment.txt) |

Browser dùng synthetic HTTP fixtures, không phải live Gateway/DB. Backend unit chạy network-none, mount source/schema hiện tại vào image acceptance có dependencies cached; không claim clean install hoặc live rollout. Không khởi động acceptance stack/DB hay chạy migration trong lượt merge. Evidence live ở closeout trước merge là lịch sử, không được coi là live regression của source mới.

`validation.json` ghi kiểm marker, source hash, merge parents dự kiến (ancestry sau commit được kiểm riêng bằng Git) và whitespace. `.env` bỏ tracking theo main; cấu hình local cũ được giữ trong `.env.local` mode 0600/Git ignored, không đưa vào artifact/commit. Backend 11 file untracked trước merge được đối chiếu byte-for-byte sau restore stash, không mất file. Stash và backup refs giữ để khôi phục, không drop/reset/force-push.
