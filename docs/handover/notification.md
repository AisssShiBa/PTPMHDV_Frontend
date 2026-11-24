# Bàn giao Feature: Notification

## Cập nhật N19: Utilities producer và consumer

Ba event utility.order_succeeded/failed/refunded đã có schema, producer outbox,
publisher và handler Notification; không còn chỉ là mapping. EventId giữ nguyên
qua retry; inbox + Notification ghi atomically, emit sau commit. Xem
[EVENTS.md](../../../Backend/services/notification-service/EVENTS.md) để triển khai
migration và image. Test live A7 kiểm broker outage + replay; result phân biệt
persisted latency và owner WebSocket, không suy rộng sang mọi nhóm sự kiện.

Suite Notification trên DB test riêng: 98 PASS, 1 SKIP (integration yêu cầu DB
đuôi _test và RabbitMQ riêng). Kiểm broker xuyên service đã chạy bằng acceptance
live trên Compose riêng. Không gọi mục SKIP là PASS.


## Hiện trạng bàn giao 23/11/2026 — N15/N19

Nguyên → Đạt và chủ producer. Source mới và [event catalog Backend](../../../Backend/services/notification-service/EVENTS.md) là căn cứ trạng thái; các mô tả chưa có producer KYC ở phần cũ bên dưới đã hết hiệu lực cho working tree hiện tại.

- `/app/notifications` → NotificationCenter; MainLayout dùng NotificationBell. `notificationKeys` có owner, phân trang/feed; patch read/read-all và socket đều cập nhật/invalidate danh sách. Dedupe theo id và eventId, không tăng badge hai lần.
- GET `/api/notifications/me?page&limit`, GET `/api/notifications/socket-ticket`, PATCH `/api/notifications/{id}/read`, PATCH `/api/notifications/me/read-all`; socket auth `{ticket}` mới mỗi lần connect/reconnect. Không lưu ticket/access token vào storage.
- `user.kyc_reviewed` đã nối User outbox và Notification; `payment.refunded` đã nối publisher/consumer, được kiểm Backend thật ở phiên 22/11. Máy thành viên cần migration/rebuild theo event catalog; không mặc định đã rollout.
- Nạp tiền đã có đường Wallet outbox → wallet.events → notification. Không tự thêm luồng thứ hai chỉ từ việc thiếu tên funding.topup_succeeded; cần kiểm loại sự kiện/độ trễ và tránh duplicate trước.
- Kiểm web: chuyển tiền thật trong stack test, người nhận thấy chuông/danh sách; read/read-all rồi F5; reconnect không thêm dòng/badge; đổi tài khoản không lộ cache cũ. Bốn trạng thái trang qua QueryBoundary.
- Chưa có phép đo đầy đủ mọi nhóm ≤3 giây, A7 tắt/bật broker hoặc N15 UI mới trong lượt tài liệu. Type/unread filter hiện trên các trang đã tải; device route có nhưng chưa có màn Web. [Contract hiện tại](../CONTRACT_OPEN_QUESTIONS.md).

### Chi tiết triển khai và ghi nhận trước cập nhật

---

## 1. Trang và Component đã dựng

- **Routes**:
  - `/app/notifications`: `NotificationsPage` → `NotificationCenter`
- **Components** (`features/notification/components`):
  - `NotificationBell`: chuông ở header `MainLayout` (đã thay nút chuông hardcode badge "3"). Hiển thị `unreadCount` thật, dropdown 8 thông báo mới nhất, "Đọc tất cả", điều hướng tới trang đầy đủ. Nhận `notification:new` qua Socket.IO và ghi vào cache TanStack Query.
  - `NotificationCenter`: nội dung trang đầy đủ — 4 trạng thái qua `QueryBoundary`, lọc theo nhóm (`Tất cả` / `Biến động số dư` / `Xác thực & bảo mật`), lọc "Chỉ chưa đọc", nhóm "Hôm nay"/"Trước đó", nút "Xem thêm thông báo" (phân trang vô hạn).
  - `NotificationList.tsx`: `NotificationListItem`, `NotificationIcon`, map `NotificationType` → tiêu đề/icon tiếng Việt. Loại lạ rơi về "Thông báo" + icon chuông, không crash.
- **Hook** (`features/notification/hooks`):
  - `useNotificationSocket`: kết nối `/socket.io` với `auth: { ticket }`, lấy ticket MỚI mỗi lần kết nối/kết nối lại (ticket dùng một lần); bỏ payload sai shape; không lưu ticket vào storage.
  - `socketConfig.createSocketAuth`: trả `{ ticket }`; lỗi lấy ticket thì gọi `onError` và trả `{}` (không dùng `auth.token` deprecated).

## 2. Hook / API đã thay

| Tên | File định nghĩa | Endpoint | Phương thức | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `notificationApi.getNotifications` | `features/notification/api/notification.api.ts` | `/api/notifications/me?page&limit` | GET | Trả `{ notifications, unreadCount, pagination }` |
| `notificationApi.markRead` | cùng file | `/api/notifications/{id}/read` | PATCH | `id` được `encodeURIComponent` |
| `notificationApi.markAllRead` | cùng file | `/api/notifications/me/read-all` | PATCH | Trả `{ updatedCount }` |
| `notificationApi.getSocketTicket` | cùng file | `/api/notifications/socket-ticket` | GET | Trả `{ ticket, expiresAt }` |
| `useNotificationList` | `features/notification/api/notification.queries.ts` | `/api/notifications/me` | GET | Key `notificationKeys.list(page, limit)` |
| `useNotificationFeed` | cùng file | `/api/notifications/me` | GET | `useInfiniteQuery`, dừng theo `pagination.totalPages` |
| `useMarkNotificationRead` / `useMarkAllNotificationsRead` | cùng file | như trên | PATCH | `invalidateQueries({ queryKey: notificationKeys.lists() })` |

`services/notificationService.ts` cũ đã bị xoá; feature chỉ export qua `features/notification/index.ts`.

### Chống trùng khi nhận lại thông báo

`mergeNotificationIntoPage` / `mergeNotificationIntoFeed` / `applyRealtimeNotification`:
- Khử trùng theo `id`, sau đó theo `eventId` (nếu backend trả về).
- Chỉ tăng `unreadCount` ở cache trang 1 và không tăng cho thông báo đã `read`.
- Nhận lại cùng một thông báo không thêm dòng mới, không tăng badge lần hai.

## 3. Câu hỏi hở Contract / TODO(contract)

- [ ] `type` và `unread` filter: backend `GET /notifications/me` không nhận query lọc theo loại/trạng thái; trang lọc phía client trên các trang đã tải.
- [ ] `eventId`: schema Prisma có cột `eventId`; nếu API không trả trường này thì khử trùng vẫn đúng theo `id`.
- [ ] Thiết bị (`/notifications/devices`): backend có route nhưng chưa có thiết kế màn hình Web → **để ngỏ**, chưa làm.
- [ ] Loại thông báo `PROMOTION`/khuyến mãi không có trong enum backend nên bộ lọc "Khuyến mãi" của bản thiết kế cũ đã bỏ.
- [x] `KYC_APPROVED` / `KYC_REJECTED`: source đã nối `user.kyc_reviewed`; Backend thật đã được kiểm riêng ngày 22/11. Cần migration/rebuild ở môi trường nhận bàn giao, chưa thay nghiệm thu UI hoặc độ trễ N19.

## 4. Thay đổi giao diện sau khi gắn API (nếu có)

- `NotificationsPage` (546 dòng, dữ liệu mẫu) được thay bằng trang mỏng render `NotificationCenter`; bỏ dữ liệu mẫu, `setTimeout`, `Math.random`, nút "Xóa đã đọc" (không có API), nút "Không phải tôi / Xác nhận thiết bị" (AGENTS.md 6.6) và badge khuyến mãi giả.
- `MainLayout`: thay nút chuông hardcode badge "3" bằng `NotificationBell` thật; menu người dùng bỏ chữ "(3 mới)".
- Lý do: các thành phần trên hiển thị dữ liệu không có nguồn từ API. Chưa có xác nhận riêng của Đạt cho phần giao diện này ngoài kế hoạch N15.
