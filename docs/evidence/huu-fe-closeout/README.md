# Closeout tự thực hiện — 13/11/2026

**Đã làm thêm phần tự chủ:** chạy lại 9 suite hiện hữu, seed demo, diễn tập/quay video live, chạy 11 ca P2P và 5 ca Wallet week2 (kết quả cuối sau sửa harness đều PASS), đối chiếu bảo toàn ledger. **Chưa đóng full DoD:** VNPAY sandbox thật, mapping/K18 active transfer UI và review/rollout/merge còn chờ owner.

[Video live 24 giây](rehearsal/live-demo-rehearsal.mp4) · [Demo manifest không credential](demo/demo-manifest.json) · [Kết quả tổng hợp máy đọc](summary.json) · [Bàn giao sử dụng](../../handover/huu-fe-closeout.md) · [Review local/owner](../../handover/huu-fe-closeout-review.md).

## Nguồn và môi trường

FE HEAD `ec9e7764224c61cb1421008352be5e07688d3e5e`, BE HEAD `1792e65f76cf175700900e21ccabea4c055c6aaf`; worktree chưa commit. Product source không đổi trong closeout; bổ sung test harness/scripts và sửa assumptions/parsing của acceptance week2. [source-sha256.json](source-sha256.json) ghi snapshot cuối, [validation](validation.json) xác minh hash, links, credential patterns có giới hạn và whitespace.

Node v22.23.1, timezone Asia/Ho_Chi_Minh. Project `finvault-acceptance-dadc7eef7537`, Gateway loopback 40825, Podman API `/tmp/huu-fe-podman.sock`. Không dùng DB chia sẻ, không xóa volumes. Cashout payout mô phỏng; IPN synthetic, không liên lạc VNPAY sandbox.

Giữa các nhóm độc lập đã restart riêng Auth test container để reset rate-limit RAM 30 signin/15 phút; giữ DB/config/rate-limit policy. Các suite không nhằm kiểm reset counter. Gateway windows được chờ giữa các lượt; không nới limit. Các ca lỗi kết nối chủ động dừng Wallet/RabbitMQ chỉ trong project này và khởi động lại trong finally. Cleanup cuối ở cleanup.txt.

## Regression cùng nguồn product

| Suite | Kết quả | Evidence |
|---|---|---|
| `npm run test:browser` | PASS | [profile-browser](profile-browser/result.json), [log](profile-browser.txt) |
| `npm run test:topup:browser` | PASS | [topup-browser](topup-browser/result.json), [log](topup-browser.txt) |
| `npm run test:cashout:browser` | PASS | [cashout-browser](cashout-browser/result.json), [log](cashout-browser.txt) |
| `npm run test:merchant:browser` | PASS | [merchant-browser](merchant-browser/result.json), [log](merchant-browser.txt) |
| `npm run test:profile:live` | PASS | [profile-live](profile-live/result.json), [log](profile-live.txt) |
| `npm run test:phase3:live` | PASS | [phase3-live](phase3-live/result.json), [log](phase3-live.txt) |
| `npm run test:merchant:live` | PASS | [merchant-live](merchant-live/result.json), [log](merchant-live.txt) |
| `npm run test:merchant:tools:live` | PASS | [merchant-tools-live](merchant-tools-live/result.json), [log](merchant-tools-live.txt) |
| `npm run test:funding:live` | PASS | [funding-live](funding-live/result.json), [log](funding-live.txt) |

Quality gate `npm run check` PASS ([log](check.txt)); Vitest 107/107, 11 files ([log](unit.txt)). Check không bao gồm unit/browser/live. Node runner báo 3 test files. Browser fixtures vẫn ghi MOCK; live Gateway/Auth/User/Admin/MinIO/Merchant/Postgres được ghi riêng trong result.

## Wallet/P2P acceptance hiện có

Kết quả cuối từng scenario lấy từ lần retest tương ứng; các FAIL ban đầu không bị xóa hay sửa thành PASS. Không có suite tên K18 trong inventory: đây là các ca week2 đã tồn tại, chưa đồng nghĩa active Transfer UI/K18 đã nghiệm thu.

| Case | Kết quả cuối | Evidence |
|---|---|---|
| a4 | PASS | [p2p/result.json](p2p/result.json) |
| s4 | PASS | [p2p/result.json](p2p/result.json) |
| s5 | PASS | [p2p/result.json](p2p/result.json) |
| a9 | PASS | [p2p/result.json](p2p/result.json) |
| s6 | PASS | [p2p/result.json](p2p/result.json) |
| s15 | PASS | [p2p/result.json](p2p/result.json) |
| concurrentConfirm | PASS | [p2p/result.json](p2p/result.json) |
| ambiguousCapture | PASS | [p2p-capture-retest/result.json](p2p-capture-retest/result.json) |
| s8 | PASS | [p2p-retest/result.json](p2p-retest/result.json) |
| s16 | PASS | [p2p-retest/result.json](p2p-retest/result.json) |
| realtime | PASS | [p2p/result.json](p2p/result.json) |
| global-ledger-conservation | PASS | [p2p-capture-retest/result.json](p2p-capture-retest/result.json) |
| walletA9 | PASS | [wallet/result.json](wallet/result.json) |
| walletS6 | PASS | [wallet-retest/result.json](wallet-retest/result.json) |
| s7 | PASS | [wallet/result.json](wallet/result.json) |
| inlineExpiry | PASS | [wallet-expiry-retest/result.json](wallet-expiry-retest/result.json) |
| s10 | PASS | [wallet/result.json](wallet/result.json) |

Các assertion bao gồm token replay/mismatch/expiry, hạn mức và cạnh tranh, idempotency, mất phản hồi capture không double debit, outage recovery, outbox/notification, realtime 9/10 trong 3 giây, hold expiry/release, Inbox dedup sau restart. `global-ledger-conservation` xác minh tổng balance bằng 0 và mỗi transaction có ít nhất hai bút toán cân bằng.

### Sửa harness, giữ nghiệp vụ

- `ambiguousCapture`: chấp nhận 503 PAYMENT_PROCESSING khi mất response, poll tới SUCCESS mà không confirm/token lại; vẫn kiểm chính xác -1000/+1000, một debit/credit. Output child process dùng marker, không parse log RabbitMQ như kết quả.
- `s8`: Wallet outage là indeterminate; worker retry capture theo source hiện hành, nên sau restart phải kiểm SUCCESS/CAPTURED và một cặp ledger, thay giả định FAILED/RELEASED cũ.
- `s16`: lúc broker dừng, outbox có thể PENDING hoặc PROCESSING do worker đã claim; vẫn buộc chưa sent. Sau recovery phải SENT và đúng hai notification, không bỏ assertion giao nhận.
- `walletS6`: destination optional cho generic cashout hold; vẫn kiểm UUID sai bị từ chối, đúng 5/10 holds trong hạn mức và release khôi phục usage.
- `inlineExpiry`: marker JSON tách log; expired hold replay đúng code HOLD_EXPIRED như source. Vẫn kiểm EXPIRED đã commit, usage/held không được hoàn trả hai lần, balance/ledger không đổi.

Source của hai acceptance files backend được sửa trong worktree; không sửa service Wallet/P2P/notification để làm test xanh. Lần đầu seed thiếu sharp: đã dùng PNG tổng hợp bằng Node/zlib. Các lần seed gặp 429 không được tính PASS. Lần rehearsal đầu bấm QR trước list ready: thêm bounded wait rồi quay lại. Server daemon restart làm dừng một lượt retest đang chờ; đã kiểm state và chỉ chạy lại phần chưa có result.

## Demo và video

[Seed PASS](demo/result.json): 6 principal tổng hợp gồm admin, USER tier 0/1/2, Merchant pending/approved; outlet signed QR, topup synthetic approved, cashout success/failed/unknown. Credential chỉ ở `.cache/acceptance-week2/<project>/huu-closeout-demo-accounts.json` backend, mode 0600, Git ignored. Manifest public chỉ có ID/email/status/path. Các lần thử lỗi có thể để lại account synthetic không dùng; không reset DB để dọn chúng.

[Rehearsal PASS](rehearsal/result.json): profile save/reload, FE topup double-click một POST/lệnh → pending trước IPN → approved sau server polling; receipt/balance từ API, ba trạng thái cashout reload đúng owner, Merchant pending gate và QR approved.

Video là các đoạn CDP sau đăng nhập, có cắt để loại màn credential/PIN; overlay ghi rõ LIVE Gateway / synthetic demo / payout SIMULATED. Không quay raw API key hoặc giả cảnh VNPAY sandbox. Duration 24.16 giây, khoảng 1.2 MB. Screenshot live: [profile](rehearsal/profile-live.png), [topup pending](rehearsal/topup-pending-live.png), [topup approved](rehearsal/topup-synthetic-live.png), [cashout UNKNOWN](rehearsal/cashout-tier2-live.png), [QR](rehearsal/merchant-qr-live.png). [PDF QR live](merchant-tools-live/merchant-qr.pdf) từ suite tools.

## Gate còn mở

- Đạt/Khoa: review/rollout migration Funding vào môi trường đích; review source local, contract lookup cashout khi create timeout/reload mất UUID.
- Khoa: active `/app/transfer` còn demo, thiếu paymentId binding, còn timer receipt/fallback money. API/P2P tests không thay kiểm UI; xem review local. Chốt mapping K18 cuối với owner.
- VNPAY sandbox thật NOT_RUN: thiếu terminal/return reachable/exact deployment endpoint; không bịa cấu hình.
- Review chéo/commit/push/PR/merge chưa thực hiện. Không gọi full Phase 7–8 DoD đã đạt; không giao reviewer một báo cáo mock dưới nhãn live.
