# Bàn giao Profile/KYC — H18, phối hợp N17/N19

Cập nhật 23/11/2026. Hữu sở hữu Profile/KYC, Nguyên Admin/Notification, Đạt bàn giao Auth/PIN và harness. Nội dung hiện tại dựa source; evidence ngày 12–13/11 là lịch sử theo revision trong [Phase 1](../evidence/huu-fe-phase1/final/README.md) và [closeout](../evidence/huu-fe-closeout/README.md).

## Trang, component và API

`/app/profile` → `ProfilePage` → `UserProfilePanel` từ [features/user/index.ts](../../src/features/user/index.ts). Triển khai thật nằm trong `features/user`; `features/kyc/index.ts` hiện export rỗng, không được ghi rằng đã có feature KYC độc lập.

- `UserProfilePanel`, `ProfileForm`, `KycForm`, badge trạng thái/tier và `KycDocumentViewer` dùng source `features/user/components`.
- [userService.ts](../../src/features/user/services/userService.ts): GET/PUT `/api/users/by-auth/{authUserId}`, GET `/api/users/me/kyc`, POST `/api/users/kyc/documents`, GET `/api/users/by-auth/{authUserId}/kyc/document`.
- [user.queries.ts](../../src/features/user/api/user.queries.ts) có `userKeys.account/profile/kyc`, query theo owner, cache replacement/invalidation sau mutation. `useUserProfile` bọc `useProfileQuery`.
- `services/` ở feature này vẫn còn; không ghi đã chuyển hết sang adapter `api/*.api.ts`. Đây là phần chuẩn hóa kiến trúc còn phải rà riêng.

## Trạng thái, bảo mật và contract

Loading/error/retry do QueryBoundary, profile/form và trạng thái NONE/PENDING/APPROVED/REJECTED từ server. Email read-only; PUT chỉ field được cho phép. Rejection reason đọc từ `/me/kyc`, không bịa từ response profile đã lược bỏ reason.

Upload multipart `idNumber`, `front`, `back`; mỗi ảnh JPEG/PNG tối đa 5 MiB. Chặn gửi trùng, không tự báo thành công bằng timer. Preview/object URL được thu hồi; URL có chữ ký và file không lưu persistent storage. Đổi owner phải bỏ form/ảnh/cache liên quan.

User backend đã hỗ trợ cả filter `status` và `kycStatus`, normalize về kycStatus; khi có cả hai, `status` được ưu tiên. Không tiếp tục giao sửa “Admin gửi status nên lọc bị bỏ qua”.

## Cách kiểm tra và bàn giao

1. User mới mở Profile phải thấy trạng thái/cấp thật; F5 vẫn đúng.
2. Upload hai ảnh tổng hợp hợp lệ: một lần submit, một request; F5 thấy PENDING. Sai loại/quá 5 MiB/thiếu mặt bị chặn.
3. Admin từ chối có lý do: user thấy REJECTED/reason; duyệt hồ sơ khác thấy APPROVED/tier 1 và thông báo.
4. Đổi tài khoản khi tải ảnh/form: không lộ dữ liệu user trước. Kiểm ảnh hết TTL và lỗi tải.
5. Chạy `npm run test:profile:live` chỉ sau khi kiểm cấu hình fixture/stack riêng; đọc [runbook](huu-fe-demo-runbook.md). UI live sau merge vẫn cần evidence Đ22/H18 riêng.

KYC review event đã nối schema/outbox/publisher/Notification và được kiểm tra Backend thật ở phiên 22/11; cần migration User `202611220001_user_outbox_event_type_uniqueness` và rebuild/rollout tương ứng. Không tự coi máy thành viên đã cập nhật image. K03 về tier khi PENDING bị từ chối vẫn cần thống nhất nghiệp vụ; thay đổi event không tự đóng K03. Xem [contract](../CONTRACT_OPEN_QUESTIONS.md).
