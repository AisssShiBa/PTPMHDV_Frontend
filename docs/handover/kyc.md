# Bàn giao Profile/KYC — FE-H01

**Đã nghiệm thu Phase 1 trên nguồn hiện tại, 12/11/2026.** [Báo cáo cuối](../evidence/huu-fe-phase1/final/README.md): check PASS, Node 32/32, Vitest 35/35 (12 Profile/KYC), browser HTTP fixtures PASS và 5 nhóm live Gateway/Auth/User/Admin/MinIO PASS. FE/BE chưa commit; SHA256 nguồn nằm trong evidence.

## Chức năng

- `/app/profile` là page mỏng ghép UserProfilePanel, tái dùng ProfileForm/KycForm/schema. GET/PUT profile theo Auth ID, email read-only và chỉ gửi field thay đổi.
- GET `/api/users/me/kyc` cung cấp NONE/PENDING/APPROVED/REJECTED, tier và rejection reason. JPEG/PNG mỗi ảnh ≤5 MiB, POST multipart idNumber/front/back; chống trùng, kết quả timeout phải reconcile trước khi retry.
- Query theo account, abort stale request, gcTime 0, callback kiểm owner. Đổi account bỏ form/file/ảnh cũ. Preview revoke object URL; viewer URL mặt trước chỉ memory, tự đóng khi TTL/error/unmount.
- Auth signin/refresh/signout đã dùng API, refresh cookie và logout/account switch được kiểm chứng live; không giữ mock token để giả đăng nhập thành công.
- Giữ header/card/grid và tokens màn 7; bỏ PIN/password fake success, quota/bank/số dư mẫu khỏi Profile. Các phần Auth/PIN/query/router/notification chung đã sửa theo yêu cầu sửa toàn bộ lỗi gate.

## Nghiệm thu

HU-F01–HU-F04/HU-F15 PASS qua cả lớp component, browser và backend thật. Hai mặt MinIO thật có đọc quyền và TTL; Admin duyệt/từ chối qua API, không claim Admin page đã được tích hợp. Mobile 390px, desktop 1280px và keyboard browser có evidence.

Browser smoke mới đúng route hiện tại; suite cũ giữ nguyên trong tests/browser-smoke-legacy.mjs, các case merchant/Admin UI/P2P lịch sử chưa tính PASS. Nạp VNPAY, cash-out, merchant và các phase tiếp theo vẫn theo contract/plan, chưa được coi đã hoàn thành từ kết quả Phase 1.

[Contract matrix](huu-fe-contract-matrix.md), [log/screenshot/live run](../evidence/huu-fe-phase1/final/README.md). Stack acceptance đã dừng, giữ volume; không reset dữ liệu project khác. Package-lock cập nhật bởi người dùng được bảo toàn; chưa commit/push/merge.


## Bàn giao Phase 8 — 13/11/2026

[Bản tổng hợp hiện trạng/test/blocker](huu-fe-phase8.md) · [Runbook demo và fixture manifest](huu-fe-demo-runbook.md) · [PR FE nháp](huu-fe-pr-draft.md). Kết quả Phase 1–6 ở trên là lịch sử. Các lỗi Gateway/topup contract đã sửa local và có [evidence mới](../evidence/huu-fe-week4/fixes/README.md); không dùng handover lịch sử để kết luận Funding vẫn BLOCKED hoặc mọi P0 đã hoàn thành. Phase 8 chuẩn bị tài liệu/review local, chưa seed demo, quay video, tạo PR hoặc merge.


## Closeout tự thực hiện — 13/11/2026

[Evidence closeout](../evidence/huu-fe-closeout/README.md): đã chạy lại 9 suite cùng nguồn product, seed 6 tài khoản demo private, rehearsal/video live; 11 P2P + 5 Wallet acceptance cuối đều PASS sau sửa harness. Không sửa nghiệp vụ P2P. Active Transfer UI/K18 mapping, VNPAY sandbox thật và review/rollout/merge vẫn chờ phối hợp.
