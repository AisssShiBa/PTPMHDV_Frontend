# Closeout Hữu — hướng dẫn tiếp nhận

Đã tự hoàn tất regression hiện hữu, dữ liệu demo, rehearsal/video và mở rộng kiểm Wallet/P2P qua Gateway/DB. [Báo cáo/evidence đầy đủ](../evidence/huu-fe-closeout/README.md), [video](../evidence/huu-fe-closeout/rehearsal/live-demo-rehearsal.mp4), [review owner](huu-fe-closeout-review.md).

## Dùng demo

Stack đã down giữ volumes. Khởi động lại đúng project theo [runbook Phase 8](huu-fe-demo-runbook.md); không chạy fresh seed vào DB hiện hữu. Sáu tài khoản tương tác nằm trong file private backend `.cache/acceptance-week2/finvault-acceptance-dadc7eef7537/huu-closeout-demo-accounts.json` (0600/Git ignored). Mở local để chọn `tier0`, `tier1`, `tier2`, `merchantPending`, `merchantApproved`, `admin`; không đưa nội dung file lên chat/PR/video.

Status/ID dùng cho URL reload nằm ở [manifest public](../evidence/huu-fe-closeout/demo/demo-manifest.json). Login trên origin localhost; `/app/profile`, `/app/topup/result?topupId=<UUID>`, `/app/withdraw?cashOutId=<UUID>`, `/merchant`. Balance thay đổi đúng theo các lần rehearsal topup, không hardcode lại balance trong manifest hay UI. Receipt là IPN synthetic/payout mô phỏng; sandbox thật chưa chạy.

## Lệnh mới tại frontend

Sau khi stack healthy và có private run.json:

```bash
export DOCKER_HOST=unix:///tmp/huu-fe-podman.sock
export LIVE_ACCEPTANCE_RUN_FILE="$PWD/../PTPMHDV_Backend/.cache/acceptance-week2/finvault-acceptance-dadc7eef7537/run.json"
export BROWSER_PATH=/home/nguyenhuu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome

npm run test:huu:demo:seed
VITE_API_BASE_URL=/api VITE_USE_MOCK=false VITE_VNPAY_PAYMENT_URL= npm run build
npm run test:huu:demo:rehearse
npm run test:huu:p2p:live
npm run test:huu:wallet:live
```

Seed tạo principal synthetic mới và cập nhật file private; không cần seed lại để đăng nhập demo đã có. Các nhóm tạo nhiều account có thể chạm Auth 30 signin/15 phút: chờ cửa sổ hoặc bắt đầu nhóm kiểm thử riêng trên stack test được khởi động lại; không nới config limit. Không chạy các suite song song, đặc biệt P2P có fault injection Wallet/RabbitMQ. Các lệnh lưu public evidence không credential. Có thể chọn riêng scenario bằng `node tests/huu-closeout-live.mjs p2p ambiguousCapture` và `CLOSEOUT_EVIDENCE_LABEL=<nhãn-mới>` để giữ lịch sử.

## Còn phối hợp

VNPAY sandbox config/giao dịch thật, integration `/app/transfer` và mapping K18 của Khoa, contract lookup cashout sau mất UUID và review/rollout/PR/merge của team vẫn mở. Code nghiệp vụ không đổi trong lượt closeout; thêm harness FE và sửa acceptance assumptions/parsing BE. [PR FE draft](huu-fe-pr-draft.md), [PR BE draft](huu-be-funding-pr-draft.md) cần staged-diff review cuối, không stage toàn bộ dirty worktree.
