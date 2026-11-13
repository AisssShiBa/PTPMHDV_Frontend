# Phase 8 — hồ sơ bàn giao local / 13-11-2026

**Đã chuẩn bị tài liệu và PR drafts. Chưa đạt DoD cuối:** còn full same-revision Must/K18/VNPAY sandbox, demo accounts/rehearsal/video và review/PR/merge. Không gửi thông tin cho người khác hoặc publish trong Phase 8.

## Đầu ra

- [README dự án](../../../README.md): setup FE, cấu hình và điểm vào handover.
- [Bàn giao tổng hợp](../../handover/huu-fe-phase8.md): chức năng/contract/timeout, test đã chạy, migration dependency và owner.
- [Demo runbook](../../handover/huu-fe-demo-runbook.md): startup/health/suites/cleanup trên stack cô lập hiện hữu, manifest dữ liệu cần seed, ảnh/PDF dự phòng có nhãn fixture/live.
- [PR FE draft](../../handover/huu-fe-pr-draft.md), [PR BE draft](../../handover/huu-be-funding-pr-draft.md): scope/path/validation/blocker; chưa phải PR remote.
- Handover [KYC](../../handover/kyc.md), [Funding](../../handover/funding.md), [Merchant](../../handover/merchant.md), [tools](../../handover/merchant-tools.md) và [contract questions](../../CONTRACT_OPEN_QUESTIONS.md) dẫn tới hiện trạng mới, giữ lịch sử.
- `TEMPLATE.md` không sửa; source/test/dependency không sửa trong Phase 8.

## Verification

[validation.json](validation.json) kiểm relative links của tài liệu mới và hash nguồn theo manifest bản sửa Phase 7, kèm pattern check credential có giới hạn. [Frontend diff check](frontend-diff-check.txt), [backend diff check](backend-diff-check.txt) ghi kết quả whitespace; status-paths chỉ liệt kê tên file của toàn worktree, không phải toàn bộ đều thuộc Phase 8.

Không rerun product tests cho thay đổi chỉ tài liệu. Kết quả source đã kiểm chứng được giữ ở [Phase 7 fixes](../huu-fe-week4/fixes/README.md): check PASS, Vitest 107/107, backend 34/34, Gateway regression, browser Topup, KYC browser/lookup API và Funding HTTP live. Hash nguồn khớp chỉ chứng minh các file được liệt kê không đổi, không chứng minh toàn repo đã được nghiệm thu cùng revision.

Không log/commit password, PIN, tokens, raw API keys hoặc KYC signed URL vào các tài liệu mới. Pattern scan có giới hạn, không gọi đây là secret audit toàn repository; trước public PR vẫn cần review artifact/staged diff đầy đủ.

## Task trạng thái

| Task | Trạng thái |
|---|---|
| 8.1 handover/contract docs | PREPARED local |
| Fixture manifest demo | PREPARED; tài khoản tương tác/tier/status chưa seed |
| Screenshot/PDF dự phòng | LINKED có nhãn nguồn; không quay video mới |
| Video/rehearsal | NOT_RUN |
| 8.2 Git/review | Diff/path review local; chưa stage/commit/fetch/push |
| 8.3 PR description | PREPARED hai draft; chưa mở PR remote |
| Review chéo / deploy migration / merge | MANUAL_PENDING |
| Final DoD | CHƯA ĐẠT; không gọi mọi P0 đã hoàn thành |

Stack acceptance vẫn down giữ volumes từ phiên trước. Phase 8 không dựng lại stack, seed dữ liệu, gọi API hoặc thay đổi tài khoản/DB.
